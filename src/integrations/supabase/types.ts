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
      approval_actions: {
        Row: {
          action: string
          actor_id: string
          created_at: string
          id: string
          level: number
          notes: string | null
          request_id: string
        }
        Insert: {
          action: string
          actor_id: string
          created_at?: string
          id?: string
          level: number
          notes?: string | null
          request_id: string
        }
        Update: {
          action?: string
          actor_id?: string
          created_at?: string
          id?: string
          level?: number
          notes?: string | null
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_actions_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "approval_requests"
            referencedColumns: ["id"]
          },
        ]
      }
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
      approval_requests: {
        Row: {
          amount: number
          company_id: string | null
          created_at: string
          currency: string
          current_level: number
          decided_at: string | null
          decided_by: string | null
          decision_notes: string | null
          description: string | null
          id: string
          max_level: number
          module: string
          reference_id: string | null
          reference_number: string | null
          reference_type: string
          requested_by: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          company_id?: string | null
          created_at?: string
          currency?: string
          current_level?: number
          decided_at?: string | null
          decided_by?: string | null
          decision_notes?: string | null
          description?: string | null
          id?: string
          max_level?: number
          module: string
          reference_id?: string | null
          reference_number?: string | null
          reference_type: string
          requested_by: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          company_id?: string | null
          created_at?: string
          currency?: string
          current_level?: number
          decided_at?: string | null
          decided_by?: string | null
          decision_notes?: string | null
          description?: string | null
          id?: string
          max_level?: number
          module?: string
          reference_id?: string | null
          reference_number?: string | null
          reference_type?: string
          requested_by?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      attendance: {
        Row: {
          attendance_date: string
          clock_in: string | null
          clock_out: string | null
          created_at: string
          employee_id: string
          hours_worked: number | null
          id: string
          notes: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          attendance_date?: string
          clock_in?: string | null
          clock_out?: string | null
          created_at?: string
          employee_id: string
          hours_worked?: number | null
          id?: string
          notes?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          attendance_date?: string
          clock_in?: string | null
          clock_out?: string | null
          created_at?: string
          employee_id?: string
          hours_worked?: number | null
          id?: string
          notes?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_email: string | null
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: string | null
          user_id: string
        }
        Insert: {
          action: string
          actor_email?: string | null
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          user_id: string
        }
        Update: {
          action?: string
          actor_email?: string | null
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          user_id?: string
        }
        Relationships: []
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
      bill_items: {
        Row: {
          bill_id: string
          created_at: string
          description: string
          id: string
          item_id: string | null
          line_total: number
          quantity: number
          tax_rate: number | null
          unit_price: number
          user_id: string
        }
        Insert: {
          bill_id: string
          created_at?: string
          description: string
          id?: string
          item_id?: string | null
          line_total?: number
          quantity?: number
          tax_rate?: number | null
          unit_price?: number
          user_id: string
        }
        Update: {
          bill_id?: string
          created_at?: string
          description?: string
          id?: string
          item_id?: string | null
          line_total?: number
          quantity?: number
          tax_rate?: number | null
          unit_price?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bill_items_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bill_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "stock_items"
            referencedColumns: ["id"]
          },
        ]
      }
      bill_payments: {
        Row: {
          amount: number
          bill_id: string
          created_at: string
          id: string
          notes: string | null
          payment_date: string
          payment_method: string
          payment_number: string
          reference: string | null
          supplier_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          bill_id: string
          created_at?: string
          id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string
          payment_number: string
          reference?: string | null
          supplier_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          bill_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string
          payment_number?: string
          reference?: string | null
          supplier_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bill_payments_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bill_payments_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      bills: {
        Row: {
          amount_paid: number | null
          balance_due: number | null
          bill_date: string
          bill_number: string
          created_at: string
          currency: string | null
          due_date: string | null
          id: string
          notes: string | null
          po_id: string | null
          status: string
          subtotal: number | null
          supplier_id: string | null
          supplier_invoice_number: string | null
          tax_amount: number | null
          total: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_paid?: number | null
          balance_due?: number | null
          bill_date?: string
          bill_number: string
          created_at?: string
          currency?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          po_id?: string | null
          status?: string
          subtotal?: number | null
          supplier_id?: string | null
          supplier_invoice_number?: string | null
          tax_amount?: number | null
          total?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_paid?: number | null
          balance_due?: number | null
          bill_date?: string
          bill_number?: string
          created_at?: string
          currency?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          po_id?: string | null
          status?: string
          subtotal?: number | null
          supplier_id?: string | null
          supplier_invoice_number?: string | null
          tax_amount?: number | null
          total?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bills_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bills_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
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
      budgets: {
        Row: {
          account_id: string | null
          actual_amount: number | null
          budgeted_amount: number
          created_at: string
          department_id: string | null
          fiscal_year: number
          id: string
          name: string
          notes: string | null
          period: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          actual_amount?: number | null
          budgeted_amount?: number
          created_at?: string
          department_id?: string | null
          fiscal_year: number
          id?: string
          name: string
          notes?: string | null
          period?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          actual_amount?: number | null
          budgeted_amount?: number
          created_at?: string
          department_id?: string | null
          fiscal_year?: number
          id?: string
          name?: string
          notes?: string | null
          period?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "budgets_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      chart_of_accounts: {
        Row: {
          account_code: string
          account_name: string
          account_type: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          parent_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_code: string
          account_name: string
          account_type: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          parent_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_code?: string
          account_name?: string
          account_type?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          parent_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chart_of_accounts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
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
      company_members: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          invited_email: string | null
          role: Database["public"]["Enums"]["company_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          invited_email?: string | null
          role?: Database["public"]["Enums"]["company_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          invited_email?: string | null
          role?: Database["public"]["Enums"]["company_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_subscriptions: {
        Row: {
          cancel_at: string | null
          company_id: string
          created_at: string
          current_period_end: string
          id: string
          plan_id: string
          started_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at?: string | null
          company_id: string
          created_at?: string
          current_period_end?: string
          id?: string
          plan_id: string
          started_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at?: string | null
          company_id?: string
          created_at?: string
          current_period_end?: string
          id?: string
          plan_id?: string
          started_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_subscriptions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
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
      credit_note_items: {
        Row: {
          created_at: string
          credit_note_id: string
          description: string
          id: string
          line_total: number
          quantity: number
          stock_item_id: string | null
          unit_price: number
          user_id: string
          vat_rate: number
        }
        Insert: {
          created_at?: string
          credit_note_id: string
          description: string
          id?: string
          line_total?: number
          quantity?: number
          stock_item_id?: string | null
          unit_price?: number
          user_id: string
          vat_rate?: number
        }
        Update: {
          created_at?: string
          credit_note_id?: string
          description?: string
          id?: string
          line_total?: number
          quantity?: number
          stock_item_id?: string | null
          unit_price?: number
          user_id?: string
          vat_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "credit_note_items_credit_note_id_fkey"
            columns: ["credit_note_id"]
            isOneToOne: false
            referencedRelation: "credit_notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_note_items_stock_item_id_fkey"
            columns: ["stock_item_id"]
            isOneToOne: false
            referencedRelation: "stock_items"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_notes: {
        Row: {
          created_at: string
          currency: string
          customer_id: string | null
          id: string
          invoice_id: string | null
          issue_date: string
          notes: string | null
          number: string
          reason: string | null
          status: string
          subtotal: number
          total: number
          updated_at: string
          user_id: string
          vat_amount: number
        }
        Insert: {
          created_at?: string
          currency?: string
          customer_id?: string | null
          id?: string
          invoice_id?: string | null
          issue_date?: string
          notes?: string | null
          number: string
          reason?: string | null
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
          user_id: string
          vat_amount?: number
        }
        Update: {
          created_at?: string
          currency?: string
          customer_id?: string | null
          id?: string
          invoice_id?: string | null
          issue_date?: string
          notes?: string | null
          number?: string
          reason?: string | null
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
          user_id?: string
          vat_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "credit_notes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_notes_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_communications: {
        Row: {
          body: string
          channel: string
          created_at: string
          customer_id: string
          direction: string
          id: string
          occurred_at: string
          subject: string | null
          user_id: string
        }
        Insert: {
          body: string
          channel?: string
          created_at?: string
          customer_id: string
          direction?: string
          id?: string
          occurred_at?: string
          subject?: string | null
          user_id: string
        }
        Update: {
          body?: string
          channel?: string
          created_at?: string
          customer_id?: string
          direction?: string
          id?: string
          occurred_at?: string
          subject?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_communications_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
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
      employees: {
        Row: {
          address: string | null
          bank_account: string | null
          bank_name: string | null
          basic_salary: number | null
          branch_id: string | null
          created_at: string
          date_of_birth: string | null
          department_id: string | null
          email: string | null
          emergency_contact: string | null
          employee_code: string | null
          employment_type: string | null
          first_name: string
          gender: string | null
          hire_date: string | null
          id: string
          last_name: string
          manager_id: string | null
          napsa_number: string | null
          national_id: string | null
          nhima_number: string | null
          phone: string | null
          position_id: string | null
          status: string | null
          termination_date: string | null
          tpin: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          bank_account?: string | null
          bank_name?: string | null
          basic_salary?: number | null
          branch_id?: string | null
          created_at?: string
          date_of_birth?: string | null
          department_id?: string | null
          email?: string | null
          emergency_contact?: string | null
          employee_code?: string | null
          employment_type?: string | null
          first_name: string
          gender?: string | null
          hire_date?: string | null
          id?: string
          last_name: string
          manager_id?: string | null
          napsa_number?: string | null
          national_id?: string | null
          nhima_number?: string | null
          phone?: string | null
          position_id?: string | null
          status?: string | null
          termination_date?: string | null
          tpin?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          bank_account?: string | null
          bank_name?: string | null
          basic_salary?: number | null
          branch_id?: string | null
          created_at?: string
          date_of_birth?: string | null
          department_id?: string | null
          email?: string | null
          emergency_contact?: string | null
          employee_code?: string | null
          employment_type?: string | null
          first_name?: string
          gender?: string | null
          hire_date?: string | null
          id?: string
          last_name?: string
          manager_id?: string | null
          napsa_number?: string | null
          national_id?: string | null
          nhima_number?: string | null
          phone?: string | null
          position_id?: string | null
          status?: string | null
          termination_date?: string | null
          tpin?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employees_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          category: string
          created_at: string
          description: string | null
          enabled: boolean
          key: string
          label: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          enabled?: boolean
          key: string
          label: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          enabled?: boolean
          key?: string
          label?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      invoice_items: {
        Row: {
          created_at: string
          description: string
          hs_code: string | null
          id: string
          invoice_id: string
          line_total: number
          quantity: number
          stock_item_id: string | null
          unit_price: number
          user_id: string
          vat_rate: number
        }
        Insert: {
          created_at?: string
          description: string
          hs_code?: string | null
          id?: string
          invoice_id: string
          line_total?: number
          quantity?: number
          stock_item_id?: string | null
          unit_price?: number
          user_id: string
          vat_rate?: number
        }
        Update: {
          created_at?: string
          description?: string
          hs_code?: string | null
          id?: string
          invoice_id?: string
          line_total?: number
          quantity?: number
          stock_item_id?: string | null
          unit_price?: number
          user_id?: string
          vat_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_stock_item_id_fkey"
            columns: ["stock_item_id"]
            isOneToOne: false
            referencedRelation: "stock_items"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount_paid: number
          balance_due: number
          buyer_tpin: string | null
          created_at: string
          currency: string
          customer_id: string | null
          due_date: string | null
          id: string
          issue_date: string
          notes: string | null
          number: string
          quote_id: string | null
          seller_tpin: string | null
          status: string
          subtotal: number
          total: number
          updated_at: string
          user_id: string
          vat_amount: number
          void_reason: string | null
          voided_at: string | null
        }
        Insert: {
          amount_paid?: number
          balance_due?: number
          buyer_tpin?: string | null
          created_at?: string
          currency?: string
          customer_id?: string | null
          due_date?: string | null
          id?: string
          issue_date?: string
          notes?: string | null
          number: string
          quote_id?: string | null
          seller_tpin?: string | null
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
          user_id: string
          vat_amount?: number
          void_reason?: string | null
          voided_at?: string | null
        }
        Update: {
          amount_paid?: number
          balance_due?: number
          buyer_tpin?: string | null
          created_at?: string
          currency?: string
          customer_id?: string | null
          due_date?: string | null
          id?: string
          issue_date?: string
          notes?: string | null
          number?: string
          quote_id?: string | null
          seller_tpin?: string | null
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
          user_id?: string
          vat_amount?: number
          void_reason?: string | null
          voided_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entries: {
        Row: {
          created_at: string
          description: string | null
          entry_date: string
          entry_number: string
          id: string
          reference: string | null
          status: string
          total_credit: number | null
          total_debit: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          entry_date?: string
          entry_number: string
          id?: string
          reference?: string | null
          status?: string
          total_credit?: number | null
          total_debit?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          entry_date?: string
          entry_number?: string
          id?: string
          reference?: string | null
          status?: string
          total_credit?: number | null
          total_debit?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      journal_lines: {
        Row: {
          account_id: string | null
          created_at: string
          credit: number | null
          debit: number | null
          description: string | null
          entry_id: string
          id: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          created_at?: string
          credit?: number | null
          debit?: number | null
          description?: string | null
          entry_id: string
          id?: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          created_at?: string
          credit?: number | null
          debit?: number | null
          description?: string | null
          entry_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_lines_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          days: number
          employee_id: string
          end_date: string
          id: string
          leave_type: string
          reason: string | null
          start_date: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          days?: number
          employee_id: string
          end_date: string
          id?: string
          leave_type?: string
          reason?: string | null
          start_date: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          days?: number
          employee_id?: string
          end_date?: string
          id?: string
          leave_type?: string
          reason?: string | null
          start_date?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          link: string | null
          message: string | null
          read: boolean | null
          title: string
          type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          link?: string | null
          message?: string | null
          read?: boolean | null
          title: string
          type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          link?: string | null
          message?: string | null
          read?: boolean | null
          title?: string
          type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      payroll_runs: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          pay_date: string | null
          period_month: number
          period_year: number
          run_number: string
          status: string
          total_gross: number | null
          total_napsa: number | null
          total_net: number | null
          total_nhima: number | null
          total_paye: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          pay_date?: string | null
          period_month: number
          period_year: number
          run_number: string
          status?: string
          total_gross?: number | null
          total_napsa?: number | null
          total_net?: number | null
          total_nhima?: number | null
          total_paye?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          pay_date?: string | null
          period_month?: number
          period_year?: number
          run_number?: string
          status?: string
          total_gross?: number | null
          total_napsa?: number | null
          total_net?: number | null
          total_nhima?: number | null
          total_paye?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      payslips: {
        Row: {
          allowances: number | null
          basic_salary: number | null
          created_at: string
          employee_id: string
          gross_pay: number | null
          id: string
          napsa: number | null
          net_pay: number | null
          nhima: number | null
          other_deductions: number | null
          overtime: number | null
          paye: number | null
          payroll_run_id: string
          user_id: string
        }
        Insert: {
          allowances?: number | null
          basic_salary?: number | null
          created_at?: string
          employee_id: string
          gross_pay?: number | null
          id?: string
          napsa?: number | null
          net_pay?: number | null
          nhima?: number | null
          other_deductions?: number | null
          overtime?: number | null
          paye?: number | null
          payroll_run_id: string
          user_id: string
        }
        Update: {
          allowances?: number | null
          basic_salary?: number | null
          created_at?: string
          employee_id?: string
          gross_pay?: number | null
          id?: string
          napsa?: number | null
          net_pay?: number | null
          nhima?: number | null
          other_deductions?: number | null
          overtime?: number | null
          paye?: number | null
          payroll_run_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payslips_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payslips_payroll_run_id_fkey"
            columns: ["payroll_run_id"]
            isOneToOne: false
            referencedRelation: "payroll_runs"
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
      purchase_order_items: {
        Row: {
          created_at: string
          description: string
          id: string
          item_id: string | null
          line_total: number
          po_id: string
          quantity: number
          tax_rate: number | null
          unit_price: number
          user_id: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          item_id?: string | null
          line_total?: number
          po_id: string
          quantity?: number
          tax_rate?: number | null
          unit_price?: number
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          item_id?: string | null
          line_total?: number
          po_id?: string
          quantity?: number
          tax_rate?: number | null
          unit_price?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "stock_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          created_at: string
          currency: string | null
          expected_date: string | null
          id: string
          notes: string | null
          order_date: string
          po_number: string
          status: string
          subtotal: number | null
          supplier_id: string | null
          tax_amount: number | null
          total: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          currency?: string | null
          expected_date?: string | null
          id?: string
          notes?: string | null
          order_date?: string
          po_number: string
          status?: string
          subtotal?: number | null
          supplier_id?: string | null
          tax_amount?: number | null
          total?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          currency?: string | null
          expected_date?: string | null
          id?: string
          notes?: string | null
          order_date?: string
          po_number?: string
          status?: string
          subtotal?: number | null
          supplier_id?: string | null
          tax_amount?: number | null
          total?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_items: {
        Row: {
          created_at: string
          description: string
          hs_code: string | null
          id: string
          line_total: number
          quantity: number
          quote_id: string
          stock_item_id: string | null
          unit_price: number
          user_id: string
          vat_rate: number
        }
        Insert: {
          created_at?: string
          description: string
          hs_code?: string | null
          id?: string
          line_total?: number
          quantity?: number
          quote_id: string
          stock_item_id?: string | null
          unit_price?: number
          user_id: string
          vat_rate?: number
        }
        Update: {
          created_at?: string
          description?: string
          hs_code?: string | null
          id?: string
          line_total?: number
          quantity?: number
          quote_id?: string
          stock_item_id?: string | null
          unit_price?: number
          user_id?: string
          vat_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "quote_items_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_items_stock_item_id_fkey"
            columns: ["stock_item_id"]
            isOneToOne: false
            referencedRelation: "stock_items"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          converted_invoice_id: string | null
          created_at: string
          currency: string
          customer_id: string | null
          id: string
          issue_date: string
          notes: string | null
          number: string
          status: string
          subtotal: number
          total: number
          updated_at: string
          user_id: string
          valid_until: string | null
          vat_amount: number
          void_reason: string | null
          voided_at: string | null
        }
        Insert: {
          converted_invoice_id?: string | null
          created_at?: string
          currency?: string
          customer_id?: string | null
          id?: string
          issue_date?: string
          notes?: string | null
          number: string
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
          user_id: string
          valid_until?: string | null
          vat_amount?: number
          void_reason?: string | null
          voided_at?: string | null
        }
        Update: {
          converted_invoice_id?: string | null
          created_at?: string
          currency?: string
          customer_id?: string | null
          id?: string
          issue_date?: string
          notes?: string | null
          number?: string
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
          user_id?: string
          valid_until?: string | null
          vat_amount?: number
          void_reason?: string | null
          voided_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      receipts: {
        Row: {
          amount: number
          created_at: string
          currency: string
          customer_id: string | null
          id: string
          invoice_id: string | null
          method: string
          notes: string | null
          number: string
          receipt_date: string
          reference: string | null
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          currency?: string
          customer_id?: string | null
          id?: string
          invoice_id?: string | null
          method?: string
          notes?: string | null
          number: string
          receipt_date?: string
          reference?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          customer_id?: string | null
          id?: string
          invoice_id?: string | null
          method?: string
          notes?: string | null
          number?: string
          receipt_date?: string
          reference?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "receipts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_adjustments: {
        Row: {
          adjustment_date: string
          adjustment_number: string
          adjustment_type: string
          created_at: string
          id: string
          item_id: string | null
          notes: string | null
          quantity_after: number
          quantity_before: number | null
          reason: string | null
          user_id: string
          warehouse_id: string | null
        }
        Insert: {
          adjustment_date?: string
          adjustment_number: string
          adjustment_type?: string
          created_at?: string
          id?: string
          item_id?: string | null
          notes?: string | null
          quantity_after: number
          quantity_before?: number | null
          reason?: string | null
          user_id: string
          warehouse_id?: string | null
        }
        Update: {
          adjustment_date?: string
          adjustment_number?: string
          adjustment_type?: string
          created_at?: string
          id?: string
          item_id?: string | null
          notes?: string | null
          quantity_after?: number
          quantity_before?: number | null
          reason?: string | null
          user_id?: string
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_adjustments_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "stock_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_adjustments_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
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
      subscription_plans: {
        Row: {
          code: string
          created_at: string
          currency: string
          features: Json
          id: string
          is_active: boolean
          max_invoices: number | null
          max_users: number
          name: string
          price_monthly: number
          sort_order: number
        }
        Insert: {
          code: string
          created_at?: string
          currency?: string
          features?: Json
          id?: string
          is_active?: boolean
          max_invoices?: number | null
          max_users?: number
          name: string
          price_monthly?: number
          sort_order?: number
        }
        Update: {
          code?: string
          created_at?: string
          currency?: string
          features?: Json
          id?: string
          is_active?: boolean
          max_invoices?: number | null
          max_users?: number
          name?: string
          price_monthly?: number
          sort_order?: number
        }
        Relationships: []
      }
      suppliers: {
        Row: {
          address: string | null
          contact_person: string | null
          created_at: string
          currency: string | null
          current_balance: number | null
          email: string | null
          id: string
          name: string
          notes: string | null
          opening_balance: number | null
          payment_terms: number | null
          phone: string | null
          status: string | null
          supplier_code: string | null
          tpin: string | null
          updated_at: string
          user_id: string
          vat_number: string | null
        }
        Insert: {
          address?: string | null
          contact_person?: string | null
          created_at?: string
          currency?: string | null
          current_balance?: number | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          opening_balance?: number | null
          payment_terms?: number | null
          phone?: string | null
          status?: string | null
          supplier_code?: string | null
          tpin?: string | null
          updated_at?: string
          user_id: string
          vat_number?: string | null
        }
        Update: {
          address?: string | null
          contact_person?: string | null
          created_at?: string
          currency?: string | null
          current_balance?: number | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          opening_balance?: number | null
          payment_terms?: number | null
          phone?: string | null
          status?: string | null
          supplier_code?: string | null
          tpin?: string | null
          updated_at?: string
          user_id?: string
          vat_number?: string | null
        }
        Relationships: []
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
      warehouses: {
        Row: {
          branch_id: string | null
          code: string | null
          created_at: string
          id: string
          is_active: boolean | null
          location: string | null
          manager: string | null
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          branch_id?: string | null
          code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          location?: string | null
          manager?: string | null
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          branch_id?: string | null
          code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          location?: string | null
          manager?: string | null
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "warehouses_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      approver_role_for_request: { Args: { _req: string }; Returns: string }
      can_act_on_request: {
        Args: { _req: string; _user: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_company_admin: {
        Args: { _company: string; _user: string }
        Returns: boolean
      }
      recalc_invoice_balance: {
        Args: { _invoice_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "manager"
        | "accountant"
        | "sales"
        | "purchaser"
        | "hr"
        | "viewer"
        | "super_admin"
      company_role: "owner" | "admin" | "manager" | "staff" | "viewer"
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
      app_role: [
        "admin",
        "manager",
        "accountant",
        "sales",
        "purchaser",
        "hr",
        "viewer",
        "super_admin",
      ],
      company_role: ["owner", "admin", "manager", "staff", "viewer"],
    },
  },
} as const
