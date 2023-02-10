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

// import { contextProvided } from "@lit-labs/context"
import { property, state } from "lit/decorators.js"
import { ScopedElementsMixin } from "@open-wc/scoped-elements"
import { LitElement, html, css, PropertyValues } from "lit"
import { ApolloMutationController, ApolloQueryController } from '@apollo-elements/core'
import dayjs, { Dayjs } from 'dayjs'

// import { hreaGraphQLContext } from "../../contexts"
import { EconomicEventResponse, Agent, IMeasure } from '@valueflows/vf-graphql'

import { EventCreateMutation } from './mutations'
import { WhoAmI, WhoAmIQueryResult } from '@valueflows/vf-graphql-shared-queries'

import { TextField, Button } from '@scoped-elements/material-web'
// @ts-ignore
import Litepicker from 'litepicker'

enum TimeMeasure {
  Hour = "h",
  Minute = "m",
  Second = "s",
}

interface Duration {
  [TimeMeasure.Hour]?: number
  [TimeMeasure.Minute]?: number
  [TimeMeasure.Second]?: number
}

// Used for linking into external RDF vocabs for well-known measurement unit types in `EconomicEvent`
export const TIME_MEASURE_ONTOLOGY_URIS = {
  [TimeMeasure.Hour]: "http://www.ontology-of-units-of-measure.org/resource/om-2/hour",
  [TimeMeasure.Minute]: "http://www.ontology-of-units-of-measure.org/resource/om-2/minute-Time",
  [TimeMeasure.Second]: "http://www.ontology-of-units-of-measure.org/resource/om-2/second-Time",
}

/**
 * Parse input in 'X h(ours), Y m' format. Unitless numbers default to hours.
 */
function parseInterval(rawTimeStr: string): Duration | null {
  const matches = rawTimeStr.match(/\s*((\d+)\s*h?\s*)?((\d+)\s*m\s*)?((\d+)\s*s\s*)?/i)
  if (!matches) {
    return null
  }
  const [, , h, , m, , s] = matches
  return { h: parseInt(h || '0', 10), m: parseInt(m || '0', 10), s: parseInt(s || '0', 10) }
}

/**
 * Compute value to display when autocompleting the text input field
 */
function renderAutocompleted(duration: Duration) {
  const { h, m, s } = duration

  return [h ? `${h} hr` : null, m ? `${m} min` : null, s ? `${s} sec` : null].filter(v => v !== null).join(' ')
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
function convertToMeasure(measure: TimeMeasure, duration: Duration): number {
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
  return value
}

export class WorkInputManual extends ScopedElementsMixin(LitElement)
{
  me: ApolloQueryController<WhoAmIQueryResult> = new ApolloQueryController(this, WhoAmI)

  createEvent: ApolloMutationController<EconomicEventResponse> = new ApolloMutationController(this, EventCreateMutation)

  @state()
  note: string = ""

  @state()
  timeRaw: string = ""

  // interpreted from `timeRaw`
  @state()
  timeQty: number = 0

  // interpreted from `timeRaw`
  @state()
  timeUnits: TimeMeasure = TimeMeasure.Second

  @state()
  onDate: Dayjs = dayjs().startOf('day')

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

  async saveEvent(): Promise<EconomicEventResponse> {
    const myAgentId = this.me.data?.myAgent.id
    return ((await this.createEvent.mutate({ variables: {
      event: {
        action: 'raise',  // 'raise' means "raise the accounting value in the ledger by this amount"
        hasBeginning: this.onDate.toISOString(),
        hasEnd: dayjs(this.onDate).endOf('day').toISOString(),
        note: this.note,
        // resourceClassifiedAs: ['vf:correction'], :TODO: UI for editing events
        effortQuantity: {
          hasUnit: TIME_MEASURE_ONTOLOGY_URIS[this.timeUnits],
          hasNumericalValue: this.timeQty,
        },
        provider: myAgentId,
        // receiver: :TODO: active project / client
        receiver: myAgentId,
      },
    } })) as { createEconomicEvent: EconomicEventResponse }).createEconomicEvent
  }

  onDateChanged(e: Event) {
    // @ts-ignore
    this.onDate = dayjs(e.target?.value)
  }

  onTimeInputChanged(e: Event) {
    this.timeUnits = TimeMeasure.Second
    this.timeQty = 0
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

    const baseUnit = finestMeasure(duration)
    this.timeUnits = baseUnit
    this.timeQty = convertToMeasure(baseUnit, duration)
    this.timeRaw = renderAutocompleted(duration)
  }

  render() {
    // successful save state
    if (this.createEvent.data) {
      return html`
        <section class="outer">
          <p>Entry logged.</p>
        </section>
      `
    }

    // primary layout to receive participant input
    const duration = parseInterval(this.timeRaw)

    const canSave = !!(this.onDate && this.timeUnits && this.timeQty)
    const showAutocomplete = duration && !canSave

    return html`
      <section class="outer">

        <input class="datepicker" placeholder="Select date" value=${this.onDate} @change=${this.onDateChanged}></input>

        <div class="time-input">
          <mwc-textfield placeholder="Enter time (eg. 1h 30m)" value=${this.timeRaw} @change=${this.onTimeInputChanged} @keyup=${this.onTimeInputKeypress}></mwc-textfield>
          ${showAutocomplete ? (html`
            <div class="popup">
              <mwc-button fullwidth=1 @click=${this.chooseTime}>${renderAutocompleted(duration)}</mwc-button>
            </div>
          `) : null}
        </div>

        <mwc-textfield label="Notes" placeholder="(no description)" value=${this.note}></mwc-textfield>

        <mwc-button ?disabled=${!canSave} label="Save" @click="${this.saveEvent}"></mwc-button>
      </section>
    `
  }

  static styles = css`
    .outer {
      max-width: 40em;
      background-color: var(--nh-timetracker-form-background-color);
    }

    .time-input {
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
  `

  static get scopedElements() {
    return {
      'mwc-textfield': TextField,
      'mwc-button': Button,
    };
  }
}
