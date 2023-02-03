import { gql } from 'graphql-tag'

import { WORK_EVENT_FIELDS } from '@valueflows/vf-graphql-type-fragments/economicEvent.fragments'
// import { WORK_RESOURCE_FIELDS } from '@valueflows/vf-graphql-type-fragments/economicResource.fragments'

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
