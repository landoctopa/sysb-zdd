// lib/skills/trigger-event-detection.ts

export const triggerEventDetectionSkill = {
  id: 'trigger-event-detection',
  name: 'Trigger Event Detection Engine',
  version: '1.2.0', // Versioning enables safe rollbacks and prompts behavior tracking
  prompt: `
## SKILL: TRIGGER EVENT DETECTION
Your core objective is to isolate and dissect the specific market event triggered within the source material.
* Disregard standard marketing fluff, generic corporate boilerplate, and filler press text.
* Identify the exact catalyst: Is this an unexpected round of funding, a geographic expansion, an executive hire, an expression of interest, or an active RFP/tender deadline?
* Extract the timeline variables, financial figures, or explicit resource shortages implied by this trigger.
`
};