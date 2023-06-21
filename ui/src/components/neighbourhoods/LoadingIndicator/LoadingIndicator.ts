import { html, css } from "lit";
import { NHComponentShoelace } from 'neighbourhoods-design-system-components/dist/components/base'

import SlSpinner from '@shoelace-style/shoelace/dist/components/spinner/spinner.js';

export class LoadingIndicator extends NHComponentShoelace {

  render() {
    return html`
      <sl-spinner></sl-spinner>
    `
  }

  static elementDefinitions = {
    'sl-spinner': SlSpinner,
  }

  static styles = css`
    :host {
      --indicator-color: var(--nh-salmon);
      --track-color: var(--nh-coral);
      --track-width: 0.3em;
    }
  `
}
