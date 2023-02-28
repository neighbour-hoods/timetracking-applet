import { gql } from 'graphql-tag'

import { ResourceSpecificationResponse } from '@valueflows/vf-graphql'
import { RESOURCE_SPECIFICATION_CORE_FIELDS } from './queries'

export interface ResourceSpecificationCreateResponse {
  createResourceSpecification: ResourceSpecificationResponse
}

export const CreateResourceSpecification = gql`
  ${RESOURCE_SPECIFICATION_CORE_FIELDS}
  mutation CreateResourceSpecification($resourceSpecification: ResourceSpecificationCreateParams!) {
    createResourceSpecification(resourceSpecification: $resourceSpecification) {
      resourceSpecification {
        ...RSpecCoreFields
      }
    }
  }
`
