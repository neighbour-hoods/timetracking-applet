import { gql } from '@apollo/client/core'

import { AGENT_CORE_FIELDS } from '../../graphql/agent.fragments'

export const WhoAmI = gql`
${AGENT_CORE_FIELDS}
query {
  myAgent {
    ...AgentCoreFields
  }
}
`
