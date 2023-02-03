import { gql } from '@apollo/client/core'

import { WORK_EVENT_FIELDS } from '../../graphql/economicEvent.fragments'
// import { WORK_RESOURCE_FIELDS } from '../../graphql/economicResource.fragments'

export const EventCreateMutation = gql`
${WORK_EVENT_FIELDS}
mutation CreateEconomicEvent($e: EconomicEventCreateParams!) {
  createEconomicEvent(event: $e) {
    economicEvent {
      ...WorkEventFields
    }
    # economicResource {
    #   ...WorkResourceFields
    # }
  }
}
`
