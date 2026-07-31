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
      blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
          id: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
          id?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
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
          tailor_category?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          reason: string
          reported_user_id: string
          reporter_id: string
          suggestion_id: string | null
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          reason: string
          reported_user_id: string
          reporter_id: string
          suggestion_id?: string | null
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          reason?: string
          reported_user_id?: string
          reporter_id?: string
          suggestion_id?: string | null
        }
        Relationships: []
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
          assigned_tailor_id: string | null
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
          assigned_tailor_id?: string | null
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
          assigned_tailor_id?: string | null
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
          specialization: string | null
          studio_name: string | null
          tailor_id: string
          updated_at: string
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
          specialization?: string | null
          studio_name?: string | null
          tailor_id: string
          updated_at?: string
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
          specialization?: string | null
          studio_name?: string | null
          tailor_id?: string
          updated_at?: string
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
    }
    Enums: {
      app_role: "user" | "tailor"
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
      app_role: ["user", "tailor"],
    },
  },
} as const
