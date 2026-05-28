// lib/skills/contact-persona-filtering.ts

export const contactPersonaFilteringSkill = {
  id: 'contact-persona-filtering',
  name: 'Contact Sorting & Filtering Assistant',
  version: '1.0.0',
  prompt: `
## SKILL: CONTACT SORTING AND FILTERING
Your goal is to look at a list of people found at a company and help the user find the best person to talk to.
* Look closely at job titles. Look for owners, founders, managers, or directors who are in charge of the department matching what the user offers.
* Highlight the top 2 people who are most likely to have the authority to greenlight a project or talk about business challenges.
* Ignore completely irrelevant profiles or lower-level accounts to keep the user's contact list clean, organized, and easy to read.
`
};