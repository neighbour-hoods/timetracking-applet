import { css } from 'lit'

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
:host {
  ${NH_COLOR_PALLETE}

  /* Theme variables- considered the public style API */
  --nh-applet-background-color: var(--nh-white);
  --nh-timetracker-form-background-color: var(--nh-purple-light);

  /* BELOW THIS LINE IS CONSIDERED INTERNAL IMPLEMENTATION DETAILS,
     MODIFY AT YOUR PERIL! */

  /* LitElement bindings */
  --lit-element-background-color: var(--nh-applet-background-color);
}
`
