import { gql } from '@apollo/client/core'

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
