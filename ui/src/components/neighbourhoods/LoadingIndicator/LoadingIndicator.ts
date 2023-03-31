import { ScopedRegistryHost as ScopedElementsMixin } from "@lit-labs/scoped-registry-mixin";
import { LitElement, html, css } from "lit";

import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';

export class LoadingIndicator extends ScopedElementsMixin(LitElement) {

  render() {
    return html`
      <sl-spinner></sl-spinner>
    `
  }

  // static get scopedElements() {
  //   return {
  //   }
  // }

  static styles = css`
    :host {
      --indicator-color: var(--nh-salmon);
      --track-color: var(--nh-coral);
      --track-width: 0.3em;
    }
  `
}
