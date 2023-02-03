/**
 * Reads and renders a list of `EconomicEvents` as timesheet entries.
 *
 * Timesheet adjustments are common, particularly in realtime 'timer-based' tracking.
 * For this reason this view is programmed to collapse multiple event records into single
 * rows for display, where those events are associated as updates or deletes as follows:
 *
 * - `EconomicEvent.triggeredBy` of the appending / updating event must reference the
 *   original `EconomicEvent` being corrected; and
 * - `EconomicEvent.resourceClassifiedAs` must include the value `"vf:EconomicEventModifies"`.
 *       :TODO: sign off on this identifier in the official spec!
 *
 * @package Neighbourhoods/We Timesheet applet
 * @since   2023-02-01
 */

import { consume } from "@lit-labs/context";
import { property } from "lit/decorators.js";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import { LitElement, html, css } from "lit";
import { ApolloQueryController } from '@apollo-elements/core';
import { EconomicEventConnection } from '@valueflows/vf-graphql';

import { hreaGraphQLContext } from "../../contexts";
import { ApolloClient, NormalizedCacheObject } from "../../provider-graphql-client";

import { EventsListQuery } from './queries'

interface QueryResult {
  economicEvents: EconomicEventConnection
}

export class TimesheetEntriesList extends ScopedElementsMixin(LitElement) {
    // :NOTE: contextProvided has no effect here, is pulled from window.__APOLLO_CLIENT__ and assigned by Apollo controllers.
    //        @see https://github.com/lit/lit/issues/2446#issuecomment-1408143222
    @consume({ context: hreaGraphQLContext, subscribe: true })
    @property({ attribute: false })
    client!: ApolloClient<NormalizedCacheObject>

    entries?: ApolloQueryController<QueryResult> = new ApolloQueryController(this, EventsListQuery)

    render() {
        const data = this.entries?.data as QueryResult

        if (this.entries?.error) {
          return html`
            <div>
              <h3>Error!</h3>
              <p>${this.entries.error.toString()}</p>
            </div>
          `
        }
        if (!data || this.entries?.loading) {
          return html`
            <div>
              <p>Loading...</p>
            </div>
          `
        }
        if ((data?.economicEvents?.edges || []).length === 0) {
          return html`
            <div>
              <p>Nothing tracked yet!</p>
            </div>
          `
        }
        return html`
          <div>
            <p1>this is a provider component!</p1>
          </div>
        `
    }

    static get scopedElements() {
        return {
        };
  }

  static styles = css`
  `
}
