export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          role: string
          avatar_url: string | null
          phone: string | null
          is_active: boolean
          last_seen: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          role?: string
          avatar_url?: string | null
          phone?: string | null
          is_active?: boolean
          last_seen?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          role?: string
          avatar_url?: string | null
          phone?: string | null
          is_active?: boolean
          last_seen?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      departments: {
        Row: {
          id: string
          name: string
          code: string | null
          description: string | null
          head_of_department_id: string | null
          status: string
          created_by: string | null
          updated_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          code?: string | null
          description?: string | null
          head_of_department_id?: string | null
          status?: string
          created_by?: string | null
          updated_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          code?: string | null
          description?: string | null
          head_of_department_id?: string | null
          status?: string
          created_by?: string | null
          updated_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      staff_records: {
        Row: {
          id: string
          user_id: string | null
          readable_id: string | null
          full_name: string
          email: string
          phone: string | null
          role: string
          department_id: string | null
          position: string | null
          grade_level: number | null
          step: number | null
          passport_url: string | null
          status: string
          gender: string | null
          date_of_birth: string | null
          qualification: string | null
          employment_date: string | null
          retirement_date: string | null
          adhoc_expiry: string | null
          address: string | null
          next_of_kin_name: string | null
          next_of_kin_phone: string | null
          next_of_kin_rel: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          readable_id?: string | null
          full_name: string
          email: string
          phone?: string | null
          role?: string
          department_id?: string | null
          position?: string | null
          grade_level?: number | null
          step?: number | null
          passport_url?: string | null
          status?: string
          gender?: string | null
          date_of_birth?: string | null
          qualification?: string | null
          employment_date?: string | null
          retirement_date?: string | null
          adhoc_expiry?: string | null
          address?: string | null
          next_of_kin_name?: string | null
          next_of_kin_phone?: string | null
          next_of_kin_rel?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          readable_id?: string | null
          full_name?: string
          email?: string
          phone?: string | null
          role?: string
          department_id?: string | null
          position?: string | null
          grade_level?: number | null
          step?: number | null
          passport_url?: string | null
          status?: string
          gender?: string | null
          date_of_birth?: string | null
          qualification?: string | null
          employment_date?: string | null
          retirement_date?: string | null
          adhoc_expiry?: string | null
          address?: string | null
          next_of_kin_name?: string | null
          next_of_kin_phone?: string | null
          next_of_kin_rel?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      roles: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          status: string
          created_by: string | null
          updated_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          status?: string
          created_by?: string | null
          updated_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string | null
          status?: string
          created_by?: string | null
          updated_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      permissions: {
        Row: {
          id: string
          name: string
          description: string | null
          module: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          module?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          module?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      role_permissions: {
        Row: {
          id: string
          role_id: string | null
          permission_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          role_id?: string | null
          permission_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          role_id?: string | null
          permission_id?: string | null
          created_at?: string
        }
      }
      portal_branding_settings: {
        Row: {
          id: number
          portal_name: string
          logo_url: string | null
          favicon_url: string | null
          login_background_url: string | null
          primary_color: string
          secondary_color: string
          login_title: string
          login_subtitle: string
          footer_text: string
          created_by: string | null
          updated_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          portal_name?: string
          logo_url?: string | null
          favicon_url?: string | null
          login_background_url?: string | null
          primary_color?: string
          secondary_color?: string
          login_title?: string
          login_subtitle?: string
          footer_text?: string
          created_by?: string | null
          updated_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          portal_name?: string
          logo_url?: string | null
          favicon_url?: string | null
          login_background_url?: string | null
          primary_color?: string
          secondary_color?: string
          login_title?: string
          login_subtitle?: string
          footer_text?: string
          created_by?: string | null
          updated_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      branding_settings: {
        Row: {
          id: string
          portal_name: string
          logo_url: string | null
          logo_url_2: string | null
          logo_url_3: string | null
          login_bg_url: string | null
          primary_color: string
          secondary_color: string
          footer_text: string
          contact_email: string | null
          contact_phone: string | null
          hero_title: string | null
          hero_subtitle: string | null
          hero_tagline: string | null
          updated_by: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          portal_name?: string
          logo_url?: string | null
          logo_url_2?: string | null
          logo_url_3?: string | null
          login_bg_url?: string | null
          primary_color?: string
          secondary_color?: string
          footer_text?: string
          contact_email?: string | null
          contact_phone?: string | null
          hero_title?: string | null
          hero_subtitle?: string | null
          hero_tagline?: string | null
          updated_by?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          portal_name?: string
          logo_url?: string | null
          logo_url_2?: string | null
          logo_url_3?: string | null
          login_bg_url?: string | null
          primary_color?: string
          secondary_color?: string
          footer_text?: string
          contact_email?: string | null
          contact_phone?: string | null
          hero_title?: string | null
          hero_subtitle?: string | null
          hero_tagline?: string | null
          updated_by?: string | null
          updated_at?: string
        }
      }
      login_page_settings: {
        Row: {
          id: string
          title: string
          subtitle: string | null
          show_home_btn: boolean
          allow_remember: boolean
          login_bg_url: string | null
          logo_url: string | null
          updated_by: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          title?: string
          subtitle?: string | null
          show_home_btn?: boolean
          allow_remember?: boolean
          login_bg_url?: string | null
          logo_url?: string | null
          updated_by?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          subtitle?: string | null
          show_home_btn?: boolean
          allow_remember?: boolean
          login_bg_url?: string | null
          logo_url?: string | null
          updated_by?: string | null
          updated_at?: string
        }
      }
      attendance: {
        Row: {
          id: string
          staff_id: string
          date: string
          check_in: string | null
          check_out: string | null
          status: string
          late_minutes: number
          note: string | null
          verified: boolean
          verified_by: string | null
          verified_at: string | null
          approved: boolean
          approved_by: string | null
          approved_at: string | null
          recorded_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          staff_id: string
          date: string
          check_in?: string | null
          check_out?: string | null
          status?: string
          late_minutes?: number
          note?: string | null
          verified?: boolean
          verified_by?: string | null
          verified_at?: string | null
          approved?: boolean
          approved_by?: string | null
          approved_at?: string | null
          recorded_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          staff_id?: string
          date?: string
          check_in?: string | null
          check_out?: string | null
          status?: string
          late_minutes?: number
          note?: string | null
          verified?: boolean
          verified_by?: string | null
          verified_at?: string | null
          approved?: boolean
          approved_by?: string | null
          approved_at?: string | null
          recorded_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      leave_requests: {
        Row: {
          id: string
          staff_id: string
          leave_type: string
          start_date: string
          end_date: string
          days: number
          reason: string | null
          status: string
          approved_by: string | null
          approved_at: string | null
          rejection_note: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          staff_id: string
          leave_type: string
          start_date: string
          end_date: string
          days?: number
          reason?: string | null
          status?: string
          approved_by?: string | null
          approved_at?: string | null
          rejection_note?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          staff_id?: string
          leave_type?: string
          start_date?: string
          end_date?: string
          days?: number
          reason?: string | null
          status?: string
          approved_by?: string | null
          approved_at?: string | null
          rejection_note?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      payroll: {
        Row: {
          id: string
          staff_id: string
          month: number
          year: number
          basic_salary: number
          gross_salary: number
          net_salary: number
          deductions: number
          payment_status: string
          payment_date: string | null
          payment_ref: string | null
          notes: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          staff_id: string
          month: number
          year: number
          basic_salary?: number
          gross_salary?: number
          net_salary?: number
          deductions?: number
          payment_status?: string
          payment_date?: string | null
          payment_ref?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          staff_id?: string
          month?: number
          year?: number
          basic_salary?: number
          gross_salary?: number
          net_salary?: number
          deductions?: number
          payment_status?: string
          payment_date?: string | null
          payment_ref?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      allowances: {
        Row: {
          id: string
          staff_id: string
          allowance_type: string
          amount: number
          month: number
          year: number
          payment_status: string
          payment_date: string | null
          notes: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          staff_id: string
          allowance_type: string
          amount?: number
          month: number
          year: number
          payment_status?: string
          payment_date?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          staff_id?: string
          allowance_type?: string
          amount?: number
          month?: number
          year?: number
          payment_status?: string
          payment_date?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      documents: {
        Row: {
          id: string
          staff_id: string | null
          uploaded_by: string
          category_id: string | null
          name: string
          description: string | null
          file_url: string
          file_type: string
          file_size: number | null
          status: string
          reviewed_by: string | null
          reviewed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          staff_id?: string | null
          uploaded_by: string
          category_id?: string | null
          name: string
          description?: string | null
          file_url: string
          file_type: string
          file_size?: number | null
          status?: string
          reviewed_by?: string | null
          reviewed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          staff_id?: string | null
          uploaded_by?: string
          category_id?: string | null
          name?: string
          description?: string | null
          file_url?: string
          file_type?: string
          file_size?: number | null
          status?: string
          reviewed_by?: string | null
          reviewed_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      chat_groups: {
        Row: {
          id: string
          name: string
          description: string | null
          type: string
          department_id: string | null
          created_by: string
          avatar_url: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          type?: string
          department_id?: string | null
          created_by: string
          avatar_url?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          type?: string
          department_id?: string | null
          created_by?: string
          avatar_url?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          group_id: string
          sender_id: string
          content: string | null
          file_url: string | null
          file_type: string | null
          is_read: boolean
          is_deleted: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          group_id: string
          sender_id: string
          content?: string | null
          file_url?: string | null
          file_type?: string | null
          is_read?: boolean
          is_deleted?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          group_id?: string
          sender_id?: string
          content?: string | null
          file_url?: string | null
          file_type?: string | null
          is_read?: boolean
          is_deleted?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: string
          title: string
          body: string | null
          is_read: boolean
          link: string | null
          metadata: Json | null
          status: string
          related_module: string | null
          related_record_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          title: string
          body?: string | null
          is_read?: boolean
          link?: string | null
          metadata?: Json | null
          status?: string
          related_module?: string | null
          related_record_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          title?: string
          body?: string | null
          is_read?: boolean
          link?: string | null
          metadata?: Json | null
          status?: string
          related_module?: string | null
          related_record_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      notification_preferences: {
        Row: {
          id: string
          user_id: string
          attendance_alerts: boolean
          birthday_alerts: boolean
          retirement_alerts: boolean
          allowance_alerts: boolean
          system_alerts: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          attendance_alerts?: boolean
          birthday_alerts?: boolean
          retirement_alerts?: boolean
          allowance_alerts?: boolean
          system_alerts?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          attendance_alerts?: boolean
          birthday_alerts?: boolean
          retirement_alerts?: boolean
          allowance_alerts?: boolean
          system_alerts?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      announcements: {
        Row: {
          id: string
          title: string
          body: string
          audience: string
          department_id: string | null
          posted_by: string
          expires_at: string | null
          is_pinned: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          body: string
          audience?: string
          department_id?: string | null
          posted_by: string
          expires_at?: string | null
          is_pinned?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          body?: string
          audience?: string
          department_id?: string | null
          posted_by?: string
          expires_at?: string | null
          is_pinned?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      audit_logs: {
        Row: {
          id: string
          user_id: string | null
          action: string
          table_name: string | null
          record_id: string | null
          old_data: Json | null
          new_data: Json | null
          ip_address: string | null
          user_agent: string | null
          module: string | null
          description: string | null
          related_record_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          action: string
          table_name?: string | null
          record_id?: string | null
          old_data?: Json | null
          new_data?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          module?: string | null
          description?: string | null
          related_record_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          action?: string
          table_name?: string | null
          record_id?: string | null
          old_data?: Json | null
          new_data?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          module?: string | null
          description?: string | null
          related_record_id?: string | null
          created_at?: string
        }
      }
      monthly_allowance_settings: {
        Row: {
          id: string
          month: number
          year: number
          amount: number
          minimum_attendance_percentage: number
          status: string
          created_by: string | null
          updated_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          month: number
          year: number
          amount: number
          minimum_attendance_percentage?: number
          status?: string
          created_by?: string | null
          updated_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          month?: number
          year?: number
          amount?: number
          minimum_attendance_percentage?: number
          status?: string
          created_by?: string | null
          updated_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      monthly_allowance_eligible_roles: {
        Row: {
          id: string
          allowance_setting_id: string | null
          role_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          allowance_setting_id?: string | null
          role_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          allowance_setting_id?: string | null
          role_id?: string | null
          created_at?: string
        }
      }
      monthly_allowance_eligible_departments: {
        Row: {
          id: string
          allowance_setting_id: string | null
          department_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          allowance_setting_id?: string | null
          department_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          allowance_setting_id?: string | null
          department_id?: string | null
          created_at?: string
        }
      }
      monthly_allowance_requests: {
        Row: {
          id: string
          staff_id: string
          department_id: string | null
          role_id: string | null
          month: number
          year: number
          attendance_percentage: number
          allowance_amount: number
          status: string
          requested_at: string
          reviewed_by: string | null
          reviewed_at: string | null
          paid_at: string | null
          rejection_reason: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          staff_id: string
          department_id?: string | null
          role_id?: string | null
          month: number
          year: number
          attendance_percentage: number
          allowance_amount: number
          status?: string
          requested_at?: string
          reviewed_by?: string | null
          reviewed_at?: string | null
          paid_at?: string | null
          rejection_reason?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          staff_id?: string
          department_id?: string | null
          role_id?: string | null
          month?: number
          year?: number
          attendance_percentage?: number
          allowance_amount?: number
          status?: string
          requested_at?: string
          reviewed_by?: string | null
          reviewed_at?: string | null
          paid_at?: string | null
          rejection_reason?: string | null
          created_at?: string
          updated_at?: string
        }
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
