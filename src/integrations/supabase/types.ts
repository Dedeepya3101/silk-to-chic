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
      admin_settings: {
        Row: {
          auto_verify_tailors: boolean
          contact_email: string
          created_at: string
          id: string
          platform_name: string
          report_categories: string[]
          require_identity_verification: boolean
          require_portfolio_verification: boolean
          safety_notice: string
          updated_at: string
        }
        Insert: {
          auto_verify_tailors?: boolean
          contact_email?: string
          created_at?: string
          id?: string
          platform_name?: string
          report_categories?: string[]
          require_identity_verification?: boolean
          require_portfolio_verification?: boolean
          safety_notice?: string
          updated_at?: string
        }
        Update: {
          auto_verify_tailors?: boolean
          contact_email?: string
          created_at?: string
          id?: string
          platform_name?: string
          report_categories?: string[]
          require_identity_verification?: boolean
          require_portfolio_verification?: boolean
          safety_notice?: string
          updated_at?: string
        }
        Relationships: []
      }
      ai_chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_events: {
        Row: {
          created_at: string
          event: string
          id: string
          props: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          event: string
          id?: string
          props?: Json
          user_id: string
        }
        Update: {
          created_at?: string
          event?: string
          id?: string
          props?: Json
          user_id?: string
        }
        Relationships: []
      }
      ai_style_ideas: {
        Row: {
          created_at: string
          id: string
          ideas: Json
          saree_upload_id: string
          selected_idea: Json | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          ideas?: Json
          saree_upload_id: string
          selected_idea?: Json | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          ideas?: Json
          saree_upload_id?: string
          selected_idea?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_style_ideas_saree_upload_id_fkey"
            columns: ["saree_upload_id"]
            isOneToOne: false
            referencedRelation: "saree_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_tailor_matches: {
        Row: {
          created_at: string
          id: string
          matches: Json
          saree_upload_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          matches?: Json
          saree_upload_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          matches?: Json
          saree_upload_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_tailor_matches_saree_upload_id_fkey"
            columns: ["saree_upload_id"]
            isOneToOne: false
            referencedRelation: "saree_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_tool_runs: {
        Row: {
          agent: string
          args: Json
          created_at: string
          error: string | null
          id: string
          ok: boolean
          tool: string
          user_id: string
        }
        Insert: {
          agent: string
          args?: Json
          created_at?: string
          error?: string | null
          id?: string
          ok?: boolean
          tool: string
          user_id: string
        }
        Update: {
          agent?: string
          args?: Json
          created_at?: string
          error?: string | null
          id?: string
          ok?: boolean
          tool?: string
          user_id?: string
        }
        Relationships: []
      }
      appeals: {
        Row: {
          admin_notes: string | null
          created_at: string
          explanation: string | null
          id: string
          message: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          suspension_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          explanation?: string | null
          id?: string
          message: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          suspension_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          explanation?: string | null
          id?: string
          message?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          suspension_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "appeals_suspension_id_fkey"
            columns: ["suspension_id"]
            isOneToOne: false
            referencedRelation: "suspensions"
            referencedColumns: ["id"]
          },
        ]
      }
      blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
          id: string
          unblocked_at: string | null
          unblocked_by: string | null
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
          id?: string
          unblocked_at?: string | null
          unblocked_by?: string | null
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
          unblocked_at?: string | null
          unblocked_by?: string | null
        }
        Relationships: []
      }
      completed_projects: {
        Row: {
          completion_date: string
          id: string
          request_id: string
          tailor_id: string
          user_id: string
        }
        Insert: {
          completion_date?: string
          id?: string
          request_id: string
          tailor_id: string
          user_id: string
        }
        Update: {
          completion_date?: string
          id?: string
          request_id?: string
          tailor_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "completed_projects_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "saree_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          recipient_id: string
          saree_upload_id: string | null
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          recipient_id: string
          saree_upload_id?: string | null
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          recipient_id?: string
          saree_upload_id?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_saree_upload_id_fkey"
            columns: ["saree_upload_id"]
            isOneToOne: false
            referencedRelation: "saree_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      moderation_actions: {
        Row: {
          action: string
          admin_id: string | null
          created_at: string
          id: string
          notes: string | null
          report_id: string | null
          target_user_id: string
        }
        Insert: {
          action: string
          admin_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          report_id?: string | null
          target_user_id: string
        }
        Update: {
          action?: string
          admin_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          report_id?: string | null
          target_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "moderation_actions_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message: string
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      portfolio_items: {
        Row: {
          after_image: string
          before_image: string | null
          created_at: string
          description: string | null
          id: string
          tailor_id: string
          title: string | null
        }
        Insert: {
          after_image: string
          before_image?: string | null
          created_at?: string
          description?: string | null
          id?: string
          tailor_id: string
          title?: string | null
        }
        Update: {
          after_image?: string
          before_image?: string | null
          created_at?: string
          description?: string | null
          id?: string
          tailor_id?: string
          title?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          city: string | null
          created_at: string
          display_name: string
          email: string | null
          experience_years: number | null
          id: string
          languages: string | null
          phone: string | null
          specialization: string | null
          suspended: boolean
          suspended_at: string | null
          suspended_by: string | null
          suspended_until: string | null
          suspension_reason: string | null
          tailor_category: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string
          display_name?: string
          email?: string | null
          experience_years?: number | null
          id: string
          languages?: string | null
          phone?: string | null
          specialization?: string | null
          suspended?: boolean
          suspended_at?: string | null
          suspended_by?: string | null
          suspended_until?: string | null
          suspension_reason?: string | null
          tailor_category?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string
          display_name?: string
          email?: string | null
          experience_years?: number | null
          id?: string
          languages?: string | null
          phone?: string | null
          specialization?: string | null
          suspended?: boolean
          suspended_at?: string | null
          suspended_by?: string | null
          suspended_until?: string | null
          suspension_reason?: string | null
          tailor_category?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          admin_notes: string | null
          created_at: string
          details: string | null
          id: string
          reason: string
          reported_user_id: string
          reporter_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          suggestion_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          details?: string | null
          id?: string
          reason: string
          reported_user_id: string
          reporter_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          suggestion_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          details?: string | null
          id?: string
          reason?: string
          reported_user_id?: string
          reporter_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          suggestion_id?: string | null
        }
        Relationships: []
      }
      request_status_history: {
        Row: {
          changed_by: string | null
          created_at: string
          from_status: string | null
          id: string
          saree_upload_id: string
          to_status: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          from_status?: string | null
          id?: string
          saree_upload_id: string
          to_status: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          from_status?: string | null
          id?: string
          saree_upload_id?: string
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "request_status_history_saree_upload_id_fkey"
            columns: ["saree_upload_id"]
            isOneToOne: false
            referencedRelation: "saree_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          created_at: string
          id: string
          rating: number
          request_id: string
          review_text: string | null
          tailor_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          rating: number
          request_id: string
          review_text?: string | null
          tailor_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          rating?: number
          request_id?: string
          review_text?: string | null
          tailor_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "saree_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      saree_uploads: {
        Row: {
          ai_style_note: string | null
          assigned_tailor_id: string | null
          cancelled_at: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string
          occasion: string | null
          status: string
          tailor_marked_completed: boolean
          title: string | null
          updated_at: string
          user_confirmed_completion: boolean
          user_id: string
        }
        Insert: {
          ai_style_note?: string | null
          assigned_tailor_id?: string | null
          cancelled_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url: string
          occasion?: string | null
          status?: string
          tailor_marked_completed?: boolean
          title?: string | null
          updated_at?: string
          user_confirmed_completion?: boolean
          user_id: string
        }
        Update: {
          ai_style_note?: string | null
          assigned_tailor_id?: string | null
          cancelled_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string
          occasion?: string | null
          status?: string
          tailor_marked_completed?: boolean
          title?: string | null
          updated_at?: string
          user_confirmed_completion?: boolean
          user_id?: string
        }
        Relationships: []
      }
      saved_tailors: {
        Row: {
          created_at: string
          id: string
          tailor_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          tailor_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          tailor_id?: string
          user_id?: string
        }
        Relationships: []
      }
      suggestion_replies: {
        Row: {
          created_at: string
          id: string
          message: string
          suggestion_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          suggestion_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          suggestion_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "suggestion_replies_suggestion_id_fkey"
            columns: ["suggestion_id"]
            isOneToOne: false
            referencedRelation: "suggestions"
            referencedColumns: ["id"]
          },
        ]
      }
      suggestions: {
        Row: {
          best_fit: string | null
          color_suggestions: string | null
          created_at: string
          id: string
          saree_upload_id: string
          silhouette: string | null
          sleeve_ideas: string | null
          stitching_notes: string | null
          tailor_id: string
          user_id: string
        }
        Insert: {
          best_fit?: string | null
          color_suggestions?: string | null
          created_at?: string
          id?: string
          saree_upload_id: string
          silhouette?: string | null
          sleeve_ideas?: string | null
          stitching_notes?: string | null
          tailor_id: string
          user_id: string
        }
        Update: {
          best_fit?: string | null
          color_suggestions?: string | null
          created_at?: string
          id?: string
          saree_upload_id?: string
          silhouette?: string | null
          sleeve_ideas?: string | null
          stitching_notes?: string | null
          tailor_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "suggestions_saree_upload_id_fkey"
            columns: ["saree_upload_id"]
            isOneToOne: false
            referencedRelation: "saree_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      suspensions: {
        Row: {
          admin_id: string | null
          created_at: string
          details: string | null
          duration: string
          ends_at: string | null
          id: string
          lifted_at: string | null
          lifted_by: string | null
          reason: string
          starts_at: string
          user_id: string
        }
        Insert: {
          admin_id?: string | null
          created_at?: string
          details?: string | null
          duration?: string
          ends_at?: string | null
          id?: string
          lifted_at?: string | null
          lifted_by?: string | null
          reason: string
          starts_at?: string
          user_id: string
        }
        Update: {
          admin_id?: string | null
          created_at?: string
          details?: string | null
          duration?: string
          ends_at?: string | null
          id?: string
          lifted_at?: string | null
          lifted_by?: string | null
          reason?: string
          starts_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tailor_profiles: {
        Row: {
          bio: string | null
          created_at: string
          experience_years: number | null
          id: string
          identity_verified: boolean
          location: string | null
          owner_name: string | null
          phone: string | null
          phone_visibility: boolean
          portfolio_verified: boolean
          profile_photo: string | null
          rejection_reason: string | null
          specialization: string | null
          studio_name: string | null
          tailor_id: string
          updated_at: string
          verification_documents: string[]
          verification_notes: string | null
          verification_status: string
          verified_at: string | null
          verified_by: string | null
          verified_tailor: boolean
        }
        Insert: {
          bio?: string | null
          created_at?: string
          experience_years?: number | null
          id?: string
          identity_verified?: boolean
          location?: string | null
          owner_name?: string | null
          phone?: string | null
          phone_visibility?: boolean
          portfolio_verified?: boolean
          profile_photo?: string | null
          rejection_reason?: string | null
          specialization?: string | null
          studio_name?: string | null
          tailor_id: string
          updated_at?: string
          verification_documents?: string[]
          verification_notes?: string | null
          verification_status?: string
          verified_at?: string | null
          verified_by?: string | null
          verified_tailor?: boolean
        }
        Update: {
          bio?: string | null
          created_at?: string
          experience_years?: number | null
          id?: string
          identity_verified?: boolean
          location?: string | null
          owner_name?: string | null
          phone?: string | null
          phone_visibility?: boolean
          portfolio_verified?: boolean
          profile_photo?: string | null
          rejection_reason?: string | null
          specialization?: string | null
          studio_name?: string | null
          tailor_id?: string
          updated_at?: string
          verification_documents?: string[]
          verification_notes?: string | null
          verification_status?: string
          verified_at?: string | null
          verified_by?: string | null
          verified_tailor?: boolean
        }
        Relationships: []
      }
      tailor_requests: {
        Row: {
          created_at: string
          fabric_notes: string | null
          id: string
          price: number | null
          saree_upload_id: string
          sleeves: string | null
          status: string
          suggested_style: string | null
          tailor_id: string
        }
        Insert: {
          created_at?: string
          fabric_notes?: string | null
          id?: string
          price?: number | null
          saree_upload_id: string
          sleeves?: string | null
          status?: string
          suggested_style?: string | null
          tailor_id: string
        }
        Update: {
          created_at?: string
          fabric_notes?: string | null
          id?: string
          price?: number | null
          saree_upload_id?: string
          sleeves?: string | null
          status?: string
          suggested_style?: string | null
          tailor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tailor_requests_saree_upload_id_fkey"
            columns: ["saree_upload_id"]
            isOneToOne: false
            referencedRelation: "saree_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_suspended: { Args: { _uid: string }; Returns: boolean }
    }
    Enums: {
      app_role: "user" | "tailor" | "admin"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["user", "tailor", "admin"],
    },
  },
} as const
