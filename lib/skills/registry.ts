// lib/skills/registry.ts
import { Database } from '@/database.types';
import { triggerEventDetectionSkill } from './trigger-event-detection';
import { idealCustomerProfileMatchingSkill } from './ideal-customer-profile-matching';

// Define explicit types for incoming data constraints
interface SignalPromptContext {
  profile: Database['public']['Tables']['profiles']['Row'];
  rawSignal: Database['public']['Tables']['raw_signals']['Row'];
}

// Ensure every imported skill module satisfies the precise contract rules
interface IrisSkillModule {
  id: string;
  name: string;
  version: string;
  prompt: string;
}

const skillsRegistry: Record<string, IrisSkillModule> = {
  'trigger-event-detection': triggerEventDetectionSkill,
  'ideal-customer-profile-matching': idealCustomerProfileMatchingSkill
};

/**
 * Consumes modular configurations and constructs the absolute master system blueprint
 */
export function buildSignalAnalysisPrompt(requestedSkills: string[], context: SignalPromptContext): string {
  // Pull, verify, and stitch together requested string modules
  const activeSkillsPrompt = requestedSkills
    .map(skillId => {
      const skillModule = skillsRegistry[skillId];
      if (!skillModule) return ``;
      
      // We can inject a markdown comment tracking which exact version compiled into this run
      return `\n${skillModule.prompt}`;
    })
    .join('\n');

  const { profile, rawSignal } = context;

  return `
You are a Senior Strategic Analyst for ${profile.full_name || 'Our Company'}.

# USER BUSINESS PROFILE
- Description: ${profile.description || 'Not provided'}
- Specific Offerings: ${JSON.stringify(profile.offerings || {})}
- Relevant Track Record: ${JSON.stringify(profile.past_projects || {})}
- Ideal Customer Alignment: ${JSON.stringify(profile.ideal_customer_profile || {})}

# THE INSTANT OPPORTUNITY TRIGGER
- Company: ${rawSignal.company_name || 'Unknown'}
- News Event/Trigger: "${rawSignal.title || 'Untitled Signal'}"
- Context/Description: "${rawSignal.description || 'No description provided'}"
- Event Category: ${rawSignal.event_category || 'other'}

# ACTIVATED SKILLSETS
${activeSkillsPrompt}

# FINAL OUTPUT INSTRUCTIONS
Analyze the opportunity trigger using the activated skillsets above.
Provide an internal strategic briefing in JSON format with these exact keys:
- "strategic_analysis": string
- "trigger_alignment": string
- "hotness_score": integer (1-100)
- "estimated_sales_cycle": string (e.g., "3-5 Months")
- "business_justification": string
- "hurdles": string
- "contact_qualification_guide": string

Output ONLY valid JSON.
`;
}