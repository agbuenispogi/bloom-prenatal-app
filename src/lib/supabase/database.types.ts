export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      care_days: {
        Row: {
          bedtime_at: string | null;
          breakfast_skipped: boolean;
          created_at: string;
          date: string;
          household_id: string;
          id: string;
          notes: string | null;
        };
        ComputedFields: never;
        Insert: {
          bedtime_at?: string | null;
          breakfast_skipped?: boolean;
          created_at?: string;
          date: string;
          household_id: string;
          id?: string;
          notes?: string | null;
        };
        Update: {
          bedtime_at?: string | null;
          breakfast_skipped?: boolean;
          created_at?: string;
          date?: string;
          household_id?: string;
          id?: string;
          notes?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "care_days_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
        ];
      };
      daily_summaries: {
        Row: {
          adherence_pct: number | null;
          care_day_id: string;
          created_at: string;
          household_id: string;
          id: string;
          payload: NonNullable<Json>;
          sent_at: string | null;
          streak: number;
        };
        ComputedFields: never;
        Insert: {
          adherence_pct?: number | null;
          care_day_id: string;
          created_at?: string;
          household_id: string;
          id?: string;
          payload: NonNullable<Json>;
          sent_at?: string | null;
          streak?: number;
        };
        Update: {
          adherence_pct?: number | null;
          care_day_id?: string;
          created_at?: string;
          household_id?: string;
          id?: string;
          payload?: NonNullable<Json>;
          sent_at?: string | null;
          streak?: number;
        };
        Relationships: [
          {
            foreignKeyName: "daily_summaries_care_day_id_household_id_fkey";
            columns: ["care_day_id", "household_id"];
            isOneToOne: false;
            referencedRelation: "care_days";
            referencedColumns: ["id", "household_id"];
          },
        ];
      };
      dose_logs: {
        Row: {
          care_day_id: string;
          household_id: string;
          id: string;
          logged_by: string | null;
          occurrence: number;
          reason: string | null;
          rule_id: string;
          snoozed_until: string | null;
          status: Database["public"]["Enums"]["dose_status"];
          taken_at: string | null;
          target_at: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          care_day_id: string;
          household_id: string;
          id?: string;
          logged_by?: string | null;
          occurrence?: number;
          reason?: string | null;
          rule_id: string;
          snoozed_until?: string | null;
          status?: Database["public"]["Enums"]["dose_status"];
          taken_at?: string | null;
          target_at?: string | null;
          updated_at?: string;
        };
        Update: {
          care_day_id?: string;
          household_id?: string;
          id?: string;
          logged_by?: string | null;
          occurrence?: number;
          reason?: string | null;
          rule_id?: string;
          snoozed_until?: string | null;
          status?: Database["public"]["Enums"]["dose_status"];
          taken_at?: string | null;
          target_at?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "dose_logs_care_day_id_household_id_fkey";
            columns: ["care_day_id", "household_id"];
            isOneToOne: false;
            referencedRelation: "care_days";
            referencedColumns: ["id", "household_id"];
          },
          {
            foreignKeyName: "dose_logs_logged_by_fkey";
            columns: ["logged_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "dose_logs_rule_id_household_id_fkey";
            columns: ["rule_id", "household_id"];
            isOneToOne: false;
            referencedRelation: "medication_rules";
            referencedColumns: ["id", "household_id"];
          },
        ];
      };
      household_invites: {
        Row: {
          accepted_at: string | null;
          accepted_by: string | null;
          created_at: string;
          email: string;
          expires_at: string;
          household_id: string;
          id: string;
          invited_by: string;
          role: Database["public"]["Enums"]["profile_role"];
          token_hash: string;
        };
        ComputedFields: never;
        Insert: {
          accepted_at?: string | null;
          accepted_by?: string | null;
          created_at?: string;
          email: string;
          expires_at?: string;
          household_id: string;
          id?: string;
          invited_by: string;
          role: Database["public"]["Enums"]["profile_role"];
          token_hash: string;
        };
        Update: {
          accepted_at?: string | null;
          accepted_by?: string | null;
          created_at?: string;
          email?: string;
          expires_at?: string;
          household_id?: string;
          id?: string;
          invited_by?: string;
          role?: Database["public"]["Enums"]["profile_role"];
          token_hash?: string;
        };
        Relationships: [
          {
            foreignKeyName: "household_invites_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "household_invites_invited_by_fkey";
            columns: ["invited_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      households: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          settings: NonNullable<Json>;
          tz: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          settings?: NonNullable<Json>;
          tz?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          settings?: NonNullable<Json>;
          tz?: string;
        };
        Relationships: [];
      };
      meal_logs: {
        Row: {
          care_day_id: string;
          created_at: string;
          eaten_at: string | null;
          household_id: string;
          id: string;
          logged_by: string | null;
          planned_at: string | null;
          type: Database["public"]["Enums"]["meal_type"];
        };
        ComputedFields: never;
        Insert: {
          care_day_id: string;
          created_at?: string;
          eaten_at?: string | null;
          household_id: string;
          id?: string;
          logged_by?: string | null;
          planned_at?: string | null;
          type: Database["public"]["Enums"]["meal_type"];
        };
        Update: {
          care_day_id?: string;
          created_at?: string;
          eaten_at?: string | null;
          household_id?: string;
          id?: string;
          logged_by?: string | null;
          planned_at?: string | null;
          type?: Database["public"]["Enums"]["meal_type"];
        };
        Relationships: [
          {
            foreignKeyName: "meal_logs_care_day_id_household_id_fkey";
            columns: ["care_day_id", "household_id"];
            isOneToOne: false;
            referencedRelation: "care_days";
            referencedColumns: ["id", "household_id"];
          },
          {
            foreignKeyName: "meal_logs_logged_by_fkey";
            columns: ["logged_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      medication_rules: {
        Row: {
          active: boolean;
          anchor: Database["public"]["Enums"]["meal_anchor"] | null;
          created_at: string;
          deadline: string | null;
          fixed_time: string | null;
          household_id: string;
          id: string;
          label: string;
          max_per_day: number;
          medication_id: string;
          min_per_day: number;
          offset_min: number;
          rule_type: Database["public"]["Enums"]["rule_type"];
          slug: string;
          sort: number;
        };
        ComputedFields: never;
        Insert: {
          active?: boolean;
          anchor?: Database["public"]["Enums"]["meal_anchor"] | null;
          created_at?: string;
          deadline?: string | null;
          fixed_time?: string | null;
          household_id: string;
          id?: string;
          label: string;
          max_per_day?: number;
          medication_id: string;
          min_per_day?: number;
          offset_min?: number;
          rule_type: Database["public"]["Enums"]["rule_type"];
          slug: string;
          sort?: number;
        };
        Update: {
          active?: boolean;
          anchor?: Database["public"]["Enums"]["meal_anchor"] | null;
          created_at?: string;
          deadline?: string | null;
          fixed_time?: string | null;
          household_id?: string;
          id?: string;
          label?: string;
          max_per_day?: number;
          medication_id?: string;
          min_per_day?: number;
          offset_min?: number;
          rule_type?: Database["public"]["Enums"]["rule_type"];
          slug?: string;
          sort?: number;
        };
        Relationships: [
          {
            foreignKeyName: "medication_rules_medication_id_household_id_fkey";
            columns: ["medication_id", "household_id"];
            isOneToOne: false;
            referencedRelation: "medications";
            referencedColumns: ["id", "household_id"];
          },
        ];
      };
      medications: {
        Row: {
          active: boolean;
          color: string;
          created_at: string;
          dose_label: string;
          household_id: string;
          icon: string;
          id: string;
          name: string;
          slug: string;
          sort: number;
          spacing_class: Database["public"]["Enums"]["spacing_class"] | null;
        };
        ComputedFields: never;
        Insert: {
          active?: boolean;
          color?: string;
          created_at?: string;
          dose_label?: string;
          household_id: string;
          icon?: string;
          id?: string;
          name: string;
          slug: string;
          sort?: number;
          spacing_class?: Database["public"]["Enums"]["spacing_class"] | null;
        };
        Update: {
          active?: boolean;
          color?: string;
          created_at?: string;
          dose_label?: string;
          household_id?: string;
          icon?: string;
          id?: string;
          name?: string;
          slug?: string;
          sort?: number;
          spacing_class?: Database["public"]["Enums"]["spacing_class"] | null;
        };
        Relationships: [
          {
            foreignKeyName: "medications_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          display_name: string;
          email: string;
          household_id: string;
          id: string;
          notify_email: boolean;
          notify_push: boolean;
          role: Database["public"]["Enums"]["profile_role"];
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          display_name: string;
          email: string;
          household_id: string;
          id: string;
          notify_email?: boolean;
          notify_push?: boolean;
          role: Database["public"]["Enums"]["profile_role"];
        };
        Update: {
          created_at?: string;
          display_name?: string;
          email?: string;
          household_id?: string;
          id?: string;
          notify_email?: boolean;
          notify_push?: boolean;
          role?: Database["public"]["Enums"]["profile_role"];
        };
        Relationships: [
          {
            foreignKeyName: "profiles_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
        ];
      };
      push_subscriptions: {
        Row: {
          auth: string;
          created_at: string;
          endpoint: string;
          id: string;
          last_success_at: string | null;
          p256dh: string;
          profile_id: string;
          user_agent: string | null;
        };
        ComputedFields: never;
        Insert: {
          auth: string;
          created_at?: string;
          endpoint: string;
          id?: string;
          last_success_at?: string | null;
          p256dh: string;
          profile_id: string;
          user_agent?: string | null;
        };
        Update: {
          auth?: string;
          created_at?: string;
          endpoint?: string;
          id?: string;
          last_success_at?: string | null;
          p256dh?: string;
          profile_id?: string;
          user_agent?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      reminders: {
        Row: {
          attempts: number;
          cancelled_at: string | null;
          channel: Database["public"]["Enums"]["reminder_channel"];
          created_at: string;
          dedupe_key: string;
          dose_log_id: string | null;
          due_at: string;
          household_id: string;
          id: string;
          kind: Database["public"]["Enums"]["reminder_kind"];
          last_error: string | null;
          meal_log_id: string | null;
          payload: NonNullable<Json>;
          recipient_id: string;
          sent_at: string | null;
        };
        ComputedFields: never;
        Insert: {
          attempts?: number;
          cancelled_at?: string | null;
          channel: Database["public"]["Enums"]["reminder_channel"];
          created_at?: string;
          dedupe_key: string;
          dose_log_id?: string | null;
          due_at: string;
          household_id: string;
          id?: string;
          kind: Database["public"]["Enums"]["reminder_kind"];
          last_error?: string | null;
          meal_log_id?: string | null;
          payload?: NonNullable<Json>;
          recipient_id: string;
          sent_at?: string | null;
        };
        Update: {
          attempts?: number;
          cancelled_at?: string | null;
          channel?: Database["public"]["Enums"]["reminder_channel"];
          created_at?: string;
          dedupe_key?: string;
          dose_log_id?: string | null;
          due_at?: string;
          household_id?: string;
          id?: string;
          kind?: Database["public"]["Enums"]["reminder_kind"];
          last_error?: string | null;
          meal_log_id?: string | null;
          payload?: NonNullable<Json>;
          recipient_id?: string;
          sent_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "reminders_dose_log_id_fkey";
            columns: ["dose_log_id"];
            isOneToOne: false;
            referencedRelation: "dose_logs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reminders_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reminders_meal_log_id_fkey";
            columns: ["meal_log_id"];
            isOneToOne: false;
            referencedRelation: "meal_logs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reminders_recipient_id_household_id_fkey";
            columns: ["recipient_id", "household_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id", "household_id"];
          },
        ];
      };
      schedule_overrides: {
        Row: {
          date: string;
          end_time: string | null;
          household_id: string;
          id: string;
          is_off: boolean;
          note: string | null;
          start_time: string | null;
        };
        ComputedFields: never;
        Insert: {
          date: string;
          end_time?: string | null;
          household_id: string;
          id?: string;
          is_off?: boolean;
          note?: string | null;
          start_time?: string | null;
        };
        Update: {
          date?: string;
          end_time?: string | null;
          household_id?: string;
          id?: string;
          is_off?: boolean;
          note?: string | null;
          start_time?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "schedule_overrides_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
        ];
      };
      work_schedule: {
        Row: {
          end_time: string | null;
          household_id: string;
          start_time: string | null;
          weekday: number;
        };
        ComputedFields: never;
        Insert: {
          end_time?: string | null;
          household_id: string;
          start_time?: string | null;
          weekday: number;
        };
        Update: {
          end_time?: string | null;
          household_id?: string;
          start_time?: string | null;
          weekday?: number;
        };
        Relationships: [
          {
            foreignKeyName: "work_schedule_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      accept_invite: { Args: { p_display_name: string; p_token: string }; Returns: string };
      auth_can_log: { Args: Record<PropertyKey, never>; Returns: boolean };
      auth_household_id: { Args: Record<PropertyKey, never>; Returns: string };
      auth_role: {
        Args: Record<PropertyKey, never>;
        Returns: Database["public"]["Enums"]["profile_role"];
      };
      create_household: {
        Args: {
          p_display_name: string;
          p_name: string;
          p_role: Database["public"]["Enums"]["profile_role"];
        };
        Returns: string;
      };
      create_invite: {
        Args: { p_email: string; p_role: Database["public"]["Enums"]["profile_role"] };
        Returns: string;
      };
      hook_before_user_created: { Args: { event: Json }; Returns: Json };
      seed_household_defaults: { Args: { p_household: string }; Returns: undefined };
    };
    Enums: {
      dose_status: "pending" | "taken" | "skipped" | "snoozed" | "missed";
      meal_anchor: "breakfast" | "lunch" | "dinner" | "snack" | "bedtime";
      meal_type: "breakfast" | "lunch" | "dinner" | "snack";
      profile_role: "patient" | "caregiver";
      reminder_channel: "push" | "email";
      reminder_kind: "due" | "nag" | "escalation" | "eat_nudge" | "anmum" | "summary";
      rule_type: "before_meal" | "after_meal" | "fixed_time" | "bedtime" | "daily_count";
      spacing_class: "iron" | "calcium" | "antacid";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      dose_status: ["pending", "taken", "skipped", "snoozed", "missed"],
      meal_anchor: ["breakfast", "lunch", "dinner", "snack", "bedtime"],
      meal_type: ["breakfast", "lunch", "dinner", "snack"],
      profile_role: ["patient", "caregiver"],
      reminder_channel: ["push", "email"],
      reminder_kind: ["due", "nag", "escalation", "eat_nudge", "anmum", "summary"],
      rule_type: ["before_meal", "after_meal", "fixed_time", "bedtime", "daily_count"],
      spacing_class: ["iron", "calcium", "antacid"],
    },
  },
} as const;
