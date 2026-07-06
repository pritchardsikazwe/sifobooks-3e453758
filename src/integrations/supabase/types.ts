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
      approval_hierarchies: {
        Row: {
          approver_role: string
          company_id: string
          created_at: string
          id: string
          level: number
          max_amount: number | null
          min_amount: number | null
          module: string
          updated_at: string
          user_id: string
        }
        Insert: {
          approver_role: string
          company_id: string
          created_at?: string
          id?: string
          level?: number
          max_amount?: number | null
          min_amount?: number | null
          module: string
          updated_at?: string
          user_id: string
        }
        Update: {
          approver_role?: string
          company_id?: string
          created_at?: string
          id?: string
          level?: number
          max_amount?: number | null
          min_amount?: number | null
          module?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_hierarchies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_transactions: {
        Row: {
          amount: number
          balance: number | null
          category: string | null
          created_at: string
          description: string
          id: string
          matched_invoice: string | null
          reference: string | null
          source_file: string | null
          txn_date: string
          user_id: string
        }
        Insert: {
          amount: number
          balance?: number | null
          category?: string | null
          created_at?: string
          description: string
          id?: string
          matched_invoice?: string | null
          reference?: string | null
          source_file?: string | null
          txn_date: string
          user_id: string
        }
        Update: {
          amount?: number
          balance?: number | null
          category?: string | null
          created_at?: string
          description?: string
          id?: string
          matched_invoice?: string | null
          reference?: string | null
          source_file?: string | null
          txn_date?: string
          user_id?: string
        }
        Relationships: []
      }
      branches: {
        Row: {
          active: boolean
          address: string | null
          city: string | null
          code: string | null
          company_id: string
          created_at: string
          id: string
          manager_name: string | null
          name: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          address?: string | null
          city?: string | null
          code?: string | null
          company_id: string
          created_at?: string
          id?: string
          manager_name?: string | null
          name: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          address?: string | null
          city?: string | null
          code?: string | null
          company_id?: string
          created_at?: string
          id?: string
          manager_name?: string | null
          name?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "branches_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address: string | null
          base_currency: string
          city: string | null
          country: string | null
          created_at: string
          email: string | null
          financial_year_start_month: number
          id: string
          is_primary: boolean
          logo_url: string | null
          name: string
          phone: string | null
          timezone: string
          tpin: string | null
          trading_name: string | null
          updated_at: string
          user_id: string
          vat_number: string | null
          vat_registered: boolean
          website: string | null
        }
        Insert: {
          address?: string | null
          base_currency?: string
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          financial_year_start_month?: number
          id?: string
          is_primary?: boolean
          logo_url?: string | null
          name: string
          phone?: string | null
          timezone?: string
          tpin?: string | null
          trading_name?: string | null
          updated_at?: string
          user_id: string
          vat_number?: string | null
          vat_registered?: boolean
          website?: string | null
        }
        Update: {
          address?: string | null
          base_currency?: string
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          financial_year_start_month?: number
          id?: string
          is_primary?: boolean
          logo_url?: string | null
          name?: string
          phone?: string | null
          timezone?: string
          tpin?: string | null
          trading_name?: string | null
          updated_at?: string
          user_id?: string
          vat_number?: string | null
          vat_registered?: boolean
          website?: string | null
        }
        Relationships: []
      }
      compliance_obligations: {
        Row: {
          amount: number | null
          body: string
          created_at: string
          due_date: string
          id: string
          notes: string | null
          obligation_type: string
          period: string
          reference: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number | null
          body: string
          created_at?: string
          due_date: string
          id?: string
          notes?: string | null
          obligation_type: string
          period: string
          reference?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number | null
          body?: string
          created_at?: string
          due_date?: string
          id?: string
          notes?: string | null
          obligation_type?: string
          period?: string
          reference?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      cost_centres: {
        Row: {
          annual_budget: number | null
          code: string | null
          company_id: string
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          annual_budget?: number | null
          code?: string | null
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          annual_budget?: number | null
          code?: string | null
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cost_centres_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          active: boolean
          address: string | null
          city: string | null
          company_id: string | null
          contact_person: string | null
          country: string | null
          created_at: string
          credit_limit: number | null
          email: string | null
          id: string
          name: string
          notes: string | null
          payment_terms_days: number
          phone: string | null
          tpin: string | null
          updated_at: string
          user_id: string
          vat_number: string | null
        }
        Insert: {
          active?: boolean
          address?: string | null
          city?: string | null
          company_id?: string | null
          contact_person?: string | null
          country?: string | null
          created_at?: string
          credit_limit?: number | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          payment_terms_days?: number
          phone?: string | null
          tpin?: string | null
          updated_at?: string
          user_id: string
          vat_number?: string | null
        }
        Update: {
          active?: boolean
          address?: string | null
          city?: string | null
          company_id?: string | null
          contact_person?: string | null
          country?: string | null
          created_at?: string
          credit_limit?: number | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          payment_terms_days?: number
          phone?: string | null
          tpin?: string | null
          updated_at?: string
          user_id?: string
          vat_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          code: string | null
          company_id: string
          created_at: string
          description: string | null
          id: string
          manager_name: string | null
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          code?: string | null
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          manager_name?: string | null
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          code?: string | null
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          manager_name?: string | null
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      positions: {
        Row: {
          company_id: string
          created_at: string
          department_id: string | null
          description: string | null
          id: string
          level: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          department_id?: string | null
          description?: string | null
          id?: string
          level?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          department_id?: string | null
          description?: string | null
          id?: string
          level?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "positions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "positions_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          business_name: string | null
          country: string | null
          created_at: string
          currency: string | null
          email: string | null
          full_name: string | null
          id: string
          industry: string | null
          onboarded: boolean
          phone: string | null
          tax_id: string | null
          team_size: string | null
          tpin: string | null
          updated_at: string
          vat_registered: boolean
        }
        Insert: {
          business_name?: string | null
          country?: string | null
          created_at?: string
          currency?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          industry?: string | null
          onboarded?: boolean
          phone?: string | null
          tax_id?: string | null
          team_size?: string | null
          tpin?: string | null
          updated_at?: string
          vat_registered?: boolean
        }
        Update: {
          business_name?: string | null
          country?: string | null
          created_at?: string
          currency?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          industry?: string | null
          onboarded?: boolean
          phone?: string | null
          tax_id?: string | null
          team_size?: string | null
          tpin?: string | null
          updated_at?: string
          vat_registered?: boolean
        }
        Relationships: []
      }
      stock_items: {
        Row: {
          cost_price: number
          created_at: string
          description: string | null
          hs_code: string | null
          id: string
          name: string
          quantity_on_hand: number
          reorder_level: number
          sell_price: number
          sku: string | null
          tax_category: string
          unit: string
          updated_at: string
          user_id: string
          vat_rate: number
        }
        Insert: {
          cost_price?: number
          created_at?: string
          description?: string | null
          hs_code?: string | null
          id?: string
          name: string
          quantity_on_hand?: number
          reorder_level?: number
          sell_price?: number
          sku?: string | null
          tax_category?: string
          unit?: string
          updated_at?: string
          user_id: string
          vat_rate?: number
        }
        Update: {
          cost_price?: number
          created_at?: string
          description?: string | null
          hs_code?: string | null
          id?: string
          name?: string
          quantity_on_hand?: number
          reorder_level?: number
          sell_price?: number
          sku?: string | null
          tax_category?: string
          unit?: string
          updated_at?: string
          user_id?: string
          vat_rate?: number
        }
        Relationships: []
      }
      stock_movements: {
        Row: {
          created_at: string
          id: string
          item_id: string
          movement_type: string
          note: string | null
          quantity: number
          reference: string | null
          unit_cost: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          movement_type: string
          note?: string | null
          quantity: number
          reference?: string | null
          unit_cost?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          movement_type?: string
          note?: string | null
          quantity?: number
          reference?: string | null
          unit_cost?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "stock_items"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_settings: {
        Row: {
          applies_to: string
          company_id: string
          created_at: string
          id: string
          is_default: boolean
          rate: number
          tax_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          applies_to?: string
          company_id: string
          created_at?: string
          id?: string
          is_default?: boolean
          rate?: number
          tax_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          applies_to?: string
          company_id?: string
          created_at?: string
          id?: string
          is_default?: boolean
          rate?: number
          tax_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tax_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
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
