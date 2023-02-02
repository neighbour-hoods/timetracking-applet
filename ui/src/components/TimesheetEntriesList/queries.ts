import { gql } from '@apollo/client/core'

import { WORK_EVENT_FIELDS } from '../../graphql/economicEvent.fragments'

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
