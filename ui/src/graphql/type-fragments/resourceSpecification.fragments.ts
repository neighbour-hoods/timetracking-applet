import { gql } from 'graphql-tag'

export const RESOURCE_SPECIFICATION_CORE_FIELDS = gql`
  fragment ResourceSpecificationCore on ResourceSpecification {
    id
    revisionId
    name
    note
    image
    resourceClassifiedAs
    defaultUnitOfResource {
      id
      symbol
      label
    }
    defaultUnitOfEffort {
      id
      symbol
      label
    }
  }
`
