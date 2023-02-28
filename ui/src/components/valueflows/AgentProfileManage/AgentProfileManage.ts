/**
 * Manage an agent profile
 *
 * :TODO: handle unexpected errors from read API
 * :TODO: add other profile metadata fields
 * :TODO: decide whether this control should also handle edits, and edits to other profiles
 */
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import { LitElement, html, css } from "lit";
import { ApolloMutationController } from '@apollo-elements/core'

import { Button, TextField } from '@scoped-elements/material-web'

import { WhoAmI } from '@valueflows/vf-graphql-shared-queries'
import {
  ProfileCreateMutation, ProfileAssociateMutation,
  CreatePersonResponse, AgentAssociationResponse,
  AgentWithTypeResponse, AgentWithType,
} from "./mutations"

// a temporary initialiser for the agent's name so that testing is more streamlined
// :TODO: this should probably be replaced with Holochain Profiles integration someday
const DEFAULT_PROFILE_NAME = `Test Agent ${(Math.random() * 9e6).toString(36)}`

export class AgentProfileManage extends ScopedElementsMixin(LitElement)
{
  createProfile: ApolloMutationController<CreatePersonResponse> = new ApolloMutationController(this, ProfileCreateMutation)

  associateProfile: ApolloMutationController<AgentAssociationResponse> = new ApolloMutationController(this, ProfileAssociateMutation, {
    update: (cache, _result) => {
      cache.writeQuery({
        query: WhoAmI,
        data: { myAgent: this.createProfile.data?.createPerson?.agent },
        overwrite: true,
      })
    }
  })

  // a temporary initialiser for the agent's name so that testing is more streamlined
  // :TODO: this should probably be replaced with Holochain Profiles integration someday
  profileName: string = DEFAULT_PROFILE_NAME

  render() {
    return html`
      <section class="agent-profile">
        Enter your name:
        <mwc-textfield value=${DEFAULT_PROFILE_NAME} @change=${this.onProfileNameChanged}></mwc-textfield>
        <mwc-button @click=${this.handleSubmission}>Create profile</mwc-button>
      </section>
    `
  }

  onProfileNameChanged(event: KeyboardEvent) {
    // @ts-ignore
    this.profileName = event.target?.value
  }

  async handleSubmission() {
    const agent = await this.saveProfile(this.profileName)
    if (agent) {  // :TODO: check should not be necessary- `saveProfile` should throw errors to be displayed to component
      this.dispatchEvent(new CustomEvent<AgentWithTypeResponse>('agentProfileCreated', {
        detail: { agent } as AgentWithTypeResponse,
        bubbles: true,
        composed: true,
      }))
    }
  }

  async saveProfile(name: string): Promise<AgentWithType | null> {
    const me: AgentWithTypeResponse = ((await this.createProfile.mutate({
      variables: {
        name,
        // :TODO: image, note, primaryLocation
      },
    })) as { data: CreatePersonResponse }).data?.createPerson

    const associated: boolean = ((await this.associateProfile.mutate({
      variables: {
        agentId: me.agent.id,
      },
    })) as { data: AgentAssociationResponse }).data?.associateMyAgent

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
