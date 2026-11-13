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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      item_progress: {
        Row: {
          box: number
          correct: number
          due: string
          item_id: string
          topic: string
          updated_at: string
          user_id: string
          wrong: number
        }
        Insert: {
          box?: number
          correct?: number
          due?: string
          item_id: string
          topic: string
          updated_at?: string
          user_id?: string
          wrong?: number
        }
        Update: {
          box?: number
          correct?: number
          due?: string
          item_id?: string
          topic?: string
          updated_at?: string
          user_id?: string
          wrong?: number
        }
        Relationships: []
      }
      learning_sessions: {
        Row: {
          created_at: string
          current_step: number
          goal: string
          id: string
          kind: string
          learner_model: string
          phase: string
          plan: Json
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_step?: number
          goal: string
          id?: string
          kind?: string
          learner_model?: string
          phase?: string
          plan?: Json
          title?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          current_step?: number
          goal?: string
          id?: string
          kind?: string
          learner_model?: string
          phase?: string
          plan?: Json
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      learning_sources: {
        Row: {
          content: string
          created_at: string
          file_name: string | null
          file_path: string | null
          file_type: string | null
          id: string
          title: string
          topic_id: string | null
          user_id: string
        }
        Insert: {
          content?: string
          created_at?: string
          file_name?: string | null
          file_path?: string | null
          file_type?: string | null
          id?: string
          title: string
          topic_id?: string | null
          user_id?: string
        }
        Update: {
          content?: string
          created_at?: string
          file_name?: string | null
          file_path?: string | null
          file_type?: string | null
          id?: string
          title?: string
          topic_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      proposition_links: {
        Row: {
          conclusion_id: string
          created_at: string
          id: string
          premise_id: string
          user_id: string
        }
        Insert: {
          conclusion_id: string
          created_at?: string
          id?: string
          premise_id: string
          user_id?: string
        }
        Update: {
          conclusion_id?: string
          created_at?: string
          id?: string
          premise_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposition_links_conclusion_id_fkey"
            columns: ["conclusion_id"]
            isOneToOne: false
            referencedRelation: "propositions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposition_links_premise_id_fkey"
            columns: ["premise_id"]
            isOneToOne: false
            referencedRelation: "propositions"
            referencedColumns: ["id"]
          },
        ]
      }
      propositions: {
        Row: {
          created_at: string
          id: string
          source_kind: string
          source_session_id: string | null
          statement: string
          topic: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          source_kind?: string
          source_session_id?: string | null
          statement: string
          topic?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          source_kind?: string
          source_session_id?: string | null
          statement?: string
          topic?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "propositions_source_session_id_fkey"
            columns: ["source_session_id"]
            isOneToOne: false
            referencedRelation: "learning_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_messages: {
        Row: {
          attachments: Json
          confidence: number | null
          content: string
          created_at: string
          demo_html: string | null
          id: string
          images: Json
          role: string
          session_id: string
          sources: Json
          thinking: string | null
          user_id: string
        }
        Insert: {
          attachments?: Json
          confidence?: number | null
          content?: string
          created_at?: string
          demo_html?: string | null
          id?: string
          images?: Json
          role: string
          session_id: string
          sources?: Json
          thinking?: string | null
          user_id?: string
        }
        Update: {
          attachments?: Json
          confidence?: number | null
          content?: string
          created_at?: string
          demo_html?: string | null
          id?: string
          images?: Json
          role?: string
          session_id?: string
          sources?: Json
          thinking?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "learning_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
