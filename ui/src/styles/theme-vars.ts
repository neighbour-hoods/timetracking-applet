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
:host {
  // :DEPRECATED: Internal colour pallete from NHs styleguide
  ${NH_COLOR_PALLETE}

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

  /* LitElement bindings */
  --lit-element-background-color: var(--nh-applet-background-color);

  /* MaterialUI bindings */
  --mdc-theme-primary: var(--nh-applet-primary-color);
  --mdc-theme-on-primary: var(--nh-applet-primary-text-color);
}
`
