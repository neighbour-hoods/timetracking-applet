import { gql } from 'graphql-tag'

import { AGENT_CORE_FIELDS } from '@valueflows/vf-graphql-type-fragments/agent.fragments'

export const WhoAmI = gql`
${AGENT_CORE_FIELDS}
query {
  myAgent {
    ...AgentCoreFields
  }
}
`
