import { css, unsafeCSS } from 'lit'

import { BaseStyles, DarkStyles, ShoelaceAdapter } from '@neighbourhoods/theme-styles'

const NH_COLOR_PALLETE = css`
  /* Colour pallete variables for Neighbourhoods/We */
  /* @see https: //neighbourhoods.tech/visual-assets/ */
  --nh-purple-light: #8b94f5;
  --nh-white: #fff;
  --nh-darkgrey: #333333;
  --nh-black: #000;

  --nh-salmon: #ff6793;
  --nh-purple-mid: #8a58ff;
  --nh-green-mid: #009d0a;
  --nh-red: #dc334f;
  --nh-teal: #1bb2bb;
  --nh-coral: #ff7e7e;
  --nh-blue: #5c82ff;
  --nh-pink: #e594f5;
  --nh-mustard: #c3db00;
  --nh-green-neon: #00ffbe;
  --nh-orange: #ff9e38;
  --nh-cyan: #00dcf5;
  --nh-green-bright: #00dc76;
  --nh-purple-dark: #383cff;
`

export default css`
// Neighbourhoods core theme styles / variables
${unsafeCSS(BaseStyles)}
${unsafeCSS(DarkStyles)}
// Framework-specific Neighbourhoods style adapters
${unsafeCSS(ShoelaceAdapter)}
:root {
  // :DEPRECATED: Internal colour pallete from NHs styleguide
  ${NH_COLOR_PALLETE}
}
:host {
  /* Theme variables- considered the public style API */
  --nh-applet-background-color: var(--nh-white);
  --nh-applet-primary-color: var(--nh-salmon);
  --nh-applet-primary-text-color: var(--nh-darkgrey);

  --nh-applet-secondary-text-color: var(--nh-purple-mid);
  --nh-applet-error-color: var(--nh-red);
  --nh-applet-success-color: var(--nh-green-mid);

  --nh-timetracker-form-background-color: var(--nh-applet-background-color);

  --nh-specification-input-bg-color: var(--nh-purple-light);

  /* BELOW THIS LINE IS CONSIDERED INTERNAL IMPLEMENTATION DETAILS,
     MODIFY AT YOUR PERIL! */

  /* Shoelace bindings */
  --sl-input-help-text-color: var(--nh-applet-secondary-text-color);

  /* redeclare all Shoelace font-based metrics to EM-based units for compatibility with scaling system */
  --sl-font-size-small: 0.8em;
  --sl-font-size-medium: 1em;
  --sl-font-size-large: 1.2em;

  --sl-input-spacing-small: 0.75em;
  --sl-input-spacing-medium: 1em;
  --sl-input-spacing-large: 1.25em;
  --sl-input-font-size-small: 0.8em;
  --sl-input-font-size-medium: 1em;
  --sl-input-font-size-large: 1.2em;
  --sl-input-help-text-font-size-small: 0.75em;
  --sl-input-help-text-font-size-medium: 0.8em;
  --sl-input-help-text-font-size-large: 1em;
  --sl-input-height-small: 1.875em;
  --sl-input-height-medium: 2.5em;
  --sl-input-height-large: 3.125em;

  /* LitElement bindings */
  --lit-element-background-color: var(--nh-applet-background-color);

  /* MaterialUI bindings */
  --mdc-theme-primary: var(--nh-applet-primary-color);
  --mdc-theme-on-primary: var(--nh-applet-primary-text-color);
}
`
