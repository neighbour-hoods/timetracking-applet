/**
 * Check for the existence of a valid profile for the currently active agent
 * and conditionally render child slots based on validity.
 */
import { LitElement, html, css } from 'lit';
import { property } from 'lit/decorators.js';
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import { ApolloQueryController } from '@apollo-elements/core'
import { ApolloClient, NormalizedCacheObject } from '@apollo/client/core'

import { WhoAmI, WhoAmIQueryResult } from '@valueflows/vf-graphql-shared-queries'

import { CircularProgress } from '@scoped-elements/material-web'

function isEmptyProfile(me ?: ApolloQueryController<WhoAmIQueryResult>) {
  return (
    me?.error &&
    me.error.name === 'ApolloError' &&
    me.error.graphQLErrors.length === 1 &&
    me.error.graphQLErrors[0].message.match('No Agent data is associated with the currently authenticated user')
  ) || (!me?.loading && !me?.data)
}

export class AgentProfileCheck extends ScopedElementsMixin(LitElement) {
  // :NOTE: contextProvided has no effect here, is pulled from window.__APOLLO_CLIENT__ and assigned by Apollo controllers.
  //        @see https://github.com/lit/lit/issues/2446#issuecomment-1408143222
  // @contextProvided({ context: hreaGraphQLContext, subscribe: true })
  @property({ attribute: false })
  client!: ApolloClient<NormalizedCacheObject>

  me: ApolloQueryController<WhoAmIQueryResult> = new ApolloQueryController(this, WhoAmI)

  render() {
    if (this.me?.loading) {
      return html`<mwc-circular-progress indeterminate></mwc-circular-progress>`
    }

    const noProfile = isEmptyProfile(this.me)

    if (!noProfile && this.me?.error) {
      return html`
        <div class="err">
          <h3>Error!</h3>
          <p>${this.me.error}</p>
        </div>
      `
    }

    if (noProfile) {
      return html`<slot name="profile-missing"></slot>`
    }

    const profile = this.me?.data as WhoAmIQueryResult

    return html`<slot name="profile-ok" myAgent=${profile.myAgent}></slot>`;
  }

  static styles = css`
    .err {
      h3 {
        color: var(--nh-applet-error-color)
      }
    }
  `

  static get scopedElements() {
    return {
      'mwc-circular-progress': CircularProgress,
    }
  }
}
