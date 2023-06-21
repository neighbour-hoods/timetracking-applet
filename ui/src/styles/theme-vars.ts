import { css, unsafeCSS } from 'lit'

import { BaseStyles, DarkStyles, ShoelaceAdapter } from '@neighbourhoods/theme-styles'

// :DUPE: https://github.com/nick-stebbings/neighbourhoods-design-system-components/blob/main/dist/styles/css/design-adapter.css
const NHBaseStyles = css`
:host {
  --nh-spacing-sm: 8;
  --nh-theme-bg-canvas: #18151b;
  --nh-theme-fg-default: #FFFFFF;
  --nh-theme-bg-surface: #3D3443;
  --nh-radii-lg: 18;
  --nh-spacing-lg: 16;
  --nh-spacing-xs: 4;
  --nh-font-weights-body-bold: 700;
  --nh-line-heights-body-default: 27px;
  --nh-radii-base: 6;
  --nh-theme-menu-sub-title: #A89CB0;
  --nh-theme-accent-muted: #6e46cc;
  --nh-theme-bg-subtle: #312a36;
  --nh-theme-bg-subtle-50: rgba(61,52,67,0.3);
  --nh-theme-bg-muted: #645d69;
  --nh-font-families-body: 'Work Sans', Manrope, sans-serif;
  --nh-font-families-headlines: 'Open Sans', Manrope, sans-serif;
  --nh-font-size-xs: 11;
  --nh-spacing-md: 12;
  --nh-colors-eggplant-950: #0c0a0d;
  --nh-font-size-sm: 13;
  --nh-font-weights-body-regular: 400;
  --nh-spacing-xxs: 2;
  --nh-spacing-2xl: 24;

  // :TODO: not in NH theme as yet, needs integrating
  --nh-red: #dc334f;
  --nh-green-mid: #009d0a;
  --nh-purple-light: #8b94f5;
}`

export default css`
// Neighbourhoods core theme styles / variables
${unsafeCSS(BaseStyles)}
${unsafeCSS(DarkStyles)}
// Framework-specific Neighbourhoods style adapters
${unsafeCSS(ShoelaceAdapter)}
${NHBaseStyles}
:host {
  /* Theme variables- considered the public style API */
  --nh-applet-background-color: var(--nh-theme-bg-canvas);
  --nh-applet-primary-color: var(--nh-theme-accent-muted);
  --nh-applet-primary-text-color: var(--nh-theme-fg-default);

  --nh-applet-secondary-text-color: var(--nh-theme-fg-default);
  --nh-applet-error-color: var(--nh-red);
  --nh-applet-success-color: var(--nh-green-mid);

  --nh-timetracker-form-background-color: var(--nh-applet-background-color);

  --nh-specification-input-bg-color: var(--nh-purple-light);

  /* BELOW THIS LINE IS CONSIDERED INTERNAL IMPLEMENTATION DETAILS,
     MODIFY AT YOUR PERIL! */

  /* Shoelace bindings */
  --sl-input-help-text-color: var(--nh-theme-menu-sub-title);

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
