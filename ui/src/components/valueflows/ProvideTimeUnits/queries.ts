import { gql } from 'graphql-tag'

import { Unit } from '@valueflows/vf-graphql'

export const UNIT_CORE_FIELDS = gql`
  fragment UnitCoreFields on Unit {
    id
    revisionId
    label
    symbol
  }
`

export interface CoreUnitsCheckResponse {
  hours: Unit
  minutes: Unit
  seconds: Unit
}

export const HasCoreUnits = gql`
  ${UNIT_CORE_FIELDS}
  query hasCoreUnits($hours: ID!, $minutes: ID!, $seconds: ID!) {
    hours: unit(id: $hours) {
      ...UnitCoreFields
    }
    minutes: unit(id: $minutes) {
      ...UnitCoreFields
    }
    seconds: unit(id: $seconds) {
      ...UnitCoreFields
    }
  }
`
