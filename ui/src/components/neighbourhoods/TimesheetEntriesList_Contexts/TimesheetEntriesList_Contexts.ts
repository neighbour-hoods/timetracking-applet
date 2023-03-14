/**
 * Timesheet entries list augmented with Sensemaker data dimensions
 * and content filters.
 *
 * :TODO: URL routing for view modes
 *
 * @package Neighbourhoods/We Timesheet applet
 * @since   2023-02-22
 */
import { property, state, query } from "lit/decorators.js"
import { consume } from "@lit-labs/context"
import { ScopedElementsMixin } from "@open-wc/scoped-elements"
import { LitElement, html, css, PropertyValues } from "lit"
import { StoreSubscriber } from "lit-svelte-stores"

import {
  TimesheetEntriesList as TimesheetEntriesListBase,
  EconomicEvent,
  workEffort, workUnitLabel,
  getTimeDisplayText, getTimeISOString,
  pluralize,
} from '@vf-ui/component-time-entries-list'
import { deserializeId } from '@valueflows/vf-graphql-holochain/connection'
import { EntryHash, encodeHashToBase64 } from '@holochain/client'

import { sensemakerStoreContext, SensemakerStore } from "@neighbourhoods/timetracking-applet-context"
import { Assessment, AppletConfig, RangeValueInteger, ComputeContextInput } from "@neighbourhoods/sensemaker-lite-types"

type EventWithAssessment = EconomicEvent & { assessments: Assessment[] | null }

const combineSensemakerData = (contextHashes: EntryHash[] | null, assessments: { [entryHash: string]: Array<Assessment> } | null) => (res: EventWithAssessment[], e: EconomicEvent) => {
  const eventHash = encodeHashToBase64(deserializeId(e.id)[1])
  const inContext = !contextHashes || contextHashes.find(h => encodeHashToBase64(h) === eventHash)
  if (!inContext) return res

  res.push({
    ...e,
    assessments: assessments ? assessments[eventHash] : null,
  })
  return res
}

const sumIntDimension = (dimension: Uint8Array, assessments: Assessment[] | null) => {
  if (!assessments) return 0
  const dim = encodeHashToBase64(dimension)
  return assessments?.reduce((tot: number, a: Assessment) => {
    if (encodeHashToBase64(a.dimension_eh) !== dim) return tot
    return tot + (a.value as RangeValueInteger).Integer
  }, 0)
}

export class TimesheetEntriesList extends ScopedElementsMixin(LitElement)
{
  @query('#entries-list')
  list!: TimesheetEntriesListBase;

  @consume({ context: sensemakerStoreContext, subscribe: true })
  @property({ attribute: false })
  public sensemakerStore!: SensemakerStore

  @state()
  error?: Error

  // maps to `ConfigCulturalContext` definitions in `appletConfig`
  // :TODO: provide dynamically
  @property()
  viewContext: string | null = null

  // Sensemaker store subscription handlers
  @state()
  appletConfig?: StoreSubscriber<AppletConfig>
  @state()
  resourceAssessments?: StoreSubscriber<{ [entryHash: string]: Assessment[] }>
  @state()
  contextResults?: StoreSubscriber<{ [culturalContextName: string]: EntryHash[] }>

  // derived Sensemaker store state
  @state()
  entryTotals?: EntryTotals

  async updated(changedProperties: PropertyValues<this>) {
    // rebind relevant sensemakerStore observables when the store instance is assigned
    if (changedProperties.has("sensemakerStore") && this.sensemakerStore) {
      this.appletConfig = new StoreSubscriber(this, this.sensemakerStore.appletConfig.bind(this.sensemakerStore))
      this.resourceAssessments = new StoreSubscriber(this, this.sensemakerStore.resourceAssessments.bind(this.sensemakerStore))
      this.contextResults = new StoreSubscriber(this, this.sensemakerStore.contextResults.bind(this.sensemakerStore))
    }
  }

  async handleAssessment(dimensionId: string, eventId: string) {
    if (!this.appletConfig) return
    const appletConfig = this.appletConfig.value

    const eventHash = deserializeId(eventId)[1]

    // :TODO: add ability to toggle by updating previous value?
    try {
      await this.sensemakerStore.createAssessment({
        value: { Integer: 1 },
        dimension_eh: appletConfig.dimensions[dimensionId],
        subject_eh: eventHash,
        maybe_input_dataSet: null,
      })
      await this.sensemakerStore.runMethod({
        resource_eh: eventHash,
        method_eh: appletConfig.methods[`total_${dimensionId}_method`],
      })
    } catch (e) {
      this.error = e as Error
    }
  }

  async setViewContext(c: string) {
    this.viewContext = c
    // refresh the computation context when view is changed
    // :TODO: would it be better to couple this to data updates?
    this.computeContext(c)
  }

  async computeContext(c: string) {
    if (!this.appletConfig) return
    const appletConfig = this.appletConfig.value

    // :TODO: this should probably come from the API rather than currently active
    // paginated set, since some filtering may occur in the context change.
    const economicEventHashes = this.list.entries?.data?.economicEvents?.edges.map(({ node }) => deserializeId(node.id)[1])

    const contextResultInput: ComputeContextInput = {
      resource_ehs: economicEventHashes || [],
      context_eh: appletConfig.cultural_contexts[c],
      can_publish_result: false,
    }
    await this.sensemakerStore.computeContext(c, contextResultInput)

    this.requestUpdate()
  }

  renderEntry(appletConfig: AppletConfig | null, node: EventWithAssessment) {
    const onVerify = this.handleAssessment.bind(this, "verify", node.id)
    const onFlag = this.handleAssessment.bind(this, "followup", node.id)

    const numVerified = appletConfig ? sumIntDimension(appletConfig.dimensions.verify, node.assessments) : 0
    const numFlagged = appletConfig? sumIntDimension(appletConfig.dimensions.followup, node.assessments) : 0

    return html`
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
        <meta>
          <button @click=${onVerify} @keyUp=${onVerify}>verify</button>
          ${numVerified ? html`(${numVerified})` : null}
          <button @click=${onFlag} @keyUp=${onFlag}>flag</button>
          ${numFlagged ? html`(${numFlagged})` : null}
        </meta>
      </article>
    `
  }

  render() {
    // :TODO: standardise error display component
    if (this.error) {
      return html`<div>
        <h1>error</h1>
        <pre>${this.error}</pre>
      </div>`
    }

    const appletConfig = this.appletConfig?.value
    const assessments = this.resourceAssessments?.value
    const contextHashes = this.viewContext ? this.contextResults?.value[this.viewContext] : undefined

    return html`
      <ul class="view-controls">
        <li><a href="#most_verified_work" @click=${() => this.setViewContext('most_verified_work')}>Most verified</a></li>
        <li><a href="#unverified_work" @click=${() => this.setViewContext('unverified_work')}>Unverified</a></li>
        <li><a href="#followup_needed" @click=${() => this.setViewContext('followup_needed')}>Followup needed</a></li>
        <li><a href="#no_followup_needed" @click=${() => this.setViewContext('no_followup_needed')}>No followup needed</a></li>
      </ul>
      <vf-timesheet-entries-list
        id="entries-list"
        .entryReducer=${combineSensemakerData(contextHashes, assessments)}
        .entryRenderer=${this.renderEntry.bind(this, appletConfig)}
      >
      </vf-timesheet-entries-list>
    `
  }

  static get scopedElements() {
    return {
      'vf-timesheet-entries-list': TimesheetEntriesListBase,
    };
  }

  static css = css`
    .view-controls button {
      clear: left;
      display: inline-block;
    }
  `
}
