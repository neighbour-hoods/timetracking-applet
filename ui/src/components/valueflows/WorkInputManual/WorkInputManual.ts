/**
 * "Manual" work effort input form
 *
 * Displays a simplified retroactive work time logger. This component
 * writes `EconomicEvent`s where-
 * - "day of work" is given as a date (not exact datetime)
 * - "amount worked" takes time duration as input
 * The event is thus written to say "X minutes of work occurred within this day".
 *
 * This CustomElement should be wrapped in a `@vf-ui/component-provide-time-units`
 * in order to have its `timeUnitDefs` property automatically assigned to default
 * values (hours, minutes, seconds) for quantifying work input.
 *
 * @package Neighbourhoods/We Timesheet applet
 * @since   2023-02-01
*/

// import { contextProvided } from "@lit-labs/context"
import { property, state } from "lit/decorators.js"
import { ScopedRegistryHost as ScopedElementsMixin } from "@lit-labs/scoped-registry-mixin"
import { LitElement, html, css, PropertyValues } from "lit"
import { ApolloMutationController, ApolloQueryController } from '@apollo-elements/core'
import dayjs, { Dayjs } from 'dayjs'
// @ts-ignore
import Litepicker from 'litepicker'

// import { hreaGraphQLContext } from "../../contexts"
import { EconomicEventResponse, IMeasure } from '@valueflows/vf-graphql'

import { WhoAmI, WhoAmIQueryResult, EventsListQuery, EventsListQueryResult } from '@valueflows/vf-graphql-shared-queries'
import { ITimeUnits } from '@vf-ui/component-provide-time-units'
import { InputWorkType } from '@vf-ui/component-input-work-type'
import { ErrorDisplay } from "@neighbourhoods/component-error-display"

import SlInput from '@shoelace-style/shoelace/dist/components/input/input.js'
import SlButton from '@shoelace-style/shoelace/dist/components/button/button.js'
import SlTextArea from '@shoelace-style/shoelace/dist/components/textarea/textarea.js'

import { EventCreateMutation, EventCreateResponse } from './mutations'

export enum TimeMeasure {
  Hour = "hours",
  Minute = "minutes",
  Second = "seconds",
}

export interface Duration {
  [TimeMeasure.Hour]?: number
  [TimeMeasure.Minute]?: number
  [TimeMeasure.Second]?: number
}

/**
 * Parse input in 'X h(ours), Y m' format. Unitless numbers default to hours.
 */
function parseInterval(rawTimeStr: string): Duration | null {
  const matches = rawTimeStr.match(/\s*((\d+)\s*h?\w*\s*)?((\d+)\s*m\w*\s*)?((\d+)\s*s\w*\s*)?/i)
  if (!matches) {
    return null
  }
  const [, , h, , m, , s] = matches
  return { hours: parseInt(h || '0', 10), minutes: parseInt(m || '0', 10), seconds: parseInt(s || '0', 10) }
}

/**
 * Compute value to display when autocompleting the text input field
 */
function renderAutocompleted(duration: Duration) {
  const { hours, minutes, seconds } = duration

  return [hours ? `${hours} h` : null, minutes ? `${minutes} m` : null, seconds ? `${seconds} s` : null].filter(v => v !== null).join(' ')
}

/**
 * Compute the values to be sent to VF backend (finest necessary measure of precision)
 */
function finestMeasure(duration: Duration) {
  if (duration[TimeMeasure.Second]) return TimeMeasure.Second
  if (duration[TimeMeasure.Minute]) return TimeMeasure.Minute
  if (duration[TimeMeasure.Hour]) return TimeMeasure.Hour
  return TimeMeasure.Second // fallback to seconds-precision which in some cases may make sense for zeroes?
}

/**
 * Compute the raw numeric value of a unit conversion against all separate elements in a `Duration`,
 * based on a lowest-common-denominator base `TimeMeasure` unit.
 */
export function convertToMeasure(timeUnitDefs: ITimeUnits, measure: TimeMeasure, duration: Duration): IMeasure {
  let value = 0
  if (duration[TimeMeasure.Hour]) {
    if (measure === TimeMeasure.Minute) {
      value += duration[TimeMeasure.Hour] * 60
    }
    if (measure === TimeMeasure.Second) {
      value += duration[TimeMeasure.Hour] * 3600
    }
    if (measure === TimeMeasure.Hour) {
      value += duration[TimeMeasure.Hour]
    }
  }
  if (duration[TimeMeasure.Minute]) {
    if (measure === TimeMeasure.Hour) {
      value += duration[TimeMeasure.Minute] / 60
    }
    if (measure === TimeMeasure.Second) {
      value += duration[TimeMeasure.Minute] * 60
    }
    if (measure === TimeMeasure.Minute) {
      value += duration[TimeMeasure.Minute]
    }
  }
  if (duration[TimeMeasure.Second]) {
    if (measure === TimeMeasure.Minute) {
      value += duration[TimeMeasure.Second] * 60
    }
    if (measure === TimeMeasure.Hour) {
      value += duration[TimeMeasure.Second] / 3600
    }
    if (measure === TimeMeasure.Second) {
      value += duration[TimeMeasure.Second]
    }
  }
  return {
    hasUnit: timeUnitDefs[measure].id,
    hasNumericalValue: value,
  }
}

const LONG_DATETIME_FORMAT = 'YYYY-MM-DDTHH:mm:ss.SSSZ'

export class WorkInputManual extends ScopedElementsMixin(LitElement)
{
  me: ApolloQueryController<WhoAmIQueryResult> = new ApolloQueryController(this, WhoAmI)

  createEvent: ApolloMutationController<EventCreateResponse> = new ApolloMutationController(this, EventCreateMutation, {
    // prepend to readAll query when write request completes
    update: (cache, result) => {
      const existing = (cache.readQuery({
        query: EventsListQuery,
      }) as EventsListQueryResult)
      const current = existing ? existing.economicEvents.edges : []
      const created = result.data?.createEconomicEvent.economicEvent

      cache.writeQuery({
        query: EventsListQuery,
        data: {
          economicEvents: {
            pageInfo: existing?.economicEvents.pageInfo,
            edges: [{
              node: created,
            }].concat(current),
          },
        },
        overwrite: true,
      })
    },
  })

  // `Unit` record definitions loaded from Valueflows API. Assign from helper provider component.
  @property()
  timeUnitDefs!: ITimeUnits

  @state()
  note: string = ""

  // raw text into time input field
  @state()
  timeRaw: string = ""

  // interpreted from `timeRaw`
  @state()
  timeQty: IMeasure | null = null

  @state()
  workDate: Dayjs = dayjs().startOf('day')

  @state()
  workType: string | null = null

  async saveEvent(): Promise<EconomicEventResponse | undefined> {
    if (!this.me.data) {
      return // do nothing if active agent ID cannot be determined, this means the UI is still loading
    }

    const myAgentId = this.me.data?.myAgent.id
    const event = {
      action: 'raise',
      hasBeginning: this.workDate.format(LONG_DATETIME_FORMAT),
      hasEnd: dayjs(this.workDate).endOf('day').format(LONG_DATETIME_FORMAT),
      note: this.note,
      resourceConformsTo: this.workType,
      // resourceClassifiedAs: ['vf:correction'], :TODO: UI for editing events
      effortQuantity: this.timeQty,
      provider: myAgentId,
      // receiver: :TODO: active project / client
      receiver: myAgentId,
    }

    let resp
    try {
      resp = ((await this.createEvent.mutate({ variables: { event } })) as { createEconomicEvent: EconomicEventResponse }).createEconomicEvent
    } catch (e) {
      console.error(e)
      throw e
    }

    this.dispatchEvent(new CustomEvent<EconomicEventResponse>('economicEventCreated', {
      detail: resp,
      bubbles: true,
      composed: true,
    }))

    return resp
  }

  onResourceSpecificationChanged(e: Event) {
    // @ts-ignore
    this.workType = e.detail?.value
  }

  workDateChanged(e: Event) {
    // @ts-ignore
    this.workDate = dayjs(e.target?.value)
  }

  // on any input to time autocomplete field, clear selection & update raw input state
  onTimeInputChanged(e: Event) {
    this.timeQty = null
    // @ts-ignore
    this.timeRaw = e.target?.value
  }

  // update interpreted time values from raw input upon selection
  chooseTime(e: FormDataEvent) {
    e.preventDefault()

    const duration = parseInterval(this.timeRaw)
    if (!duration || !this.timeUnitDefs) return

    // save autocomplete selection to component state
    this.timeQty = convertToMeasure(this.timeUnitDefs, finestMeasure(duration), duration)
    // update input text with normalised format
    this.timeRaw = renderAutocompleted(duration)
  }

  render() {
    // error loading context user
    if (this.me.error) {
      return html`
        <error-display .error=${this.me.error}>
          <p slot="message">Error loading profile.</p>
        </error-display>
      `
    }
    // error saving event
    // :TODO: standardize error display component
    if (this.createEvent.error) {
      return html`
        <error-display .error=${this.createEvent.error}>
          <p slot="message">Error logging work entry.</p>
        </error-display>
      `
    }

    // primary layout to receive participant input
    const duration = parseInterval(this.timeRaw)

    const canSave = !!(this.workDate && this.timeQty && this.workType)
    const showAutocomplete = duration && !this.timeQty && (duration.hours || duration.minutes || duration.seconds)

    return html`
      <section class="outer">

        <div class="input">
          <sl-textarea placeholder="(no description)" value=${this.note} rows="1"></sl-textarea>
        </div>

        <div class="input">
          <sl-input type="date" placeholder="Select date" value=${this.workDate} @change=${this.workDateChanged}></sl-input>
        </div>

        <div class="input${showAutocomplete ? ` focused` : ''}">
          <form class="autocomplete" @submit=${this.chooseTime}>
            <sl-input placeholder="Enter time (eg. 1h 30m)" value=${this.timeRaw} @sl-change=${this.onTimeInputChanged}></sl-input>
            ${showAutocomplete ? (html`
              <div class="popup">
                <sl-button type="submit" variant="primary" ?disabled=${!this.timeUnitDefs}>${renderAutocompleted(duration)}</sl-button>
              </div>
            `) : null}
          </form>
        </div>

        <div class="input worktype">
          <vf-input-worktype placeholder="What were you doing?" value=${this.workType} @change=${this.onResourceSpecificationChanged}></vf-input-worktype>
        </div>

        <div class="input">
          <sl-button ?disabled=${!canSave} @click="${this.saveEvent}" variant="primary">Save</sl-button>
        </div>

      </section>
    `
  }

  static styles = css`
    :host {
      --sl-input-border-width: 0px;
    }
    .outer {
      background-color: var(--nh-timetracker-form-background-color);
      display: grid;
      column-gap: 0.5em;
      grid-template-columns: 1fr 0fr minmax(12.6em, 0fr) minmax(13em, 0fr) 0fr;
    }

    .input, sl-input::part(input) {
      line-height: calc(var(--sl-input-height-medium) - var(--sl-input-border-width) * 2);
    }
    sl-textarea {
      margin-top: 0.3em; // :SHONK: workaround for inline-flex positioning in Shoelace UI controls interfering with layout
    }

    .input.focused {
      margin: -0.2em;
      padding: 0.2em 0.4em;
      background: var(--nh-color-background-2);
    }

    .input sl-input {
      display: block;
    }

    .autocomplete {
      position: relative;
      overflow: visible;
    }

    .popup {
      position: absolute;
      top: var(--sl-input-height-medium);
      left: 0;
      width: 100%;
      z-index: 1;
    }

    footer {
      margin-top: 1em;
    }

    .notify {
      font-size: 0.8em;
      font-weight: bold;
      color: var(--nh-applet-success-color);
    }

    sl-button {
      display: block;
    }
    .popup sl-button {
      border-top-left-radius: 0;
      border-top-right-radius: 0;
      margin-top: -2px;
    }
  `

  static get elementDefinitions() {
    return {
      'error-display': ErrorDisplay,
      'vf-input-worktype': InputWorkType,
      'sl-input': SlInput,
      'sl-button': SlButton,
      'sl-textarea': SlTextArea,
    };
  }
}
