/**
 * Reads and renders a list of `EconomicEvents` as timesheet entries.
 *
 * Timesheet adjustments are common, particularly in realtime 'timer-based' tracking.
 * For this reason this view is programmed to collapse multiple event records into single
 * rows for display, where those events are associated as updates or deletes as follows:
 *
 * - `EconomicEvent.triggeredBy` of the appending / updating event must reference the
 *   original `EconomicEvent` being corrected; and
 * - `EconomicEvent.resourceClassifiedAs` must include the value `"vf:corrects"`.
 *       :TODO: sign off on this identifier in the official spec!
 *
 * :TODO:
 * - handle displays of arbitrary time periods (as opposed to dates)
 * - update to handle all conditions for `EconomicEvent` resource-related metadata
 * - update to handle display of `Process`-based work
 *
 * @package Neighbourhoods/We Timesheet applet
 * @since   2023-02-01
 */

// import { consume } from "@lit-labs/context";
import { property } from "lit/decorators.js";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import { LitElement, html, css } from "lit";
import { ApolloQueryController } from '@apollo-elements/core';
import dayjs, { Dayjs } from 'dayjs'
import { EconomicEventConnection, EconomicEvent } from '@valueflows/vf-graphql';

// import { ResourceSpecificationRow } from '@vf-ui/component-resource-specification-row'

import { EventsListQuery, EventsListQueryResult } from '@valueflows/vf-graphql-shared-queries'

const SHORT_DATE_FORMAT = 'YYYY-MM-DD'

export class TimesheetEntriesList extends ScopedElementsMixin(LitElement)
{
  entries?: ApolloQueryController<EventsListQueryResult> = new ApolloQueryController(this, EventsListQuery)

  render() {
    const data = this.entries?.data as EventsListQueryResult

    if (this.entries?.error) {
      return html`
        <div>
          <h1>Error!</h1>
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

    const events = (data?.economicEvents?.edges || [])
      // only interested in 'effort-based' EconomicEvents (with an `effortQuantity`)
      .filter(({ node }) => node.effortQuantity && node.effortQuantity.hasUnit)

    if (events.length === 0) {
      return html`
        <div>
          <p>Nothing tracked yet!</p>
        </div>
      `
    }

    // reduce events into daily chunks
    const dailyEvents = events.reduce<Record<string, Array<EconomicEvent>>>((res, e) => {
      const onDate = dayjs(e.node.hasBeginning).format(SHORT_DATE_FORMAT)
      if (!res[onDate]) res[onDate] = []
      res[onDate].push(e.node)
      return res
    }, {})

    return html`
      <section class="timesheet-list">
      ${Object.keys(dailyEvents).map(onDate => [html`
          <header>
            <time datetime=${onDate}>${onDate}</time>
          </header>
        `].concat(dailyEvents[onDate].map(node => html`
          <article>
            <div class="body">
              ${/* <vf-resource-specification-row byId=${node.resourceConformsTo}></vf-resource-specification-display> */html``}
              <h3>${node.note}</h3>
            </div>
            <footer>
              <!-- :TODO: agent display for multi-agent networks -->
            </footer>
          </article>
        `))
      )}
      </section>
    `
  }

  static get scopedElements() {
    return {
      // 'vf-resource-specification-row': ResourceSpecificationRow,
    };
  }

  static styles = css`
    article {
      display: flex;
      flex-direction: column;
    }
    header, footer {
      flex: 0;
    }
    .body {
      flex: 1;
    }
  `
}
