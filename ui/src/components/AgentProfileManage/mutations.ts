import { gql } from 'graphql-tag'

import { AGENT_CORE_FIELDS } from '@valueflows/vf-graphql-type-fragments/agent.fragments'

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

export const ProfileAssociateMutation = gql`
mutation AssociateMyAgent($agentId: ID!) {
  associateMyAgent(agentId: $agentId)
}
`
