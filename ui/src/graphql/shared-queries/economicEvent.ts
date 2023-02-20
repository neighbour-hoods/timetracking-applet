import { gql } from 'graphql-tag'

import { EconomicEventConnection } from '@valueflows/vf-graphql'
import { WORK_EVENT_FIELDS } from '@valueflows/vf-graphql-type-fragments/economicEvent.fragments'

export const EventsListQuery = gql`
${WORK_EVENT_FIELDS}
query {
  economicEvents(last: 10) {
    pageInfo {
      startCursor
      endCursor
    }
    edges {
      cursor

      # Requires \`hrea_observation\` module.
      node {
        ...WorkEventFields
      }
    }
  }
}
`

export interface EventsListQueryResult {
  economicEvents: EconomicEventConnection
}
