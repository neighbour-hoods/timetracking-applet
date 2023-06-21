import { html, css } from "lit"
import { property } from "lit/decorators.js"
import { NHComponent } from 'neighbourhoods-design-system-components/dist/components/base'

import { LoadingIndicator } from '@neighbourhoods/component-loading-indicator'

export class LoadingMessage extends NHComponent {
  render() {
    return html`
      <section class="loading">
        <loading-indicator></loading-indicator>
        <p><slot></slot></p>
      </section>
    `
  }

  static get elementDefinitions() {
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
