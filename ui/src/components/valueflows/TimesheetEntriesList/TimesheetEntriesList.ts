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
 * - request sorting by hasBeginning / hasPointInTime in API request
 *
 * @package Neighbourhoods/We Timesheet applet
 * @since   2023-02-01
 */

// import { consume } from "@lit-labs/context";
import { property } from "lit/decorators.js";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import { LitElement, PropertyValues, html, css } from "lit";
import { ApolloQueryController } from '@apollo-elements/core';
// @ts-ignore
import dayjs, { Dayjs } from 'dayjs'
// @ts-ignore
import pluralize from 'pluralize'
import { EconomicEvent, EconomicEventConnection } from '@valueflows/vf-graphql';

//@ts-ignore
import { FieldDefinitions, FieldDefinition } from '@adaburrows/table-web-component/dist/field-definitions'
//@ts-ignore
import { TableStore } from '@adaburrows/table-web-component/dist/table-store'
//@ts-ignore
import { Table } from '@adaburrows/table-web-component/dist/table'
import { ResourceSpecificationListRow } from '@vf-ui/component-resource-specification-list-row'
import { LoadingMessage } from "@neighbourhoods/component-loading-message"
import { ErrorDisplay } from "@neighbourhoods/component-error-display"

import { EventsListQuery, EventsListQueryResult } from '@valueflows/vf-graphql-shared-queries'

export { EconomicEvent, EconomicEventConnection, pluralize }

const SHORT_DATE_FORMAT = 'YYYY-MM-DD'
const LONG_DATETIME_FORMAT = 'YYYY-MM-DDTHH:mm:ss.SSSZ'
const READABLE_TIME_FORMAT = 'LT'

// formatting helpers
export const getEventStartTime = (node: EconomicEvent): Dayjs => dayjs(node.hasBeginning || node.hasPointInTime || node.hasEnd)
export const workEffort = (node: EconomicEvent): number => node.effortQuantity?.hasNumericalValue
export const workUnitLabel = (node: EconomicEvent): string | undefined => node.effortQuantity?.hasUnit?.label
export const isDailyWorklog = (node: EconomicEvent): boolean => !!(
  node.hasBeginning &&
  dayjs(node.hasBeginning).startOf('day').isSame(node.hasBeginning) &&
  node.hasEnd &&
  dayjs(node.hasEnd).endOf('day').isSame(node.hasEnd)
)
export const getTimeDisplayText = (node: EconomicEvent): string | null => {
  if (node.hasPointInTime) {
    return dayjs(node.hasPointInTime).format(READABLE_TIME_FORMAT)
  }
  if (isDailyWorklog(node)) {
    return null
  }
  return [
    dayjs(node.hasBeginning).format(READABLE_TIME_FORMAT),
    dayjs(node.hasEnd).format(READABLE_TIME_FORMAT),
  ].join(' - ')
}
export const getTimeISOString = (node: EconomicEvent) => getEventStartTime(node).format(LONG_DATETIME_FORMAT)

export const defaultEntryRenderer = (node: EconomicEvent) => html`
  <article>
    <header>
      <time datetime=${getTimeISOString(node)}>${getTimeDisplayText(node)}</time>
      <span>${pluralize(workUnitLabel(node), workEffort(node), true)}</span>
    </header>
    <div class="body">
      <vf-resource-specification-row .record=${node.resourceConformsTo}></vf-resource-specification-row>
      <h3>${node.note}</h3>
    </div>
    <footer>
      <!-- :TODO: agent display for multi-agent networks -->
    </footer>
  </article>
`

export const defaultEntryReducer = (res: EconomicEvent[], e: EconomicEvent) => {
  res.push(e)
  return res
}

export class TimesheetEntriesList extends ScopedElementsMixin(LitElement)
{
  // Allows hosting component to define how to filter and combine entry data
  @property()
  entryReducer: (a: EconomicEvent[], e: EconomicEvent) => EconomicEvent[] = defaultEntryReducer

  // Allow override of rendering logic / template for rows
  @property()
  entryRenderer = defaultEntryRenderer

  tableStore: TableStore<EconomicEvent>

  fieldDefs: FieldDefinitions<EconomicEvent> = {
    '_edit': new FieldDefinition<EconomicEvent>({
      heading: '',
      synthesizer: (data: EconomicEvent) => data,
      decorator: (data: EconomicEvent) => html`<sl-button @click=${() => this.onEditEvent(data)}><sl-icon name="pencil"></sl-icon></sl-button>`,
    }),
    'hasBeginning': new FieldDefinition<EconomicEvent>({ heading: 'Date' }),  // :TODO: +hasEnd?
    'note': new FieldDefinition<EconomicEvent>({ heading: 'Notes' }),
    'resourceConformsTo': new FieldDefinition<EconomicEvent>({ heading: 'Work type' }), // :TODO: +resourceClassifiedAs & resourceInventoriedAs?
    'effortQuantity': new FieldDefinition<EconomicEvent>({ heading: 'Duration' }),
  }

  entries?: ApolloQueryController<EventsListQueryResult> = new ApolloQueryController(this, EventsListQuery, {
    onData: (data: EventsListQueryResult) => {
      this.dispatchEvent(new CustomEvent('economicEventsLoaded', {
        detail: { data: data.economicEvents },
        bubbles: true,
        composed: true,
      }))
    }
  })

  constructor() {
    super()
    this.tableStore = new TableStore<EconomicEvent>({
      tableId: 'simple',
      fieldDefs: this.fieldDefs,
      records: [],
      showHeader: true,
    })
  }

  // update Table row data when loaded EconomicEvents change
  async updated(changedProperties: Map<string, any>) {
    if (changedProperties.has('data') && changedProperties.get('data') !== this.entries?.data) {
      // :TODO: this causes an unhandled exception somewhere within the reactive update cycle
      this.tableStore.records = (this.entries?.data?.economicEvents?.edges || [])
        // only interested in 'effort-based' EconomicEvents (with an `effortQuantity`)
        .filter(({ node }) => node.effortQuantity && node.effortQuantity.hasUnit)
        .map(({ node }) => node)
        .reduce(this.entryReducer, [])
    }
  }

  onEditEvent(evt: EconomicEvent) {
    console.log('edit', evt)
  }

  render() {
    const data = this.entries?.data as EventsListQueryResult

    if (this.entries?.error) {
      return html`
        <error-display .error=${this.entries.error}>
          <p slot="message">Problem loading work entries.</p>
        </error-display>
      `
    }
    if (!data || this.entries?.loading) {
      return html`
        <loading-message>Loading work entries&hellip;</loading-message>
      `
    }

    if (this.tableStore.records.length === 0) {
      return html`
        <div>
          <p>Nothing tracked yet!</p>
        </div>
      `
    }

    // reduce events into daily chunks
    // const dailyEvents = events.reduce<Record<string, Array<EconomicEvent>>>((res, e) => {
    //   const onDate = dayjs(e.hasBeginning).format(SHORT_DATE_FORMAT)
    //   if (!res[onDate]) res[onDate] = []
    //   res[onDate].push(e)
    //   return res
    // }, {})

    return html`
      <adaburrows-table .tableStore=${this.tableStore}>
      ${ /* Object.keys(dailyEvents).map(onDate => [html`
          <header>
            <time datetime=${onDate}>${onDate}</time>
          </header>
        `].concat(dailyEvents[onDate].map(this.entryRenderer))
      ) */ html``}
      </adaburrows-table>
    `
  }

  static get scopedElements() {
    return {
      'error-display': ErrorDisplay,
      'vf-resource-specification-row': ResourceSpecificationListRow,
      'loading-message': LoadingMessage,
      'adaburrows-table': Table,
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
