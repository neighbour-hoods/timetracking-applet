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
import { ScopedRegistryHost as ScopedElementsMixin } from "@lit-labs/scoped-registry-mixin"
import { LitElement, html, css, PropertyValues } from "lit"
import { StoreSubscriber } from "lit-svelte-stores"

import { ErrorDisplay } from '@neighbourhoods/component-error-display'
import {
  TimesheetEntriesList as TimesheetEntriesListBase,
  defaultFieldDefs, FieldDefinitions, FieldDefinition,
  EconomicEvent, EconomicEventConnection,
} from '@vf-ui/component-time-entries-list'
import { deserializeId } from '@valueflows/vf-graphql-holochain/connection'
import { EntryHash, encodeHashToBase64, EntryHashB64 } from '@holochain/client'

import { sensemakerStoreContext, SensemakerStore } from "@neighbourhoods/timetracking-applet-context"
import { Assessment, AppletConfig, RangeValueInteger, ComputeContextInput } from "@neighbourhoods/sensemaker-lite-types"

import SlDropDown from '@shoelace-style/shoelace/dist/components/dropdown/dropdown.js'
import SlMenu from '@shoelace-style/shoelace/dist/components/menu/menu.js'
import SlMenuItem from '@shoelace-style/shoelace/dist/components/menu-item/menu-item.js'

type EventWithAssessment = EconomicEvent & { assessments: Assessment[] | null }

// extend CustomElement defs on wrapped component to enable it to render them
Object.assign(TimesheetEntriesListBase.elementDefinitions, {
  'sl-menu': SlMenu,
  'sl-menu-item': SlMenuItem,
  'sl-dropdown': SlDropDown,
})

// reducer for merging assessments with inner TimesheetEntriesList result data
const combineSensemakerData = (contextHashes: EntryHashB64[] | undefined, assessments: { [entryHash: string]: Array<Assessment> } | undefined) => (res: EventWithAssessment[], e: EconomicEvent) => {
  const eventHash = encodeHashToBase64(deserializeId(e.id)[1])
  const inContext = !contextHashes || contextHashes.find(h => h === eventHash)
  if (!inContext) return res

  res.push({
    ...e,
    assessments: assessments ? assessments[eventHash] : null,
  })

  // keep the result sorted based on position within the (ordered) cultural context
  res.sort((a, b) => {
    const ai = contextHashes?.indexOf(encodeHashToBase64(deserializeId(a.id)[1])) || -1
    const bi = contextHashes?.indexOf(encodeHashToBase64(deserializeId(b.id)[1])) || -1
    if (ai === bi) return 0
    return ai < bi ? -1 : 1
  })
  return res
}

// :TODO: This data c/should be coming from core Sensemaker modules; in some format generalisable to method & output dimension?
interface EntryTotals { verify: Map<string, Assessment[]>, followup: Map<string, Assessment[]> }
interface EntryTotalsPending { verify: Map<string, Promise<Assessment[]>>, followup: Map<string, Promise<Assessment[]>> }

// Generator function. Creates bound reducers for computing all relevant method results for a set of assessed entries.
const readComputedEntryTotals = (thisObj: TimesheetEntriesList) =>
  (results: EntryTotalsPending, entryHash: Uint8Array) => {
    const entryHashB64 = encodeHashToBase64(entryHash)

    const verifyResult = readEntryAssessments(thisObj,
      thisObj.appletConfig?.value.dimensions[`total_verify`],
      entryHash,
    )
    if (verifyResult) {
      results.verify.set(entryHashB64, verifyResult)
    }
    const followupResult = readEntryAssessments(thisObj,
      thisObj.appletConfig?.value.dimensions[`total_followup`],
      entryHash,
    )
    if (followupResult) {
      results.followup.set(entryHashB64, followupResult)
    }

    return results
  }

const readEntryAssessments = (thisObj: TimesheetEntriesList, outputDim: Uint8Array | undefined, entryHash: Uint8Array): Promise<Assessment[]> | null => {
  if (!outputDim) return null
  return thisObj.sensemakerStore.getAssessmentForResource({
    resource_eh: entryHash,
    dimension_eh: outputDim,
  })
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

  // field defs for rendering the table
  @state()
  fieldDefs?: FieldDefinitions<EconomicEvent>

  constructor() {
    super()

    // inject contextual UI elements to table cells
    const defs = defaultFieldDefs(this)
    defs['_meta'] = new FieldDefinition<EconomicEvent>({
      heading: '',
      synthesizer: (data: EconomicEvent) => data,
      decorator: (data: EconomicEvent) => {
        const onVerify = this.handleAssessment.bind(this, "verify", data.id)
        const onFlag = this.handleAssessment.bind(this, "followup", data.id)

        const nodeHash = encodeHashToBase64(deserializeId(data.id)[1])
        const verifiedDim = this.entryTotals ? (this.entryTotals.verify.get(nodeHash) || []) : []
        const numVerified = verifiedDim.length ? (verifiedDim[verifiedDim.length - 1].value as RangeValueInteger).Integer : 0
        const flaggedDim = this.entryTotals ? (this.entryTotals.followup.get(nodeHash) || []) : []
        const numFlagged = flaggedDim.length ? (flaggedDim[flaggedDim.length - 1].value as RangeValueInteger).Integer : 0

        return html`
          <span part="row-meta">${numVerified ? html`<sl-icon name="check-lg"></sl-icon> (${numVerified})` : null}</span>
          <span part="row-meta">${numFlagged ? html`<sl-icon name="flag"></sl-icon> (${numFlagged})` : null}</span>
          <sl-dropdown>
            <sl-button slot="trigger"><sl-icon name="three-dots"></sl-icon></sl-button>
            <sl-menu>
              <sl-menu-item @click=${() => this.onEditEvent(data)}>
                <sl-icon name="pencil"></sl-icon> edit
              </sl-menu-item>
              <sl-menu-item @click=${onVerify}>
                <sl-icon name="check2-circle"></sl-icon> verify
              </sl-menu-item>
              <sl-menu-item @click=${onFlag}>
                <sl-icon name="flag"></sl-icon> flag
              </sl-menu-item>
            </sl-menu>
          </sl-dropdown>
        `
      },
    })
    this.fieldDefs = defs
  }

  async updated(changedProperties: PropertyValues<this>) {
    // rebind relevant sensemakerStore observables when the store instance is assigned
    if (changedProperties.has("sensemakerStore") && this.sensemakerStore) {
      this.appletConfig = new StoreSubscriber(this, this.sensemakerStore.appletConfig.bind(this.sensemakerStore), undefined, "appletConfig")
      this.resourceAssessments = new StoreSubscriber(this, this.sensemakerStore.resourceAssessments.bind(this.sensemakerStore), undefined, "resourceAssessments")
      this.contextResults = new StoreSubscriber(this, this.sensemakerStore.contextResults.bind(this.sensemakerStore), undefined, "contextResults")
    }
  }

  async fetchAssessments(e: CustomEvent) {
    const awaitValue = async ([k, vP]: [string, Promise<Assessment[]>]) => [k, await vP]

    const availableRecords = (e.detail.data as EconomicEventConnection).edges.map(({ node }) => deserializeId(node.id)[1])
    const pendingTotals = availableRecords.reduce(
      readComputedEntryTotals(this),
      { verify: new Map(), followup: new Map() },
    )

    this.entryTotals = {
      verify: new Map(await Promise.all(Array.from(pendingTotals.verify, awaitValue)) as [string, Assessment[]][]),
      followup: new Map(await Promise.all(Array.from(pendingTotals.followup, awaitValue)) as [string, Assessment[]][]),
    }
  }

  async handleAssessment(dimensionId: string, eventId: string) {
    if (!this.appletConfig || !this.appletConfig.value) return
    const appletConfig = this.appletConfig.value

    const eventHash = deserializeId(eventId)[1]

    // :TODO: add ability to toggle by updating previous value?
    try {
      // create the assessment; does not immediately update the Sensemaker outputs
      await this.sensemakerStore.createAssessment({
        value: { Integer: 1 },
        dimension_eh: appletConfig.dimensions[dimensionId],
        subject_eh: eventHash,
        maybe_input_dataSet: null,
      })

      // update associated 'total' method result in component state
      const dim = dimensionId as keyof EntryTotals
      const updatedDim = this.entryTotals ? new Map(this.entryTotals[dim]) : new Map()
      await this.sensemakerStore.runMethod({
        resource_eh: eventHash,
        method_eh: appletConfig.methods[`total_${dimensionId}_method`],
      })
      updatedDim.set(encodeHashToBase64(eventHash), await this.sensemakerStore.getAssessmentForResource({
        resource_eh: eventHash,
        dimension_eh: appletConfig.dimensions[`total_${dimensionId}`],
      }))
      this.entryTotals = {
        ...this.entryTotals,
        [dim]: updatedDim,
      } as EntryTotals
    } catch (e) {
      this.error = e as Error
    }
  }

  async setViewContext(c: string | null) {
    this.viewContext = c
    // refresh the computation context when view is changed
    this.computeContext(c)
  }

  async computeContext(c: string | null) {
    if (!this.appletConfig) return
    const appletConfig = this.appletConfig.value
    if (c && !appletConfig.cultural_contexts[c]) return

    // :TODO: this should probably come from the API rather than currently active
    // paginated set, since some filtering may occur in the context change.
    const economicEventHashes = this.list.entries?.data?.economicEvents?.edges.map(({ node }) => deserializeId(node.id)[1])

    if (c) {
      const contextResultInput: ComputeContextInput = {
        resource_ehs: economicEventHashes || [],
        context_eh: appletConfig.cultural_contexts[c],
        can_publish_result: false,
      }
      try {
        await this.sensemakerStore.computeContext(c, contextResultInput)
      } catch (e) {
        this.error = e as Error
      }
    }
  }

  onEditEvent(evt: EconomicEvent) {
    console.log('edit', evt)
  }

  render() {
    if (this.error) {
      return html`
        <error-display .error=${this.error}>
          <p slot="message">Problem loading Sensemaker data. Please try again.</p>
        </error-display>
      `
    }

    const assessments = this.resourceAssessments?.value
    const contextHashes = (
      this.viewContext &&
      this.contextResults?.value &&
      this.contextResults?.value[this.viewContext]
    ) ? this.contextResults?.value[this.viewContext].map(encodeHashToBase64) : undefined

    return html`
      <ul class="view-controls">
        <li><button @click=${() => this.setViewContext(null)}>View all</button></li>
        <li><button @click=${() => this.setViewContext('most_verified_work')}>Most verified</button></li>
        <li><button @click=${() => this.setViewContext('unverified_work')}>Unverified</button></li>
        <li><button @click=${() => this.setViewContext('followup_needed')}>Followup needed</button></li>
        <li><button @click=${() => this.setViewContext('no_followup_needed')}>No followup needed</button></li>
      </ul>
      <vf-timesheet-entries-list
        id="entries-list"
        @economicEventsLoaded=${this.fetchAssessments}
        .fieldDefs=${this.fieldDefs}
        .entryReducer=${combineSensemakerData(contextHashes, assessments)}
      >
      </vf-timesheet-entries-list>
    `
  }

  static get elementDefinitions() {
    return {
      'error-display': ErrorDisplay,
      'vf-timesheet-entries-list': TimesheetEntriesListBase,
      'sl-menu': SlMenu,
      'sl-menu-item': SlMenuItem,
      'sl-dropdown': SlDropDown,
    };
  }

  static styles = css`
    .view-controls button {
      clear: left;
      display: inline-block;
    }

    vf-timesheet-entries-list::part(row-meta) {
      font-size: 0.8em;
      clear: left;
    }
  `
}
