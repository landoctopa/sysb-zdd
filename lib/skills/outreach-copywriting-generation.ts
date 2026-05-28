// lib/skills/outreach-copywriting-generation.ts

export const outreachCopywritingGenerationSkill = {
  id: 'outreach-copywriting-generation',
  name: 'Outreach Note Copywriter',
  version: '1.0.0',
  prompt: `
## SKILL: OUTREACH NOTE COPYWRITING
Your goal is to write short, warm, and friendly messages that help the user start a normal business conversation.
* Write a standard email version (under 100 words, including a clear subject line) and a short LinkedIn connection note (under 200 characters).
* Use the company's recent update or news trigger as the natural reason for reaching out. Do not write a generic sales pitch.
* Connect their news update directly to how the user's specific services can help make their day-to-day work easier or solve a current problem.
* Keep the tone light, professional, and helpful. End with a simple, friendly question instead of a high-pressure call request.
`
};