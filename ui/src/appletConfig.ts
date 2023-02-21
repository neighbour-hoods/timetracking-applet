import { AppletConfigInput, ConfigCulturalContext, ConfigMethod, ConfigResourceType, ConfigThreshold, Dimension, Range } from '@neighbourhoods/sensemaker-lite-types'

export const NH_APPLET_ID = "vf_timetracker"

// --------[ RANGES ] --------

// define on/off toggle Range
const toggleRange: Range = {
  "name": "1-scale",
  "kind": { "Integer": { "min": 0, "max": 1 } }
}
// define numeric range for hourly pay rate
// (the currency this rate is relative to does not matter here)
const positiveNumberRange: Range = {
  "name": "1-scale",
  "kind": { "Float": { "min": 0, "max": Number.MAX_SAFE_INTEGER } }
}

// define output range to hold summary data of toggles
const summaryRange: Range = {
  "name": "1-scale-total",
  "kind": { "Integer": { "min": 0, "max": Number.MAX_SAFE_INTEGER } }
}


// --------[ METADATA INPUTS & OUTPUTS ] --------

// INPUT DATUM: verify work
// :TODO: how to validate this so that `EconomicEvent.provider` cannot log?
const verifyDimension: Dimension = {
  "name": "verify",
  "range": toggleRange,
  "computed": false
}

// OUTPUT DATUM: order by verified work
const totalVerifications: Dimension = {
  "name": "total_verify",
  "range": summaryRange,
  "computed": true
}


// INPUT DATUM: work entry marked for followup (whatever that may mean in your organisational context)
const followupDimension: Dimension = {
  "name": "followup",
  "range": toggleRange,
  "computed": false
}

// OUTPUT DATUM: order by followups needed
const totalFollowupsNeeded: Dimension = {
  "name": "total_followup",
  "range": summaryRange,
  "computed": true
}


// INPUT DATUM: hourly pay rate for work
const payRateDimension: Dimension = {
  "name": "hourly_rate",
  "range": positiveNumberRange,
  "computed": false
}

// INPUT DATUM: hours worked
// :TODO: Figure out how to programatically assign this from `EconomicEvent` fields in a generic way.
//        Suspicion is the UI would pass this and it'd be a "non-computed" dim from the perspective of the Sensemaker.
// const hoursWorkedDimension: Dimension = {
//   "name": "hours_worked",
//   "range": positiveNumberRange,
//   "computed": false
// }

// OUTPUT DATUM: order by followups needed
// const payAmount: Dimension = {
//   "name": "pay_amount",
//   "range": summaryRange,
//   "computed": true
// }


// --------[ RESOURCE TYPES & BOUND ASSESSMENTS ] --------

const economicEventRT: ConfigResourceType = {
  "name": "economic_event",
  // :TODO: finalise
  "base_types": [{ "entry_index": 0, "zome_index": 0, "visibility": { "Public": null } }],
  "dimensions": [
    verifyDimension,
    followupDimension,
    payRateDimension,
    // hoursWorkedDimension,
  ],
}


// --------[ COMPUTATION / REDUCTION DEFINITIONS ] --------

const computeTotalVerifications: ConfigMethod = {
  "name": "total_verify_method",
  "target_resource_type": economicEventRT,
  "input_dimensions": [verifyDimension],
  "output_dimension": totalVerifications,
  "program": { "Sum": null },
  "can_compute_live": false,
  "must_publish_dataset": false
}

const computeTotalFollowups: ConfigMethod = {
  "name": "total_followup_method",
  "target_resource_type": economicEventRT,
  "input_dimensions": [followupDimension],
  "output_dimension": totalFollowupsNeeded,
  "program": { "Sum": null },
  "can_compute_live": false,
  "must_publish_dataset": false
}

// :TODO: revisit when we have more than `ProgramSum | ProgramAverage`
// const computePay: ConfigMethod = {
//   "name": "total_payment",
//   "target_resource_type": economicEventRT,
//   "input_dimensions": [payRateDimension, hoursWorkedDimension],
//   "output_dimension": payAmount,
//   "program": { "Sum": null },
//   "can_compute_live": false,
//   "must_publish_dataset": false
// }


// --------[ DATA FILTERS ] --------

const hasValues = (dimension: Dimension): ConfigThreshold => ({
  "dimension": dimension,
  "kind": { "GreaterThan": null },
  "value": { "Integer": 0 }
})
const noValues = (dimension: Dimension): ConfigThreshold => ({
  "dimension": dimension,
  "kind": { "LessThan": null, "Equal": null },
  "value": { "Integer": 0 }
})


const mostVerifiedWorkContext: ConfigCulturalContext = {
  "name": "most_verified_work",
  "resource_type": economicEventRT,
  "thresholds": [hasValues(verifyDimension)],
  "order_by": [[totalVerifications, { "Biggest": null }]]
}
const unverifiedWorkContext: ConfigCulturalContext = {
  "name": "unverified_work",
  "resource_type": economicEventRT,
  "thresholds": [noValues(verifyDimension)],
  "order_by": [[totalVerifications, { "Smallest": null }]]
}


const mostFollowupsWorkContext: ConfigCulturalContext = {
  "name": "followup_needed",
  "resource_type": economicEventRT,
  "thresholds": [hasValues(followupDimension)],
  "order_by": [[totalFollowupsNeeded, { "Biggest": null }]]
}
const nonFollowupWorkContext: ConfigCulturalContext = {
  "name": "no_followup_needed",
  "resource_type": economicEventRT,
  "thresholds": [noValues(followupDimension)],
  "order_by": [[totalFollowupsNeeded, { "Smallest": null }]]
}


// create initialisation data for Neighbourhoods Sensemaker

const appletConfig: AppletConfigInput = {
  "name": NH_APPLET_ID,
  "dimensions": [
    verifyDimension, totalVerifications,
    followupDimension, totalFollowupsNeeded,
  ],
  "resource_types": [economicEventRT],
  "methods": [
    computeTotalVerifications,
    computeTotalFollowups,
  ],
  "cultural_contexts": [
    mostVerifiedWorkContext,
    unverifiedWorkContext,
    mostFollowupsWorkContext,
    nonFollowupWorkContext,
  ],
}

export default appletConfig
