import { gql } from 'graphql-tag'

import {
  // WhoAmI, WhoAmIQueryResult, :TODO: read existing values
  AgentWithTypeResponse, AgentWithType,
} from '@valueflows/vf-graphql-holochain/queries/agent'
import { AGENT_CORE_FIELDS } from '@valueflows/vf-graphql-type-fragments/agent.fragments'

export { AgentWithTypeResponse, AgentWithType }

export interface CreatePersonResponse {
  createPerson: AgentWithTypeResponse
}

export const ProfileCreateMutation = gql`
${AGENT_CORE_FIELDS}
mutation CreatePerson($name: String!) {
  createPerson(person: { name: $name }) {
    agent {
      id
      name
    }
  }
}
`


export interface AgentAssociationResponse {
  associateMyAgent: boolean
}

export const ProfileAssociateMutation = gql`
mutation AssociateMyAgent($agentId: ID!) {
  associateMyAgent(agentId: $agentId)
}
`
