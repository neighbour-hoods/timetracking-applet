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
import { html, css, TemplateResult } from "lit";
import { property, state } from "lit/decorators.js";
import { NHComponentShoelace } from 'neighbourhoods-design-system-components/dist/components/base'
import { ApolloQueryController } from '@apollo-elements/core';
// @ts-ignore
import dayjs, { Dayjs } from 'dayjs'
import LocalizedFormat from 'dayjs/plugin/localizedFormat'
// @ts-ignore
import pluralize from 'pluralize'
import { EconomicEvent, EconomicEventConnection, ResourceSpecification, Measure } from '@valueflows/vf-graphql';

//@ts-ignore
import { TableStore } from '@adaburrows/table-web-component'
import type { FieldDefinitions, FieldDefinition } from '@adaburrows/table-web-component'
import { ResourceSpecificationListRow } from '@vf-ui/component-resource-specification-list-row'
import { LoadingMessage } from "@neighbourhoods/component-loading-message"
import { ErrorDisplay } from "@neighbourhoods/component-error-display"

import SlButton from '@shoelace-style/shoelace/dist/components/button/button.js'
import SlIcon from '@shoelace-style/shoelace/dist/components/icon/icon.js'

import { EventsListQuery, EventsListQueryResult } from '@valueflows/vf-graphql-shared-queries'

export { EconomicEvent, EconomicEventConnection, FieldDefinitions, FieldDefinition, pluralize }

dayjs.extend(LocalizedFormat)

const LONG_DATETIME_FORMAT = 'YYYY-MM-DDTHH:mm:ss.SSSZ'
const READABLE_DATE_FORMAT = 'LL'
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

export const defaultEntryReducer = (res: EconomicEvent[], e: EconomicEvent) => {
  res.push(e)
  return res
}

export interface EconomicEventInteractionHandler {
  onEditEvent: (evt: EconomicEvent | null) => void
  currentlyEditing?: string
}

export const defaultFieldDefs = (thisObj: EconomicEventInteractionHandler) => ({
  // :IMPORTANT: 0th row retrieves the full data for inference in render reducer
  '_data': new FieldDefinition<EconomicEvent>({ synthesizer: (data: EconomicEvent) => data }),
  'note': new FieldDefinition<EconomicEvent>({ heading: 'Notes' }),
  'resourceConformsTo': new FieldDefinition<EconomicEvent>({
    heading: 'Work type',
    decorator: (spec: ResourceSpecification) => spec.name
  }), // :TODO: +resourceClassifiedAs & resourceInventoriedAs?
  'effortQuantity': new FieldDefinition<EconomicEvent>({
    heading: 'Duration',
    // :TODO: format with coarsest applicable dimension & remainder units
    decorator: (qty: Measure) => html`${qty.hasNumericalValue} ${qty.hasUnit?.symbol}`
  }),
  '_meta': new FieldDefinition<EconomicEvent>({
    heading: '',
    synthesizer: (data: EconomicEvent) => data,
    decorator: (data: EconomicEvent) => thisObj.currentlyEditing && thisObj.currentlyEditing === data.id ?
      html`<sl-button @click=${() => thisObj.onEditEvent(null)}><sl-icon name="x-circle"></sl-icon></sl-button>` :
      html`<sl-button @click=${() => thisObj.onEditEvent(data)}><sl-icon name="pencil"></sl-icon></sl-button>`,
  }),
})

export class TimesheetEntriesList extends NHComponentShoelace
{
  // Allows hosting component to define how to filter and combine entry data
  @property()
  entryReducer: (a: EconomicEvent[], e: EconomicEvent) => EconomicEvent[] = defaultEntryReducer

  tableStore: TableStore<EconomicEvent>

  @property()
  fieldDefs: FieldDefinitions<EconomicEvent> = defaultFieldDefs(this)

  entries?: ApolloQueryController<EventsListQueryResult> = new ApolloQueryController(this, EventsListQuery, {
    onData: (data: EventsListQueryResult) => {
      this.dispatchEvent(new CustomEvent('economicEventsLoaded', {
        detail: { data: data.economicEvents },
        bubbles: true,
        composed: true,
      }))
    }
  })

  @state()
  currentlyEditing?: string

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
    if (changedProperties.has('fieldDefs') && changedProperties.get('fieldDefs') !== this.fieldDefs) {
      this.tableStore.fieldDefs = this.fieldDefs
    }
    if (changedProperties.has('data') && changedProperties.get('data') !== this.entries?.data) {
      // :TODO: this causes an unhandled exception somewhere within the reactive update cycle
      this.tableStore.records = (this.entries?.data?.economicEvents?.edges || [])
        // only interested in 'effort-based' EconomicEvents (with an `effortQuantity`)
        .filter(({ node }: { node: EconomicEvent }) => node.effortQuantity && node.effortQuantity.hasUnit)
        .map(({ node }: { node: EconomicEvent }) => node)
        // :TODO: make sorting optional, this is unnecessary performance overhead if reducer is setting own order.
        .sort((a, b) => {
          const aD: Date = a.hasBeginning || a.hasPointInTime || new Date(0)
          const bD: Date = b.hasBeginning || b.hasPointInTime || new Date(0)
          if (aD === bD) return 0
          return aD > bD ? -1 : 1
        })
        .reduce(this.entryReducer, [])
    }
  }

  async onEditEvent(evt: EconomicEvent | null) {
    this.currentlyEditing = evt ? evt.id : undefined
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

    // synthesize all necessary data from the table through its fieldDefs
    const tableRows = this.tableStore.getRows()

    // reduce events into daily chunks
    // @ts-ignore
    const dailyEvents = tableRows.reduce<Record<string, Array<RowValue[]>>>((res, row) => {
      const data = row.shift()?.value
      const onDate = dayjs(data.hasBeginning).format(LONG_DATETIME_FORMAT)
      if (!res[onDate]) res[onDate] = []
      res[onDate].push(row)
      return res
    }, {})

    // render table segmented by daily header rows
    return html`
      <table>
        <colgroup>
          <col></col>
          <col></col>
          <col></col>
          <col class="actions"></col>
        </colgroup>
      ${Object.keys(dailyEvents).map(onDate => [
      html`
        <tr>
          <th colSpan=${Object.keys(this.fieldDefs).length - 2}>
            <time datetime=${onDate}>${dayjs(onDate).format(READABLE_DATE_FORMAT)}</time>
          </th>
          <th>&nbsp;</th>
        </tr>
      `].concat(dailyEvents[onDate].map((d: { value: TemplateResult }[]) => html`<tr>${d.map(d => html`<td>${d.value}</td>`)}</tr>`))
      )}
      </table>
    `
  }

  static elementDefinitions = {
    'error-display': ErrorDisplay,
    'vf-resource-specification-row': ResourceSpecificationListRow,
    'loading-message': LoadingMessage,
    'sl-button': SlButton,
    'sl-icon': SlIcon,
  }

  static styles = css`
    table {
      width: 100%;
      table-layout: fixed;
    }
    td {
      overflow: hidden;
      text-overflow: ellipsis;
      position: relative;
    }
    col.actions {
      width: 2em;
    }
    td:last-child {
      overflow: visible;
    }
  `
}
