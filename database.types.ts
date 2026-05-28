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
      actions: {
        Row: {
          body: string | null
          channel: Database["public"]["Enums"]["action_channel"]
          completed_at: string | null
          contact_id: string | null
          created_at: string
          due_date: string | null
          id: string
          iris_tip: string | null
          lead_id: string
          metadata: Json
          required: boolean
          stage: Database["public"]["Enums"]["lead_status"]
          status: Database["public"]["Enums"]["action_status"]
          title: string
          type: Database["public"]["Enums"]["action_type"]
          updated_at: string
        }
        Insert: {
          body?: string | null
          channel: Database["public"]["Enums"]["action_channel"]
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          iris_tip?: string | null
          lead_id: string
          metadata?: Json
          required?: boolean
          stage: Database["public"]["Enums"]["lead_status"]
          status?: Database["public"]["Enums"]["action_status"]
          title: string
          type: Database["public"]["Enums"]["action_type"]
          updated_at?: string
        }
        Update: {
          body?: string | null
          channel?: Database["public"]["Enums"]["action_channel"]
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          iris_tip?: string | null
          lead_id?: string
          metadata?: Json
          required?: boolean
          stage?: Database["public"]["Enums"]["lead_status"]
          status?: Database["public"]["Enums"]["action_status"]
          title?: string
          type?: Database["public"]["Enums"]["action_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "actions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_coach_logs: {
        Row: {
          created_at: string
          id: string
          lead_id: string
          message: string | null
          metadata: Json | null
          stage: string
          suggested_actions: string[] | null
          suggested_tasks: Json | null
          type: Database["public"]["Enums"]["coach_log_type"]
        }
        Insert: {
          created_at?: string
          id?: string
          lead_id: string
          message?: string | null
          metadata?: Json | null
          stage: string
          suggested_actions?: string[] | null
          suggested_tasks?: Json | null
          type: Database["public"]["Enums"]["coach_log_type"]
        }
        Update: {
          created_at?: string
          id?: string
          lead_id?: string
          message?: string | null
          metadata?: Json | null
          stage?: string
          suggested_actions?: string[] | null
          suggested_tasks?: Json | null
          type?: Database["public"]["Enums"]["coach_log_type"]
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
      contacts: {
        Row: {
          created_at: string
          email: string | null
          id: string
          is_decision_maker: boolean | null
          lead_id: string
          linkedin_url: string | null
          metadata: Json | null
          name: string
          notes: string | null
          phone: string | null
          role: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          is_decision_maker?: boolean | null
          lead_id: string
          linkedin_url?: string | null
          metadata?: Json | null
          name: string
          notes?: string | null
          phone?: string | null
          role?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          is_decision_maker?: boolean | null
          lead_id?: string
          linkedin_url?: string | null
          metadata?: Json | null
          name?: string
          notes?: string | null
          phone?: string | null
          role?: string | null
          status?: string | null
          updated_at?: string
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
      dismissed_signals: {
        Row: {
          created_at: string
          id: string
          raw_signal_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          raw_signal_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          raw_signal_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dismissed_signals_raw_signal_id_fkey"
            columns: ["raw_signal_id"]
            isOneToOne: false
            referencedRelation: "raw_signals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dismissed_signals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
        Relationships: []
      }
      leads: {
        Row: {
          ai_coach_state: Json
          business_justification: string | null
          company_details: Json | null
          company_name: string | null
          country: string | null
          created_at: string
          deal_timeline: string | null
          hotness_score: number | null
          id: string
          industry: string | null
          linkedin_url: string | null
          raw_signal_id: string | null
          status: string
          strategic_analysis: string | null
          strategic_hurdles: string | null
          trigger_alignment: string | null
          updated_at: string
          user_id: string
          website: string | null
        }
        Insert: {
          ai_coach_state?: Json
          business_justification?: string | null
          company_details?: Json | null
          company_name?: string | null
          country?: string | null
          created_at?: string
          deal_timeline?: string | null
          hotness_score?: number | null
          id?: string
          industry?: string | null
          linkedin_url?: string | null
          raw_signal_id?: string | null
          status?: string
          strategic_analysis?: string | null
          strategic_hurdles?: string | null
          trigger_alignment?: string | null
          updated_at?: string
          user_id: string
          website?: string | null
        }
        Update: {
          ai_coach_state?: Json
          business_justification?: string | null
          company_details?: Json | null
          company_name?: string | null
          country?: string | null
          created_at?: string
          deal_timeline?: string | null
          hotness_score?: number | null
          id?: string
          industry?: string | null
          linkedin_url?: string | null
          raw_signal_id?: string | null
          status?: string
          strategic_analysis?: string | null
          strategic_hurdles?: string | null
          trigger_alignment?: string | null
          updated_at?: string
          user_id?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_raw_signal_id_fkey"
            columns: ["raw_signal_id"]
            isOneToOne: false
            referencedRelation: "raw_signals"
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_old_raw_signals: { Args: never; Returns: undefined }
      jsonb_merge: { Args: { base: Json; patch: Json }; Returns: Json }
    }
    Enums: {
      action_channel:
        | "email"
        | "call"
        | "meeting"
        | "linkedin"
        | "internal"
        | "iris"
        | "auto"
        | "other"
      action_status: "pending" | "completed" | "skipped"
      action_type: "task" | "communication" | "note" | "notification"
      coach_log_type:
        | "entry"
        | "checkback"
        | "post_feedback"
        | "task_unlocked"
        | "stage_exit"
      communication_channel: "email" | "call" | "meeting" | "linkedin" | "other"
      communication_direction: "outbound" | "inbound"
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
        | "signal"
        | "potential"
        | "discovery"
        | "engaged"
        | "solution_fit"
        | "close"
        | "post_close"
      signal_category:
        | "Company News"
        | "Industry Trend"
        | "Events/Meetups"
        | "Regulatory/Government"
        | "Request for Proposal"
        | "Expression of Interest"
        | "Call for Tenders"
      task_channel:
        | "email"
        | "linkedin"
        | "phone"
        | "meeting"
        | "internal"
        | "auto"
      task_status: "pending" | "completed" | "skipped"
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
      action_channel: [
        "email",
        "call",
        "meeting",
        "linkedin",
        "internal",
        "iris",
        "auto",
        "other",
      ],
      action_status: ["pending", "completed", "skipped"],
      action_type: ["task", "communication", "note", "notification"],
      coach_log_type: [
        "entry",
        "checkback",
        "post_feedback",
        "task_unlocked",
        "stage_exit",
      ],
      communication_channel: ["email", "call", "meeting", "linkedin", "other"],
      communication_direction: ["outbound", "inbound"],
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
        "signal",
        "potential",
        "discovery",
        "engaged",
        "solution_fit",
        "close",
        "post_close",
      ],
      signal_category: [
        "Company News",
        "Industry Trend",
        "Events/Meetups",
        "Regulatory/Government",
        "Request for Proposal",
        "Expression of Interest",
        "Call for Tenders",
      ],
      task_channel: [
        "email",
        "linkedin",
        "phone",
        "meeting",
        "internal",
        "auto",
      ],
      task_status: ["pending", "completed", "skipped"],
    },
  },
} as const
