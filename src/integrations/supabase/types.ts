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
      application_packs: {
        Row: {
          application_id: string | null
          cover_letter: string | null
          created_at: string
          id: string
          job_company: string | null
          job_location: string | null
          job_role: string | null
          job_url: string | null
          match_score: number | null
          matched_skills: Json | null
          missing_skills: Json | null
          raw: Json
          salary_currency: string | null
          salary_high: number | null
          salary_low: number | null
          salary_period: string | null
          tailored_cv: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          application_id?: string | null
          cover_letter?: string | null
          created_at?: string
          id?: string
          job_company?: string | null
          job_location?: string | null
          job_role?: string | null
          job_url?: string | null
          match_score?: number | null
          matched_skills?: Json | null
          missing_skills?: Json | null
          raw?: Json
          salary_currency?: string | null
          salary_high?: number | null
          salary_low?: number | null
          salary_period?: string | null
          tailored_cv?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          application_id?: string | null
          cover_letter?: string | null
          created_at?: string
          id?: string
          job_company?: string | null
          job_location?: string | null
          job_role?: string | null
          job_url?: string | null
          match_score?: number | null
          matched_skills?: Json | null
          missing_skills?: Json | null
          raw?: Json
          salary_currency?: string | null
          salary_high?: number | null
          salary_low?: number | null
          salary_period?: string | null
          tailored_cv?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_packs_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          applied_date: string | null
          company: string
          created_at: string
          follow_up_date: string | null
          id: string
          interview_date: string | null
          notes: string | null
          role: string
          status: string
          updated_at: string
          url: string | null
          user_id: string
        }
        Insert: {
          applied_date?: string | null
          company: string
          created_at?: string
          follow_up_date?: string | null
          id?: string
          interview_date?: string | null
          notes?: string | null
          role: string
          status?: string
          updated_at?: string
          url?: string | null
          user_id: string
        }
        Update: {
          applied_date?: string | null
          company?: string
          created_at?: string
          follow_up_date?: string | null
          id?: string
          interview_date?: string | null
          notes?: string | null
          role?: string
          status?: string
          updated_at?: string
          url?: string | null
          user_id?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      interview_sessions: {
        Row: {
          created_at: string
          id: string
          improvements: Json
          look_away_count: number
          question_count: number
          red_flags: Json
          role: string
          score: number
          strengths: Json
          summary: string | null
          user_id: string
          verdict: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          improvements?: Json
          look_away_count?: number
          question_count?: number
          red_flags?: Json
          role: string
          score?: number
          strengths?: Json
          summary?: string | null
          user_id: string
          verdict?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          improvements?: Json
          look_away_count?: number
          question_count?: number
          red_flags?: Json
          role?: string
          score?: number
          strengths?: Json
          summary?: string | null
          user_id?: string
          verdict?: string | null
        }
        Relationships: []
      }
      payment_events: {
        Row: {
          amount_gross: number | null
          created_at: string
          currency: string | null
          email: string | null
          id: string
          item_name: string | null
          m_payment_id: string | null
          payment_status: string
          pf_payment_id: string | null
          provider: string
          raw: Json
          user_id: string | null
        }
        Insert: {
          amount_gross?: number | null
          created_at?: string
          currency?: string | null
          email?: string | null
          id?: string
          item_name?: string | null
          m_payment_id?: string | null
          payment_status: string
          pf_payment_id?: string | null
          provider?: string
          raw: Json
          user_id?: string | null
        }
        Update: {
          amount_gross?: number | null
          created_at?: string
          currency?: string | null
          email?: string | null
          id?: string
          item_name?: string | null
          m_payment_id?: string | null
          payment_status?: string
          pf_payment_id?: string | null
          provider?: string
          raw?: Json
          user_id?: string | null
        }
        Relationships: []
      }
      play_purchases: {
        Row: {
          active: boolean
          created_at: string
          expires_at: string | null
          product_id: string
          purchase_token: string
          raw: Json | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          expires_at?: string | null
          product_id: string
          purchase_token: string
          raw?: Json | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          expires_at?: string | null
          product_id?: string
          purchase_token?: string
          raw?: Json | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          base_cv_text: string | null
          created_at: string
          email: string | null
          full_name: string | null
          headline: string | null
          id: string
          links: string | null
          location_text: string | null
          onboarding_completed_at: string | null
          plan: string
          premium_expires_at: string | null
          target_role: string | null
          updated_at: string
        }
        Insert: {
          base_cv_text?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          headline?: string | null
          id: string
          links?: string | null
          location_text?: string | null
          onboarding_completed_at?: string | null
          plan?: string
          premium_expires_at?: string | null
          target_role?: string | null
          updated_at?: string
        }
        Update: {
          base_cv_text?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          headline?: string | null
          id?: string
          links?: string | null
          location_text?: string | null
          onboarding_completed_at?: string | null
          plan?: string
          premium_expires_at?: string | null
          target_role?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      usage_events: {
        Row: {
          created_at: string
          feature: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          feature: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          feature?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
