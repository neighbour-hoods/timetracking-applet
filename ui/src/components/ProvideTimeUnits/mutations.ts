import { gql } from 'graphql-tag'

import { Unit } from '@valueflows/vf-graphql'
import { UNIT_CORE_FIELDS } from './queries'

export interface RegisterCoreUnitsResponse {
  hours: { unit: Unit }
  minutes: { unit: Unit }
  seconds: { unit: Unit }
}

export const RegisterTimeUnits = gql`
  ${UNIT_CORE_FIELDS}
  mutation CreateCoreUnits($hours: UnitCreateParams!, $minutes: UnitCreateParams!, $seconds: UnitCreateParams!) {
    hours: createUnit(unit: $hours) {
      unit {
        ...UnitCoreFields
      }
    }
    minutes: createUnit(unit: $minutes) {
      unit {
        ...UnitCoreFields
      }
    }
    seconds: createUnit(unit: $seconds) {
      unit {
        ...UnitCoreFields
      }
    }
  }
`
