/**
 * Check for the existence of a valid profile for the currently active agent
 * and conditionally render child slots based on validity.
 *
 * Child nodes may fire an `agentProfileCreated` event in order to trigger
 * a refresh of the agent profile data from the GraphQL client cache.
 * It is presumed that the cache has been updated prior to firing this event.
 */
import { html, css } from 'lit';
import { state } from 'lit/decorators.js';
import { ApolloQueryController } from '@apollo-elements/core'

import { WhoAmI, WhoAmIQueryResult } from '@valueflows/vf-graphql-shared-queries'

import { LoadingMessage } from "@neighbourhoods/component-loading-message"
import { ErrorDisplay } from "@neighbourhoods/component-error-display"
import { NHComponentShoelace } from 'neighbourhoods-design-system-components/dist/components/base'

import SlButton from '@shoelace-style/shoelace/dist/components/button/button.js'

function isEmptyProfile(me ?: ApolloQueryController<WhoAmIQueryResult>) {
  return (
    me?.error &&
    me.error.name === 'ApolloError' &&
    me.error.graphQLErrors.length === 1 &&
    me.error.graphQLErrors[0].message.match('No Agent data is associated with the currently authenticated user')
  ) || (!me?.loading && !me?.data)
}

/**
 * Refresh authenticated agent profile query results in any immediate-child
 * components when switching views.
 * This works around <slot> items being rendered immediately upon the parent
 * element being attached to the DOM, resulting in them getting query results
 * too early.
 */
//@ts-ignore
function handleSlotchange(e) {
  const childNodes = e.target.assignedNodes({ flatten: true })

  childNodes.forEach((node: Element & { me?: ApolloQueryController<WhoAmIQueryResult> }) => {
    if (node.me && node.me instanceof ApolloQueryController) {
      node.me.subscribe({ nextFetchPolicy: 'cache-only' })
    }
  })
}

export class AgentProfileCheck extends NHComponentShoelace
{
  me: ApolloQueryController<WhoAmIQueryResult> = new ApolloQueryController(this, WhoAmI)

  @state()
  skipProfileCheck: boolean = false

  render() {
    if (!this.skipProfileCheck && this.me?.loading) {
      return html`<loading-message>
        <p>Checking profile&hellip;</p>
        <p>
          Or skip this step and
          <sl-button variant="default" @click="${() => { this.skipProfileCheck = true; }}">
            create a new one
          </sl-button>
        </p>
      </loading-message>`
    }

    const noProfile = isEmptyProfile(this.me)

    if (!this.skipProfileCheck && !noProfile && this.me?.error) {
      return html`
        <error-display .error=${this.me.error}>
          <p slot="message">Problem checking profile.</p>
        </error-display>
      `
    }

    if (noProfile || (this.me?.loading && !this.me?.error)) {
      return html`<slot name="profile-missing" @slotchange=${handleSlotchange}></slot>`
    }

    return html`<slot name="profile-ok" @slotchange=${handleSlotchange}></slot>`;
  }

  static styles = css`
    .err {
      h3 {
        color: var(--nh-applet-error-color)
      }
    }
  `

  static get elementDefinitions() {
    return {
      'error-display': ErrorDisplay,
      'loading-message': LoadingMessage,
      'sl-button': SlButton,
    }
  }
}
