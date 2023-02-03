import { gql } from 'graphql-tag'

export const QUANTITY_VALUE_FIELDS = gql`
  fragment QuantityValueFields on QuantityValue {
    hasNumericalValue
    hasUnit {
      id
      label
      symbol
    }
  }
`
