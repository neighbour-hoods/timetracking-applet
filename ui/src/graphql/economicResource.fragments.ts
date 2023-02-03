import { gql } from 'graphql-tag'

import { QUANTITY_VALUE_FIELDS } from './quantityValue.fragments'

export const WORK_RESOURCE_FIELDS = gql`
  ${QUANTITY_VALUE_FIELDS}
  fragment WorkResourceFields on EconomicResource {
    id
    revisionId
    name
    classifiedAs
    accountingQuantity {
      ...QuantityValueFields
    }
    onhandQuantity {
      ...QuantityValueFields
    }
  }
`
