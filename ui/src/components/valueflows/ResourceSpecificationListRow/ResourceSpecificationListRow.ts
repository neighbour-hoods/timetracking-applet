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
import { ScopedElementsMixin } from "@open-wc/scoped-elements"
import { LitElement, html, css } from "lit"
import { ApolloQueryController } from '@apollo-elements/core'

import { ResourceSpecificationQuery, ResourceSpecification } from './queries'

import { LoadingMessage } from "@neighbourhoods/component-loading-message"

export class ResourceSpecificationListRow extends ScopedElementsMixin(LitElement)
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

    // :TODO: standardize components
    if (this.spec?.error) {
      return html`
        <div>
          <h1>Error!</h1>
          <p>${this.spec.error.toString()}</p>
        </div>
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

  static get scopedElements() {
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
