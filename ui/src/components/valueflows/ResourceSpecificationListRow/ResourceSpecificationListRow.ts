/**
 * Displays details of a `ResourceSpecification` in a format suitable for displaying as a list row.
 *
 * The specification to display can be provided directly via the `record` attribute of this
 * CustomElement, or it can be requested to load via the GraphQL API if specifying `byId`.
 *
 * :TODO: render image / avatar
 *
 * @package Neighbourhoods/We Timesheet applet
 * @since:   2023-02-20
 */

import { property } from "lit/decorators.js"
import { html, css } from "lit"
import { NHComponent } from 'neighbourhoods-design-system-components/dist/components/base'
import { ApolloQueryController } from '@apollo-elements/core'

import { ResourceSpecificationQuery, ResourceSpecification } from './queries'

import { LoadingMessage } from "@neighbourhoods/component-loading-message"
import { ErrorDisplay } from "@neighbourhoods/component-error-display"

export class ResourceSpecificationListRow extends NHComponent
{
  @property()
  byId?: string

  @property()
  record?: ResourceSpecification

  spec?: ApolloQueryController<ResourceSpecification>

  connectedCallback() {
    super.connectedCallback()

    if (this.record) {
      // data provided directly, no need to initialise query
      return
    }
    this.spec = new ApolloQueryController(this, ResourceSpecificationQuery, {
      variables: { id: this.byId },
    })
  }

  render() {
    const data = (this.record || this.spec?.data) as ResourceSpecification

    if (this.spec?.error) {
      return html`
        <error-display .error=${this.spec.error}>
          <p slot="message">Resource type failed to load.</p>
        </error-display>
      `
    }
    if (!data || this.spec?.loading) {
      return html`
        <loading-message>Loading&hellip;</loading-message>
      `
    }

    return html`
      <div class="outer">
        <h3>${data.name}</h3>
        <p>${data.note}</p>
      </div>
    `
  }

  static get elementDefinitions() {
    return {
      'loading-message': LoadingMessage,
    }
  }

  static styles = css`
    :host {
      display: inline-flex;
    }
    h3 {
      font-size: 1em;
    }
    p {
      font-size: 0.8em;
      color: var(--nh-applet-secondary-text-color);
    }
  `
}
