import { gql } from 'graphql-tag'

import { ResourceSpecificationConnection, ResourceSpecificationEdge, ResourceSpecification } from '@valueflows/vf-graphql'

export { ResourceSpecificationEdge, ResourceSpecification }

export const RESOURCE_SPECIFICATION_CORE_FIELDS = gql`
  fragment RSpecCoreFields on ResourceSpecification {
    id
    revisionId
    name
    note
    image
    resourceClassifiedAs
  }
`

export interface ResourceSpecificationsResponse {
  resourceSpecifications: ResourceSpecificationConnection
}

export const ReadAllResourceSpecifications = gql`
  ${RESOURCE_SPECIFICATION_CORE_FIELDS}
  query {
    resourceSpecifications(last: 100000) {
      edges {
        cursor
        node {
          ...RSpecCoreFields
        }
      }
    }
  }
`
