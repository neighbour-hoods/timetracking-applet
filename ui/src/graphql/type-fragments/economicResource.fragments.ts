import { gql } from 'graphql-tag'

export const WORK_RESOURCE_FIELDS = gql`
  fragment WorkResourceFields on EconomicResource {
    id
    revisionId
    name
    classifiedAs
    accountingQuantity {
      hasNumericalValue
      hasUnit {
        id
        label
        symbol
      }
    }
    onhandQuantity {
      hasNumericalValue
      hasUnit {
        id
        label
        symbol
      }
    }
  }
`
