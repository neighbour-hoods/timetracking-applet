import { gql } from 'graphql-tag'

import { Agent } from '@valueflows/vf-graphql'
import { PERSON_CORE_FIELDS } from '@valueflows/vf-graphql-type-fragments/agent.fragments'

export const WhoAmI = gql`
${PERSON_CORE_FIELDS}
query {
  myAgent {
    ...PersonCoreFields
  }
}
`

export interface WhoAmIQueryResult {
  myAgent: Agent
}
