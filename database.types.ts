export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ai_coach_logs: {
        Row: {
          action_payload: Json | null
          action_type: string | null
          context_data: Json | null
          context_snapshot: Json | null
          created_at: string | null
          id: string
          insight: string
          lead_id: string | null
          stage: string
        }
        Insert: {
          action_payload?: Json | null
          action_type?: string | null
          context_data?: Json | null
          context_snapshot?: Json | null
          created_at?: string | null
          id?: string
          insight: string
          lead_id?: string | null
          stage: string
        }
        Update: {
          action_payload?: Json | null
          action_type?: string | null
          context_data?: Json | null
          context_snapshot?: Json | null
          created_at?: string | null
          id?: string
          insight?: string
          lead_id?: string | null
          stage?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_coach_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      communications: {
        Row: {
          contact_id: string | null
          content: string | null
          created_at: string | null
          direction: string
          gmail_thread_id: string | null
          id: string
          lead_id: string | null
          subject: string | null
          type: string
          user_id: string | null
        }
        Insert: {
          contact_id?: string | null
          content?: string | null
          created_at?: string | null
          direction: string
          gmail_thread_id?: string | null
          id?: string
          lead_id?: string | null
          subject?: string | null
          type: string
          user_id?: string | null
        }
        Update: {
          contact_id?: string | null
          content?: string | null
          created_at?: string | null
          direction?: string
          gmail_thread_id?: string | null
          id?: string
          lead_id?: string | null
          subject?: string | null
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "communications_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communications_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          label: string | null
          lead_id: string
          linkedin_url: string | null
          name: string
          phone: string | null
          reasoning: string | null
          status: string | null
          title: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          label?: string | null
          lead_id: string
          linkedin_url?: string | null
          name: string
          phone?: string | null
          reasoning?: string | null
          status?: string | null
          title?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          label?: string | null
          lead_id?: string
          linkedin_url?: string | null
          name?: string
          phone?: string | null
          reasoning?: string | null
          status?: string | null
          title?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      feed_sources: {
        Row: {
          api_config: Json | null
          created_at: string | null
          id: string
          is_active: boolean | null
          label: string | null
          type: string | null
          url: string
          user_id: string
        }
        Insert: {
          api_config?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          label?: string | null
          type?: string | null
          url: string
          user_id?: string
        }
        Update: {
          api_config?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          label?: string | null
          type?: string | null
          url?: string
          user_id?: string
        }
        Relationships: []
      }
      interactions: {
        Row: {
          contact_id: string
          content: string | null
          created_at: string | null
          id: string
          metadata: Json | null
          type: string
          user_id: string
        }
        Insert: {
          contact_id: string
          content?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          type: string
          user_id: string
        }
        Update: {
          contact_id?: string
          content?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interactions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          ai_coach_state: Json | null
          business_justification: string | null
          company_metadata: Json | null
          company_name: string | null
          country: string | null
          created_at: string | null
          deal_timeline: string | null
          decision_maker_contact: Json | null
          decision_maker_name: string | null
          executive_summary: string | null
          hotness_score: number | null
          id: string
          lead_category: string | null
          lead_research_depth: string | null
          linkedin_url: string | null
          llm_reasoning: string | null
          proposal_draft: string | null
          proposal_generated: boolean | null
          proposal_status: string | null
          relevant_case_study: string | null
          sales_points: string[] | null
          signal_id: string | null
          status: Database["public"]["Enums"]["lead_status"] | null
          strategic_analysis: string | null
          strategic_hurdles: string | null
          title: string | null
          trigger_alignment: string | null
          user_id: string | null
          user_signal_id: string | null
        }
        Insert: {
          ai_coach_state?: Json | null
          business_justification?: string | null
          company_metadata?: Json | null
          company_name?: string | null
          country?: string | null
          created_at?: string | null
          deal_timeline?: string | null
          decision_maker_contact?: Json | null
          decision_maker_name?: string | null
          executive_summary?: string | null
          hotness_score?: number | null
          id?: string
          lead_category?: string | null
          lead_research_depth?: string | null
          linkedin_url?: string | null
          llm_reasoning?: string | null
          proposal_draft?: string | null
          proposal_generated?: boolean | null
          proposal_status?: string | null
          relevant_case_study?: string | null
          sales_points?: string[] | null
          signal_id?: string | null
          status?: Database["public"]["Enums"]["lead_status"] | null
          strategic_analysis?: string | null
          strategic_hurdles?: string | null
          title?: string | null
          trigger_alignment?: string | null
          user_id?: string | null
          user_signal_id?: string | null
        }
        Update: {
          ai_coach_state?: Json | null
          business_justification?: string | null
          company_metadata?: Json | null
          company_name?: string | null
          country?: string | null
          created_at?: string | null
          deal_timeline?: string | null
          decision_maker_contact?: Json | null
          decision_maker_name?: string | null
          executive_summary?: string | null
          hotness_score?: number | null
          id?: string
          lead_category?: string | null
          lead_research_depth?: string | null
          linkedin_url?: string | null
          llm_reasoning?: string | null
          proposal_draft?: string | null
          proposal_generated?: boolean | null
          proposal_status?: string | null
          relevant_case_study?: string | null
          sales_points?: string[] | null
          signal_id?: string | null
          status?: Database["public"]["Enums"]["lead_status"] | null
          strategic_analysis?: string | null
          strategic_hurdles?: string | null
          title?: string | null
          trigger_alignment?: string | null
          user_id?: string | null
          user_signal_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_signal_id_fkey"
            columns: ["signal_id"]
            isOneToOne: false
            referencedRelation: "raw_signals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_user_signal_id_fkey"
            columns: ["user_signal_id"]
            isOneToOne: false
            referencedRelation: "user_signals"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          description: string | null
          full_name: string | null
          id: string
          ideal_customer_profile: Json | null
          is_premium: boolean | null
          lead_quota_monthly: number | null
          offerings: Json | null
          past_projects: Json | null
          sync_frequency_hours: number | null
          target_countries: string[] | null
          target_event_categories: string[] | null
          target_sectors: string[] | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          description?: string | null
          full_name?: string | null
          id: string
          ideal_customer_profile?: Json | null
          is_premium?: boolean | null
          lead_quota_monthly?: number | null
          offerings?: Json | null
          past_projects?: Json | null
          sync_frequency_hours?: number | null
          target_countries?: string[] | null
          target_event_categories?: string[] | null
          target_sectors?: string[] | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          description?: string | null
          full_name?: string | null
          id?: string
          ideal_customer_profile?: Json | null
          is_premium?: boolean | null
          lead_quota_monthly?: number | null
          offerings?: Json | null
          past_projects?: Json | null
          sync_frequency_hours?: number | null
          target_countries?: string[] | null
          target_event_categories?: string[] | null
          target_sectors?: string[] | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      raw_signals: {
        Row: {
          company_name: string | null
          country: string | null
          created_at: string | null
          description: string | null
          event_category:
            | Database["public"]["Enums"]["event_category_enum"]
            | null
          feed_id: string | null
          fingerprint: string | null
          id: string
          link: string | null
          metadata: Json | null
          published_at: string | null
          sectors: string[] | null
          signal_type: Database["public"]["Enums"]["signal_category"] | null
          status: string | null
          title: string | null
        }
        Insert: {
          company_name?: string | null
          country?: string | null
          created_at?: string | null
          description?: string | null
          event_category?:
            | Database["public"]["Enums"]["event_category_enum"]
            | null
          feed_id?: string | null
          fingerprint?: string | null
          id?: string
          link?: string | null
          metadata?: Json | null
          published_at?: string | null
          sectors?: string[] | null
          signal_type?: Database["public"]["Enums"]["signal_category"] | null
          status?: string | null
          title?: string | null
        }
        Update: {
          company_name?: string | null
          country?: string | null
          created_at?: string | null
          description?: string | null
          event_category?:
            | Database["public"]["Enums"]["event_category_enum"]
            | null
          feed_id?: string | null
          fingerprint?: string | null
          id?: string
          link?: string | null
          metadata?: Json | null
          published_at?: string | null
          sectors?: string[] | null
          signal_type?: Database["public"]["Enums"]["signal_category"] | null
          status?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "raw_signals_feed_id_fkey"
            columns: ["feed_id"]
            isOneToOne: false
            referencedRelation: "feed_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          created_at: string | null
          description: string | null
          due_date: string | null
          end_date: string | null
          google_calendar_event_id: string | null
          id: string
          lead_id: string | null
          status: string | null
          title: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          end_date?: string | null
          google_calendar_event_id?: string | null
          id?: string
          lead_id?: string | null
          status?: string | null
          title: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          end_date?: string | null
          google_calendar_event_id?: string | null
          id?: string
          lead_id?: string | null
          status?: string | null
          title?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      user_signals: {
        Row: {
          ai_dossier: Json | null
          company_name: string | null
          country: string | null
          created_at: string | null
          deal_timeline: string | null
          description: string | null
          event_category: string | null
          hotness_score: number | null
          id: string
          link: string | null
          match_score: number | null
          raw_signal_id: string | null
          sectors: string[] | null
          source: string | null
          status: string | null
          title: string | null
          user_id: string
        }
        Insert: {
          ai_dossier?: Json | null
          company_name?: string | null
          country?: string | null
          created_at?: string | null
          deal_timeline?: string | null
          description?: string | null
          event_category?: string | null
          hotness_score?: number | null
          id?: string
          link?: string | null
          match_score?: number | null
          raw_signal_id?: string | null
          sectors?: string[] | null
          source?: string | null
          status?: string | null
          title?: string | null
          user_id: string
        }
        Update: {
          ai_dossier?: Json | null
          company_name?: string | null
          country?: string | null
          created_at?: string | null
          deal_timeline?: string | null
          description?: string | null
          event_category?: string | null
          hotness_score?: number | null
          id?: string
          link?: string | null
          match_score?: number | null
          raw_signal_id?: string | null
          sectors?: string[] | null
          source?: string | null
          status?: string | null
          title?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_signals_raw_signal_id_fkey"
            columns: ["raw_signal_id"]
            isOneToOne: false
            referencedRelation: "raw_signals"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_old_raw_signals: { Args: never; Returns: undefined }
    }
    Enums: {
      event_category_enum:
        | "launch"
        | "funding"
        | "expansion"
        | "new_hire"
        | "rebranding"
        | "partnership"
        | "merger_acquisition"
        | "regulatory_update"
        | "company_news"
        | "events_meetups"
        | "other"
      lead_status:
        | "new"
        | "contacted"
        | "proposal"
        | "negotiation"
        | "won"
        | "lost"
      signal_category:
        | "Company News"
        | "Industry Trend"
        | "Events/Meetups"
        | "Regulatory/Government"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      event_category_enum: [
        "launch",
        "funding",
        "expansion",
        "new_hire",
        "rebranding",
        "partnership",
        "merger_acquisition",
        "regulatory_update",
        "company_news",
        "events_meetups",
        "other",
      ],
      lead_status: [
        "new",
        "contacted",
        "proposal",
        "negotiation",
        "won",
        "lost",
      ],
      signal_category: [
        "Company News",
        "Industry Trend",
        "Events/Meetups",
        "Regulatory/Government",
      ],
    },
  },
} as const
