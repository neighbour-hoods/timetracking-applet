/**
 * Manage an agent profile
 *
 * :TODO: add other profile metadata fields
 * :TODO: handle unexpected errors from read API
 * :TODO: decide whether this control should also handle edits, and edits to other profiles
 */
import { query, state, property } from "lit/decorators.js";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import { LitElement, html, css } from "lit";
import { ApolloQueryController, ApolloMutationController } from '@apollo-elements/core'
import { ApolloClient, NormalizedCacheObject } from '@apollo/client/core'

import { Button, TextField } from '@scoped-elements/material-web'

import {
  // WhoAmI, WhoAmIQueryResult, :TODO: read existing values
  Agent,
 } from '@valueflows/vf-graphql-shared-queries'
import { ProfileAssociateMutation, ProfileCreateMutation } from "./mutations"

type AgentWithType = Agent & { agentType: string }
interface AgentWithTypeResponse {
  agent: AgentWithType
}

interface CreatePersonResponse {
  createPerson: AgentWithTypeResponse
}

// a temporary initialiser for the agent's name so that testing is more streamlined
// :TODO: this should probably be replaced with Holochain Profiles integration someday
const DEFAULT_PROFILE_NAME = `Test Agent ${(Math.random() * 9e6).toString(36)}`

export class AgentProfileManage extends ScopedElementsMixin(LitElement) {
  // :NOTE: contextProvided has no effect here, is pulled from window.__APOLLO_CLIENT__ and assigned by Apollo controllers.
  //        @see https://github.com/lit/lit/issues/2446#issuecomment-1408143222
  // @contextProvided({ context: hreaGraphQLContext, subscribe: true })
  @property({ attribute: false })
  client!: ApolloClient<NormalizedCacheObject>

  // me: ApolloQueryController<WhoAmIQueryResult> = new ApolloQueryController(this, WhoAmI)

  createProfile: ApolloMutationController<CreatePersonResponse> = new ApolloMutationController(this, ProfileCreateMutation)

  associateProfile: ApolloMutationController<boolean> = new ApolloMutationController(this, ProfileAssociateMutation)

  // a temporary initialiser for the agent's name so that testing is more streamlined
  // :TODO: this should probably be replaced with Holochain Profiles integration someday
  @state()
  profileName: string = DEFAULT_PROFILE_NAME

  render() {
    return html`
      <section class="agent-profile">
        Enter your name:
        <mwc-textfield value=${DEFAULT_PROFILE_NAME} @keyUp=${this.onProfileNameChanged}></mwc-textfield>
        <mwc-button @click=${this.handleSubmission}>Create profile</mwc-button>
      </section>
    `
  }

  onProfileNameChanged(event: KeyboardEvent) {
    // @ts-ignore
    this.profileName = event.target?.value
  }

  async handleSubmission() {
    await this.saveProfile(this.profileName)
  }

  async saveProfile(name: string): Promise<AgentWithType | null> {
    const me: AgentWithTypeResponse = ((await this.createProfile.mutate({
      variables: {
        name,
        // :TODO: image, note, primaryLocation
      },
    })) as { data: CreatePersonResponse }).data?.createPerson

    const associated = await this.associateProfile.mutate({
      variables: {
        agentId: me.agent.id,
      },
    })

    return associated ? me.agent : null
  }

  static get scopedElements() {
    return {
      'mwc-textfield': TextField,
      'mwc-button': Button,
    }
  }

  static styles = css`
  `
}
