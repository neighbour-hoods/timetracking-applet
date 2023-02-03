import { gql } from '@apollo/client/core'

export const AGENT_CORE_FIELDS = gql`
  fragment AgentCoreFields on Agent {
    id
    revisionId
    name
    image
    note
  }
`
