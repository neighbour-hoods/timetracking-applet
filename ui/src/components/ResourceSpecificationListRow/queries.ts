import { gql } from 'graphql-tag'

import { ResourceSpecification } from '@valueflows/vf-graphql'
import { RESOURCE_SPECIFICATION_CORE_FIELDS } from '@valueflows/vf-graphql-type-fragments/resourceSpecification.fragments'

export { ResourceSpecification }

export const ResourceSpecificationQuery = gql`
  ${RESOURCE_SPECIFICATION_CORE_FIELDS}
  query($id: ID!) {
    resourceSpecification(id: $id) {
      ...ResourceSpecificationCore
    }
  }
`
