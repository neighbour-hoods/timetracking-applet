import { html, css } from "lit"
import { property } from "lit/decorators.js"
import { NHComponentShoelace } from 'neighbourhoods-design-system-components/dist/components/base'

import SlAlert from '@shoelace-style/shoelace/dist/components/alert/alert.js'
import SlIcon from '@shoelace-style/shoelace/dist/components/icon/icon.js'

export class ErrorDisplay extends NHComponentShoelace {
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

  static elementDefinitions = {
    'sl-alert': SlAlert,
    'sl-icon': SlIcon,
  }

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
