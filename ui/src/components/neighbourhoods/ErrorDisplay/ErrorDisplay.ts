import { ScopedRegistryHost as ScopedElementsMixin } from "@lit-labs/scoped-registry-mixin"
import { LitElement, html, css } from "lit"
import { property } from "lit/decorators.js"

import '@shoelace-style/shoelace/dist/components/alert/alert.js'
import '@shoelace-style/shoelace/dist/components/icon/icon.js'

export class ErrorDisplay extends ScopedElementsMixin(LitElement) {
  @property()
  message!: string

  @property()
  error!: Error

  render() {
    return html`
      <section class="error">
        <sl-alert variant="danger" open>
          <sl-icon slot="icon" name="exclamation-triangle"></sl-icon>
          <slot name="message">${this.message}</slot>
          <pre>${this.error}</pre>
        </sl-alert>
      </section>
    `
  }

  // static get scopedElements() {
  //   return {
  //   }
  // }

  static styles = css`
    :host {
      min-width: 100%;
      /* min-height: 100%; */
      flex-grow: 1;
      display: flex;
      flex-direction: row;
      align-items: center;
    }
    .error {
      font-size: 1em;
      text-align: center;
      display: flex;
      flex-grow: 1;
      flex-direction: column;
      justify-content: flex-start;
    }
    .error > * {
      flex-grow: 0;
    }
    .error pre, .error p {
      margin: 0;
      word-break: normal;
    }
  `
}
