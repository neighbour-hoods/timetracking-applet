/**
 * Check for the existence of a valid profile for the currently active agent
 * and conditionally render child slots based on validity.
 *
 * Child nodes may fire an `agentProfileCreated` event in order to trigger
 * a refresh of the agent profile data from the GraphQL client cache.
 * It is presumed that the cache has been updated prior to firing this event.
 */
import { LitElement, html, css } from 'lit';
import { property } from 'lit/decorators.js';
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import { ApolloQueryController } from '@apollo-elements/core'
import { ApolloClient, NormalizedCacheObject } from '@apollo/client/core'

// import {
//   AgentWithTypeResponse, AgentWithType,
// } from '@valueflows/vf-graphql-holochain/queries/agent'
import { WhoAmI, WhoAmIQueryResult } from '@valueflows/vf-graphql-shared-queries'

import { CircularProgress } from '@scoped-elements/material-web'

function isEmptyProfile(me ?: ApolloQueryController<WhoAmIQueryResult>) {
  return (
    me?.error &&
    me.error.name === 'ApolloError' &&
    me.error.graphQLErrors.length === 1 &&
    me.error.graphQLErrors[0].message.match('No Agent data is associated with the currently authenticated user')
  ) || (!me?.loading && !me?.data)
}

export class AgentProfileCheck extends ScopedElementsMixin(LitElement) {
  // :NOTE: contextProvided has no effect here, is pulled from window.__APOLLO_CLIENT__ and assigned by Apollo controllers.
  //        @see https://github.com/lit/lit/issues/2446#issuecomment-1408143222
  // @contextProvided({ context: hreaGraphQLContext, subscribe: true })
  @property({ attribute: false })
  client!: ApolloClient<NormalizedCacheObject>

  me: ApolloQueryController<WhoAmIQueryResult> = new ApolloQueryController(this, WhoAmI)

  render() {
    if (this.me?.loading) {
      return html`<mwc-circular-progress indeterminate></mwc-circular-progress>`
    }

    const noProfile = isEmptyProfile(this.me)

    if (!noProfile && this.me?.error) {
      return html`
        <div class="err">
          <h3>Error!</h3>
          <p>${this.me.error}</p>
        </div>
      `
    }

    if (noProfile) {
      return html`<slot name="profile-missing" @agentProfileCreated=${this.onProfileCreated}></slot>`
    }

    const profile = this.me?.data as WhoAmIQueryResult

    return html`<slot name="profile-ok" agentId=${profile.myAgent.id}></slot>`;
  }

  async onProfileCreated(_e: CustomEvent) {
    // :TODO: Update cache directly from event rather than requerying?
    //        Performance impacts probably negligible as data comes from local Holochain Conductor.
    // const agent = e.detail as AgentWithTypeResponse

    // @see https://github.com/apollo-elements/apollo-elements/issues/39#issuecomment-476272681
    this.me.subscribe({ nextFetchPolicy: 'cache-only' })
  }

  static styles = css`
    .err {
      h3 {
        color: var(--nh-applet-error-color)
      }
    }
  `

  static get scopedElements() {
    return {
      'mwc-circular-progress': CircularProgress,
    }
  }
}
