import { gql } from 'graphql-tag'

import { Agent } from '@valueflows/vf-graphql'
import { AGENT_CORE_FIELDS } from '@valueflows/vf-graphql-type-fragments/agent.fragments'

export const WhoAmI = gql`
${AGENT_CORE_FIELDS}
query {
  myAgent {
    ...AgentCoreFields
  }
}
`

export interface WhoAmIQueryResult {
  myAgent: Agent
}
