/**
 * Utility component to ensure that core OM time units (hours, minutes & seconds) are
 * registered for use within the local collaboration space.
 *
 * Not recommended as a long-term measure. It is generally better to be more deliberate
 * about the management of `Unit` types within a collaboration space.
 *
 * :TODO: update to use `Unit` query API once finalised in VF & implemented in hREA

 * @package Neighbourhoods/We Timesheet applet
 * @since   2023-02-13
 */
import { ScopedRegistryHost as ScopedElementsMixin } from "@lit-labs/scoped-registry-mixin";
import { LitElement, html, PropertyValues } from "lit";
import { ApolloMutationController, ApolloQueryController } from '@apollo-elements/core'

import { LoadingMessage } from "@neighbourhoods/component-loading-message"
import { ErrorDisplay } from "@neighbourhoods/component-error-display"

import { Unit } from '@valueflows/vf-graphql'
import { HasCoreUnits, CoreUnitsCheckResponse } from './queries'
import { RegisterTimeUnits, RegisterCoreUnitsResponse } from './mutations'

// OM2 `Unit` definitions for time units. These will be propagated to all children.
const timeUnits = {
  hours: {
    label: 'hour',
    symbol: 'h',
    // description: 'The hour is a unit of time defined as 3600 second.',
    // classifiedAs: ['http://www.ontology-of-units-of-measure.org/resource/om-2/hour'],
  },
  minutes: {
    label: 'minute',
    symbol: 'min',
    // description: 'The minute (time) is a unit of time defined as 60 second.',
    // classifiedAs: ['http://www.ontology-of-units-of-measure.org/resource/om-2/minute-Time'],
  },
  seconds: {
    label: 'second',
    symbol: 's',
    // description: 'The second is a unit of time defined as the duration of 9 192 631 770 periods of the radiation corresponding to the transition between the two hyperfine levels of the ground state of the cesium 133 atom.',
    // classifiedAs: ['http://www.ontology-of-units-of-measure.org/resource/om-2/second-Time'],
  },
}

function hasEmptyUnits(qry?: ApolloQueryController<CoreUnitsCheckResponse>) {
  return (
    qry?.error &&
    qry.error.name === 'ApolloError' &&
    qry.error.graphQLErrors.length === 1 &&
    qry.error.graphQLErrors[0].message.match('No index found at address')
  ) || (!qry?.loading && !qry?.data)
}

export interface ITimeUnits {
  hours: Unit,
  minutes: Unit,
  seconds: Unit,
}

const coreUnitsQueryVars = {
  // :TODO: update to use query API
  hours: 'h',
  minutes: 'min',
  seconds: 's',
}

export class ProvideTimeUnits extends ScopedElementsMixin(LitElement)
{
  private slottedChildren: HTMLElement[] = []

  _initialisedUnitRecords = false

  units: ApolloQueryController<CoreUnitsCheckResponse> = new ApolloQueryController(this, HasCoreUnits, {
    variables: coreUnitsQueryVars,
  })

  registerUnits: ApolloMutationController<RegisterCoreUnitsResponse> = new ApolloMutationController(this, RegisterTimeUnits, {
    // refresh `units` read query when write request completes
    update: (cache, { data }) => {
      cache.writeQuery({
        query: HasCoreUnits,
        variables: coreUnitsQueryVars,
        data: {
          hours: data?.hours.unit,
          minutes: data?.minutes.unit,
          seconds: data?.seconds.unit,
        },
      })
      this.units.subscribe({ fetchPolicy: 'cache-only' })
    },
  })

  /// Propagate updates to `units` from API to `timeUnitDefs` property of any new children when inserted
  // @ts-ignore
  handleSlotchange(e) {
    const childNodes = e.target.assignedNodes({ flatten: true })
    childNodes.forEach((node: Element & { timeUnitDefs?: ITimeUnits }) => {
      node.timeUnitDefs = this.units.loading ? undefined : this.units.data as ITimeUnits
    })

    this.slottedChildren = childNodes
  }

  async updated(changedProperties: Map<string, any>) {
    // If `units` query returns empty, send initialisation mutation
    const noUnits = hasEmptyUnits(this.units)
    if (noUnits && !this._initialisedUnitRecords) {
      this._initialisedUnitRecords = true
      await this.initialiseUnitRecords()
    }

    /// Propagate updates to `units` from API to `timeUnitDefs` property of any currently rendered children
    if (this.slottedChildren.length && changedProperties.has('data') && changedProperties.get('data') !== this.units?.data) {
      this.slottedChildren.forEach((node: Element & { timeUnitDefs?: ITimeUnits }) => {
        node.timeUnitDefs = this.units.data as ITimeUnits
      })
    }
  }

  async initialiseUnitRecords(): Promise<RegisterCoreUnitsResponse> {
    const resp = ((await this.registerUnits.mutate({
      variables: timeUnits,
    })) as { data: RegisterCoreUnitsResponse }).data || {}
    return resp
  }

  render() {
    if (!hasEmptyUnits(this.units) && this.units.error) {
      return html`
        <error-display .error=${this.units.error}>
          <p slot="message">
            <strong>Problem loading measurement data.</strong><br />
            Please try again.
          </p>
        </error-display>
      `
    }

    return html`<slot @slotchange=${this.handleSlotchange} .timeUnitDefs=${this.units.loading ? undefined : this.units?.data}></slot>`
  }

  static get elementDefinitions() {
    return {
      'error-display': ErrorDisplay,
      'loading-message': LoadingMessage,
    }
  }
}
