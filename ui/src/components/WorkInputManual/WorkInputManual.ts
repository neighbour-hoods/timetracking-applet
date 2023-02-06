/**
 * "Manual" work effort input form
 *
 * Displays a simplified retroactive work time logger. This component
 * writes `EconomicEvent`s where-
 * - "day of work" is given as a date (not exact datetime)
 * - "amount worked" takes time duration as input
 * The event is thus written to say "X minutes of work occurred within this day".
 *
 * @package Neighbourhoods/We Timesheet applet
 * @since   2023-02-01
*/

import { contextProvided } from "@lit-labs/context"
import { property, state } from "lit/decorators.js"
import { ScopedElementsMixin } from "@open-wc/scoped-elements"
import { LitElement, html, css } from "lit"
import { ApolloMutationController, ApolloQueryController } from '@apollo-elements/core'
import { ApolloClient, NormalizedCacheObject } from "../../provider-graphql-client"

import { hreaGraphQLContext } from "../../contexts"
import { EconomicEventResponse, Agent, IMeasure } from '@valueflows/vf-graphql'

import { EventCreateMutation } from './mutations'
import { WhoAmI } from '@valueflows/vf-graphql-shared-queries'

import { TextField, Button } from '@scoped-elements/material-web'

interface ProfileQueryResult {
  myAgent: Agent
}

export class WorkInputManual extends ScopedElementsMixin(LitElement) {
  // :NOTE: contextProvided has no effect here, is pulled from window.__APOLLO_CLIENT__ and assigned by Apollo controllers.
  //        @see https://github.com/lit/lit/issues/2446#issuecomment-1408143222
  @contextProvided({ context: hreaGraphQLContext, subscribe: true })
  @property({ attribute: false })
  client!: ApolloClient<NormalizedCacheObject>

  createEvent: ApolloMutationController<EconomicEventResponse> = new ApolloMutationController(this, EventCreateMutation)

  me: ApolloQueryController<ProfileQueryResult> = new ApolloQueryController(this, WhoAmI)

  @state()
  note: string = ""

  @state()
  numMinutes: number = 0

  async saveEvent(myAgentId: string, effortQuantity: IMeasure, onDate: Date): Promise<EconomicEventResponse> {
    return ((await this.createEvent.mutate({ variables: {
      event: {
        action: 'raise',  // 'raise' means "raise the accounting value in the ledger by this amount"
        hasBeginning: onDate,
        hasEnd: new Date(onDate.getTime() + 24 * 3600 * 1000),
        note: this.note,
        // resourceClassifiedAs: ['vf:correction'], :TODO: UI for editing events
        effortQuantity,
        provider: myAgentId,
        // receiver: :TODO: active project / client
        receiver: myAgentId,
      },
    } })) as { createEconomicEvent: EconomicEventResponse }).createEconomicEvent
  }

  render() {
    const profile = this.me?.data as ProfileQueryResult

    // initial loading states- retrieving agent identifier
    if (this.me?.error) {
      return html`
        <div>
          <h3>Error!</h3>
          <p>${this.me.error}</p>
        </div>
      `
    }
    if (!profile || this.me?.loading) {
      return html`
        <div>
          <p>Loading...</p>
        </div>
      `
    }

    // successful save state
    if (this.createEvent.data) {
      return html`
        <section className="outer">
          <p>Entry logged.</p>
        </section>
      `
    }

    // primary layout to receive participant input
    const myAgentId = profile?.myAgent?.id

    return html`
      <section className="outer">
// :TODO: duration input
        <mwc-textfield label="Notes" placeholder="(no description)" value=${this.note}></mwc-textfield>

        <mwc-button label="Save" @click="${() => this.saveEvent(
          myAgentId,
          {
            hasUnit: 'minutes',
            hasNumericalValue: this.numMinutes,
          },
          new Date(),
        )}"></mwc-button>
      </section>
    `
  }

  static styles = css`
    .outer {
      max-width: 40em;
    }
  `

  static get scopedElements() {
    return {
      'mwc-textfield': TextField,
      'mwc-button': Button,
    };
  }
}
