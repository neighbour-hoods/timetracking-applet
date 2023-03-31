import { ScopedRegistryHost as ScopedElementsMixin } from "@lit-labs/scoped-registry-mixin"
import { LitElement, html, css } from "lit"
import { property } from "lit/decorators.js"

import { LoadingIndicator } from '@neighbourhoods/component-loading-indicator'

export class LoadingMessage extends ScopedElementsMixin(LitElement) {
  render() {
    return html`
      <section class="loading">
        <loading-indicator></loading-indicator>
        <p><slot></slot></p>
      </section>
    `
  }

  static get scopedElements() {
    return {
      'loading-indicator': LoadingIndicator,
    }
  }

  static styles = css`
    :host {
      min-width: 100%;
      min-height: 100%;
      flex-grow: 1;
      display: flex;
      flex-direction: row;
      align-items: center;
    }
    .loading {
      font-size: 1em;
      text-align: center;
      display: flex;
      flex-grow: 1;
      flex-direction: column;
      justify-content: flex-start;
    }
    .loading > * {
      flex-grow: 0;
    }
    loading-indicator {
      font-size: 3em;
    }
  `
}
