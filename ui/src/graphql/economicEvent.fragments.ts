import { gql } from '@apollo/client/core'

export const WORK_EVENT_FIELDS = gql`
  fragment WorkEventFields on EconomicEvent {
    # identifiers
    id
    revisionId

    # primary description
    note

    # when was the work done?
    hasBeginning
    hasEnd
    hasPointInTime

    # type of work being done, more freeform / ad-hoc version
    resourceClassifiedAs

    # how much work being done, specified in https://github.com/HajoRijgersberg/OM -compatible format
    effortQuantity {
      hasNumericalValue
      hasUnit {
        id
        label
        symbol
      }
    }

    # :TODO: triggeredBy & event adjustments

    # Requires \`hrea_specification\` module or a simple hardcoded shim resolver.
    # :TODO: link 'core VF Action type resolvers' package once it exists

    action {
      id
      label
    }

    # Requires \`hrea_specification\` module.

    resourceSpecifiedAs {
      id
      revisionId
      name
    }

    # Requires \`hrea_agent\` module.

    provider {
      id
      name
    }
    receiver {
      id
      name
    }
  }
`;
