// lib/skills/contact-persona-filtering.ts

export const contactPersonaFilteringSkill = {
  id: 'contact-persona-filtering',
  name: 'Contact Sorting & Filtering Assistant',
  version: '1.0.0',
  prompt: `
## SKILL: CONTACT SORTING AND FILTERING
Your goal is to evaluate a list of people found at a company and organize them by outreach priority.
* Review job roles closely. Look for owners, founders, managers, or directors handling operations, marketing, branding, or technology.
* Rank the people in order of who is best to talk to first (#1 Priority, #2 Priority).
* Provide a direct, plain-English reason why they are ranked there, along with a specific approach strategy tailored to their role.

You must return a JSON object with a single key "prioritized_people" containing an array structured exactly like this:
{
  "prioritized_people": [
    {
      "contact_id": "string (the person's id variable passed in context)",
      "contact_name": "string (person's full name)",
      "priority": number (1 for top focus, 2 for secondary focus),
      "justification": "string (simple, plain-English reason why they are a key target)",
      "approach_strategy": "string (simple advice on what topic or pain point to mention)"
    }
  ]
}
`
};