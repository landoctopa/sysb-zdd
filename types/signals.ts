// types/signals.ts

export interface Stage1Dossier {
  strategic_analysis: string;
  trigger_alignment: string;
  hotness_score: number;
  estimated_sales_cycle: string;
  business_justification: string;
  hurdles: string;
  contact_qualification_guide: string;
}

export interface VirtualSignalState {
  ai_dossier: Stage1Dossier;
  tasks: {
    assess_signal_relevance: {
      completed: boolean;
      answers?: {
        relevance: 'High' | 'Medium' | 'Low';
        notes: string;
      };
    };
    extract_potential_contacts: {
      completed: boolean;
      answers?: {
        contacts_found: string;
      };
    };
  };
}