// lib/skills/ideal-customer-profile-matching.ts

export const idealCustomerProfileMatchingSkill = {
  id: 'ideal-customer-profile-matching',
  name: 'ICP Value Fit Computer',
  version: '1.0.4',
  prompt: `
## SKILL: IDEAL CUSTOMER PROFILE MATCHING
Your core objective is to compute the definitive B2B alignment score between the target company and the user's profile.
* Critically evaluate the target company's industry sector and size against the user's "Ideal Customer Profile" constraints.
* Cross-reference the target company's current business pain points with the user's "Specific Offerings" and "Past Projects" to find overlapping value.
* Be highly realistic: If the trigger event doesn't present an active, addressable problem that the user's offerings can solve, lower the alignment metrics accordingly.
`
};