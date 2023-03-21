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
import { ScopedElementsMixin } from "@open-wc/scoped-elements"
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

import { TextField, Button } from '@scoped-elements/material-web'

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
  onDate: Dayjs = dayjs().startOf('day')

  @state()
  workType: string | null = null

  _datepicker?: Litepicker

  protected firstUpdated(_changedProperties: PropertyValues): void {
    this.initDatepicker()
  }

  disconnectedCallback(): void {
    this.cleanupDatepicker()
  }

  private initDatepicker() {
    const element = this.renderRoot.querySelector('.datepicker')
    if (!element) return
    this._datepicker = new Litepicker({
      element: element as HTMLInputElement,
    })
  }

  private cleanupDatepicker() {
    if (!this._datepicker) return
    this._datepicker.destroy()
  }

  async saveEvent(): Promise<EconomicEventResponse | undefined> {
    if (!this.me.data) {
      return // do nothing if active agent ID cannot be determined, this means the UI is still loading
    }

    const myAgentId = this.me.data?.myAgent.id
    const event = {
      action: 'raise',
      hasBeginning: this.onDate.format(LONG_DATETIME_FORMAT),
      hasEnd: dayjs(this.onDate).endOf('day').format(LONG_DATETIME_FORMAT),
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

  onDateChanged(e: Event) {
    // @ts-ignore
    this.onDate = dayjs(e.target?.value)
  }

  // on any input to time autocomplete field, clear selection & update raw input state
  onTimeInputChanged(e: Event) {
    this.timeQty = null
    // @ts-ignore
    this.timeRaw = e.target?.value
  }

  onTimeInputKeypress(e: KeyboardEvent) {
    // update component state from input
    this.onTimeInputChanged(e)

    const keycode = (e.keyCode ? e.keyCode : e.which)
    // on enter or tab keypress, select matched time duration
    if (keycode === 13 || keycode === 9) {
      if (parseInterval(this.timeRaw)) {
        this.chooseTime()
      }
    }
  }

  // update interpreted time values from raw input upon selection
  chooseTime(_e?: InputEvent) {
    const duration = parseInterval(this.timeRaw)
    if (!duration) return

    // save autocomplete selection to component state
    this.timeQty = convertToMeasure(this.timeUnitDefs, finestMeasure(duration), duration)
    // update input text with normalised format
    this.timeRaw = renderAutocompleted(duration)
  }

  render() {
    // error loading context user
    if (this.me.error) {
      return html`
        <section class="error">
          <h3>Error loading Agent profile</h3>
          <p>${this.me.error}</p>
        </section>
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

    const canSave = !!(this.onDate && this.timeQty && this.workType)
    const showAutocomplete = duration && !canSave

    return html`
      <section class="outer">

        <div class="input">
          <input class="datepicker" placeholder="Select date" value=${this.onDate} @change=${this.onDateChanged}></input>
        </div>

        <div class="input">
          <div class="time-input">
            <mwc-textfield placeholder="Enter time (eg. 1h 30m)" value=${this.timeRaw} @change=${this.onTimeInputChanged} @keyup=${this.onTimeInputKeypress}></mwc-textfield>
            ${showAutocomplete ? (html`
              <div class="popup">
                <mwc-button fullwidth=1 @click=${this.chooseTime}>${renderAutocompleted(duration)}</mwc-button>
              </div>
            `) : null}
          </div>
        </div>

        <div class="input">
          <vf-input-worktype placeholder="What were you doing?" value=${this.workType} @change=${this.onResourceSpecificationChanged}></vf-input-worktype>
        </div>

        <div class="input">
          <mwc-textfield label="Notes" placeholder="(no description)" value=${this.note}></mwc-textfield>
        </div>

        <mwc-button ?disabled=${!canSave} label="Save" @click="${this.saveEvent}"></mwc-button>

      </section>
    `
  }

  static styles = css`
    .outer {
      max-width: 40em;
      background-color: var(--nh-timetracker-form-background-color);
    }

    .input {
      padding: 0 0.2em;
    }

    .time-input {
      display: inline-block;
      position: relative;
      overflow: visible;
      margin-bottom: 1em;
    }

    .popup {
      position: absolute;
      top: 100%;
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
  `

  static get scopedElements() {
    return {
      'error-display': ErrorDisplay,
      'vf-input-worktype': InputWorkType,
      'mwc-textfield': TextField,
      'mwc-button': Button,
    };
  }
}
