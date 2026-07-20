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
      afs_reports: {
        Row: {
          ai_cashflow: string | null
          ai_strategy: string | null
          ai_summary: string | null
          ai_variance: string | null
          created_at: string
          currency: string | null
          fiscal_year: number
          id: string
          payload: Json
          period_end: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_cashflow?: string | null
          ai_strategy?: string | null
          ai_summary?: string | null
          ai_variance?: string | null
          created_at?: string
          currency?: string | null
          fiscal_year: number
          id?: string
          payload: Json
          period_end: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_cashflow?: string | null
          ai_strategy?: string | null
          ai_summary?: string | null
          ai_variance?: string | null
          created_at?: string
          currency?: string | null
          fiscal_year?: number
          id?: string
          payload?: Json
          period_end?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
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
      bank_accounts: {
        Row: {
          account_number: string | null
          bank_name: string | null
          company_id: string | null
          created_at: string
          currency: string
          gl_account_id: string | null
          id: string
          is_active: boolean
          name: string
          notes: string | null
          opening_balance: number
          opening_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_number?: string | null
          bank_name?: string | null
          company_id?: string | null
          created_at?: string
          currency?: string
          gl_account_id?: string | null
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          opening_balance?: number
          opening_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          account_number?: string | null
          bank_name?: string | null
          company_id?: string | null
          created_at?: string
          currency?: string
          gl_account_id?: string | null
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          opening_balance?: number
          opening_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_accounts_gl_account_id_fkey"
            columns: ["gl_account_id"]
            isOneToOne: false
            referencedRelation: "account_balances"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "bank_accounts_gl_account_id_fkey"
            columns: ["gl_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_allocations: {
        Row: {
          allocated_at: string
          allocated_by: string | null
          amount: number
          bank_account_id: string | null
          bank_txn_id: string
          created_at: string
          id: string
          is_reversed: boolean
          journal_entry_id: string | null
          memo: string | null
          reference: string | null
          reversal_entry_id: string | null
          reverse_reason: string | null
          reversed_at: string | null
          reversed_by: string | null
          target_id: string | null
          target_ref: string | null
          target_type: string
          user_id: string
        }
        Insert: {
          allocated_at?: string
          allocated_by?: string | null
          amount: number
          bank_account_id?: string | null
          bank_txn_id: string
          created_at?: string
          id?: string
          is_reversed?: boolean
          journal_entry_id?: string | null
          memo?: string | null
          reference?: string | null
          reversal_entry_id?: string | null
          reverse_reason?: string | null
          reversed_at?: string | null
          reversed_by?: string | null
          target_id?: string | null
          target_ref?: string | null
          target_type: string
          user_id: string
        }
        Update: {
          allocated_at?: string
          allocated_by?: string | null
          amount?: number
          bank_account_id?: string | null
          bank_txn_id?: string
          created_at?: string
          id?: string
          is_reversed?: boolean
          journal_entry_id?: string | null
          memo?: string | null
          reference?: string | null
          reversal_entry_id?: string | null
          reverse_reason?: string | null
          reversed_at?: string | null
          reversed_by?: string | null
          target_id?: string | null
          target_ref?: string | null
          target_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_allocations_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_allocations_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_running_balance"
            referencedColumns: ["bank_account_id"]
          },
          {
            foreignKeyName: "bank_allocations_bank_txn_id_fkey"
            columns: ["bank_txn_id"]
            isOneToOne: false
            referencedRelation: "bank_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_allocations_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_allocations_reversal_entry_id_fkey"
            columns: ["reversal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_documents: {
        Row: {
          bank_account_id: string | null
          bank_txn_id: string | null
          file_name: string | null
          file_path: string
          id: string
          mime_type: string | null
          size_bytes: number | null
          uploaded_at: string
          user_id: string
        }
        Insert: {
          bank_account_id?: string | null
          bank_txn_id?: string | null
          file_name?: string | null
          file_path: string
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          uploaded_at?: string
          user_id?: string
        }
        Update: {
          bank_account_id?: string | null
          bank_txn_id?: string | null
          file_name?: string | null
          file_path?: string
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          uploaded_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_documents_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_documents_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_running_balance"
            referencedColumns: ["bank_account_id"]
          },
          {
            foreignKeyName: "bank_documents_bank_txn_id_fkey"
            columns: ["bank_txn_id"]
            isOneToOne: false
            referencedRelation: "bank_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_rules: {
        Row: {
          auto_apply: boolean
          created_at: string
          direction: string | null
          hits: number
          id: string
          is_active: boolean
          last_used_at: string | null
          match_type: string
          name: string
          pattern: string
          priority: number
          suggested_account_id: string | null
          suggested_target_type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_apply?: boolean
          created_at?: string
          direction?: string | null
          hits?: number
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          match_type?: string
          name: string
          pattern: string
          priority?: number
          suggested_account_id?: string | null
          suggested_target_type?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          auto_apply?: boolean
          created_at?: string
          direction?: string | null
          hits?: number
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          match_type?: string
          name?: string
          pattern?: string
          priority?: number
          suggested_account_id?: string | null
          suggested_target_type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_rules_suggested_account_id_fkey"
            columns: ["suggested_account_id"]
            isOneToOne: false
            referencedRelation: "account_balances"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "bank_rules_suggested_account_id_fkey"
            columns: ["suggested_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_transactions: {
        Row: {
          allocated_amount: number
          amount: number
          balance: number | null
          bank_account_id: string | null
          category: string | null
          created_at: string
          currency: string
          description: string
          exchange_rate: number
          id: string
          last_allocated_at: string | null
          matched_id: string | null
          matched_invoice: string | null
          matched_type: string | null
          reconciled: boolean
          reconciled_at: string | null
          reference: string | null
          source_file: string | null
          status: string
          txn_date: string
          user_id: string
        }
        Insert: {
          allocated_amount?: number
          amount: number
          balance?: number | null
          bank_account_id?: string | null
          category?: string | null
          created_at?: string
          currency?: string
          description: string
          exchange_rate?: number
          id?: string
          last_allocated_at?: string | null
          matched_id?: string | null
          matched_invoice?: string | null
          matched_type?: string | null
          reconciled?: boolean
          reconciled_at?: string | null
          reference?: string | null
          source_file?: string | null
          status?: string
          txn_date: string
          user_id: string
        }
        Update: {
          allocated_amount?: number
          amount?: number
          balance?: number | null
          bank_account_id?: string | null
          category?: string | null
          created_at?: string
          currency?: string
          description?: string
          exchange_rate?: number
          id?: string
          last_allocated_at?: string | null
          matched_id?: string | null
          matched_invoice?: string | null
          matched_type?: string | null
          reconciled?: boolean
          reconciled_at?: string | null
          reference?: string | null
          source_file?: string | null
          status?: string
          txn_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_transactions_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_running_balance"
            referencedColumns: ["bank_account_id"]
          },
        ]
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
          currency: string
          exchange_rate: number
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
          currency?: string
          exchange_rate?: number
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
          currency?: string
          exchange_rate?: number
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
          exchange_rate: number
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
          exchange_rate?: number
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
          exchange_rate?: number
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
            referencedRelation: "account_balances"
            referencedColumns: ["account_id"]
          },
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
      campaigns: {
        Row: {
          actual_cost: number | null
          budget: number | null
          channel: string | null
          created_at: string
          end_date: string | null
          id: string
          name: string
          notes: string | null
          start_date: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          actual_cost?: number | null
          budget?: number | null
          channel?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          name: string
          notes?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          actual_cost?: number | null
          budget?: number | null
          channel?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          name?: string
          notes?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chart_of_accounts: {
        Row: {
          account_code: string
          account_name: string
          account_type: string
          afs_note: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          parent_id: string | null
          reporting_class: string | null
          reporting_group: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_code: string
          account_name: string
          account_type: string
          afs_note?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          parent_id?: string | null
          reporting_class?: string | null
          reporting_group?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_code?: string
          account_name?: string
          account_type?: string
          afs_note?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          parent_id?: string | null
          reporting_class?: string | null
          reporting_group?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chart_of_accounts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "account_balances"
            referencedColumns: ["account_id"]
          },
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
          industry: string | null
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
          industry?: string | null
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
          industry?: string | null
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
      company_modules: {
        Row: {
          company_id: string
          config: Json
          created_at: string
          id: string
          installed_at: string
          module_key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          config?: Json
          created_at?: string
          id?: string
          installed_at?: string
          module_key: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          config?: Json
          created_at?: string
          id?: string
          installed_at?: string
          module_key?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_modules_company_id_fkey"
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
      complaints: {
        Row: {
          assigned_to: string | null
          created_at: string
          customer_id: string | null
          description: string | null
          id: string
          priority: string
          resolution: string | null
          resolved_at: string | null
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          customer_id?: string | null
          description?: string | null
          id?: string
          priority?: string
          resolution?: string | null
          resolved_at?: string | null
          status?: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          customer_id?: string | null
          description?: string | null
          id?: string
          priority?: string
          resolution?: string | null
          resolved_at?: string | null
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
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
          exchange_rate: number
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
          exchange_rate?: number
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
          exchange_rate?: number
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
      csat_responses: {
        Row: {
          comment: string | null
          created_at: string
          customer_id: string | null
          id: string
          invoice_id: string | null
          response_date: string
          score: number
          updated_at: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          customer_id?: string | null
          id?: string
          invoice_id?: string | null
          response_date?: string
          score: number
          updated_at?: string
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          customer_id?: string | null
          id?: string
          invoice_id?: string | null
          response_date?: string
          score?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
          contract_end_date: string | null
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
          job_description: string | null
          last_name: string
          leave_days_entitlement: number | null
          manager_id: string | null
          marital_status: string | null
          napsa_number: string | null
          national_id: string | null
          nhima_number: string | null
          num_children: number | null
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
          contract_end_date?: string | null
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
          job_description?: string | null
          last_name: string
          leave_days_entitlement?: number | null
          manager_id?: string | null
          marital_status?: string | null
          napsa_number?: string | null
          national_id?: string | null
          nhima_number?: string | null
          num_children?: number | null
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
          contract_end_date?: string | null
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
          job_description?: string | null
          last_name?: string
          leave_days_entitlement?: number | null
          manager_id?: string | null
          marital_status?: string | null
          napsa_number?: string | null
          national_id?: string | null
          nhima_number?: string | null
          num_children?: number | null
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
      expense_category_rules: {
        Row: {
          account_id: string
          created_at: string
          id: string
          is_active: boolean
          match_type: string
          match_value: string
          name: string
          priority: number
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          match_type: string
          match_value: string
          name: string
          priority?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          match_type?: string
          match_value?: string
          name?: string
          priority?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_category_rules_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "account_balances"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "expense_category_rules_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          bank_account_id: string | null
          category: string | null
          created_at: string
          currency: string
          exchange_rate: number
          expense_account_id: string | null
          expense_date: string
          expense_number: string | null
          id: string
          journal_entry_id: string | null
          notes: string | null
          payment_method: string
          reference: string | null
          reversed_by: string | null
          status: string
          supplier_id: string | null
          total: number
          updated_at: string
          user_id: string
          vat_amount: number
        }
        Insert: {
          amount?: number
          bank_account_id?: string | null
          category?: string | null
          created_at?: string
          currency?: string
          exchange_rate?: number
          expense_account_id?: string | null
          expense_date?: string
          expense_number?: string | null
          id?: string
          journal_entry_id?: string | null
          notes?: string | null
          payment_method?: string
          reference?: string | null
          reversed_by?: string | null
          status?: string
          supplier_id?: string | null
          total?: number
          updated_at?: string
          user_id: string
          vat_amount?: number
        }
        Update: {
          amount?: number
          bank_account_id?: string | null
          category?: string | null
          created_at?: string
          currency?: string
          exchange_rate?: number
          expense_account_id?: string | null
          expense_date?: string
          expense_number?: string | null
          id?: string
          journal_entry_id?: string | null
          notes?: string | null
          payment_method?: string
          reference?: string | null
          reversed_by?: string | null
          status?: string
          supplier_id?: string | null
          total?: number
          updated_at?: string
          user_id?: string
          vat_amount?: number
        }
        Relationships: []
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
      financial_periods: {
        Row: {
          closed_at: string | null
          closed_by: string | null
          created_at: string
          fiscal_year: number
          id: string
          notes: string | null
          period_month: number | null
          period_type: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          fiscal_year: number
          id?: string
          notes?: string | null
          period_month?: number | null
          period_type?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          fiscal_year?: number
          id?: string
          notes?: string | null
          period_month?: number | null
          period_type?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      fixed_assets: {
        Row: {
          accumulated_depreciation: number
          accumulated_depreciation_code: string | null
          asset_account_code: string | null
          asset_number: string
          book_value: number
          category: string | null
          condition: string | null
          cost: number
          created_at: string
          depreciation_expense_code: string | null
          description: string
          disposal_date: string | null
          disposal_proceeds: number | null
          id: string
          location: string | null
          method: string
          notes: string | null
          purchase_date: string
          salvage_value: number
          status: string
          supplier: string | null
          updated_at: string
          useful_life_years: number
          user_id: string
        }
        Insert: {
          accumulated_depreciation?: number
          accumulated_depreciation_code?: string | null
          asset_account_code?: string | null
          asset_number: string
          book_value?: number
          category?: string | null
          condition?: string | null
          cost?: number
          created_at?: string
          depreciation_expense_code?: string | null
          description: string
          disposal_date?: string | null
          disposal_proceeds?: number | null
          id?: string
          location?: string | null
          method?: string
          notes?: string | null
          purchase_date: string
          salvage_value?: number
          status?: string
          supplier?: string | null
          updated_at?: string
          useful_life_years?: number
          user_id: string
        }
        Update: {
          accumulated_depreciation?: number
          accumulated_depreciation_code?: string | null
          asset_account_code?: string | null
          asset_number?: string
          book_value?: number
          category?: string | null
          condition?: string | null
          cost?: number
          created_at?: string
          depreciation_expense_code?: string | null
          description?: string
          disposal_date?: string | null
          disposal_proceeds?: number | null
          id?: string
          location?: string | null
          method?: string
          notes?: string | null
          purchase_date?: string
          salvage_value?: number
          status?: string
          supplier?: string | null
          updated_at?: string
          useful_life_years?: number
          user_id?: string
        }
        Relationships: []
      }
      fx_rates: {
        Row: {
          as_of_date: string
          created_at: string
          from_currency: string
          id: string
          rate: number
          source: string | null
          to_currency: string
          updated_at: string
          user_id: string
        }
        Insert: {
          as_of_date?: string
          created_at?: string
          from_currency: string
          id?: string
          rate: number
          source?: string | null
          to_currency: string
          updated_at?: string
          user_id: string
        }
        Update: {
          as_of_date?: string
          created_at?: string
          from_currency?: string
          id?: string
          rate?: number
          source?: string | null
          to_currency?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      imprest_register: {
        Row: {
          amount_issued: number
          amount_returned: number
          amount_spent: number
          bank_account_id: string | null
          created_at: string
          date_issued: string
          id: string
          imprest_no: string
          journal_entry_id: string | null
          notes: string | null
          officer_name: string
          purpose: string | null
          receipt_url: string | null
          retirement_date: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_issued?: number
          amount_returned?: number
          amount_spent?: number
          bank_account_id?: string | null
          created_at?: string
          date_issued?: string
          id?: string
          imprest_no: string
          journal_entry_id?: string | null
          notes?: string | null
          officer_name: string
          purpose?: string | null
          receipt_url?: string | null
          retirement_date?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_issued?: number
          amount_returned?: number
          amount_spent?: number
          bank_account_id?: string | null
          created_at?: string
          date_issued?: string
          id?: string
          imprest_no?: string
          journal_entry_id?: string | null
          notes?: string | null
          officer_name?: string
          purpose?: string | null
          receipt_url?: string | null
          retirement_date?: string | null
          status?: string
          updated_at?: string
          user_id?: string
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
          exchange_rate: number
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
          exchange_rate?: number
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
          exchange_rate?: number
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
      job_cards: {
        Row: {
          created_at: string
          customer_id: string | null
          description: string | null
          id: string
          job_number: string | null
          labour_cost: number | null
          notes: string | null
          parts_cost: number | null
          service_date: string
          status: string
          technician: string | null
          total_cost: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          description?: string | null
          id?: string
          job_number?: string | null
          labour_cost?: number | null
          notes?: string | null
          parts_cost?: number | null
          service_date?: string
          status?: string
          technician?: string | null
          total_cost?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          description?: string | null
          id?: string
          job_number?: string | null
          labour_cost?: number | null
          notes?: string | null
          parts_cost?: number | null
          service_date?: string
          status?: string
          technician?: string | null
          total_cost?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      journal_entries: {
        Row: {
          created_at: string
          currency: string
          description: string | null
          entry_date: string
          entry_number: string
          exchange_rate: number
          id: string
          reference: string | null
          reversal_of: string | null
          reversed_by: string | null
          status: string
          total_credit: number | null
          total_debit: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          currency?: string
          description?: string | null
          entry_date?: string
          entry_number: string
          exchange_rate?: number
          id?: string
          reference?: string | null
          reversal_of?: string | null
          reversed_by?: string | null
          status?: string
          total_credit?: number | null
          total_debit?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          currency?: string
          description?: string | null
          entry_date?: string
          entry_number?: string
          exchange_rate?: number
          id?: string
          reference?: string | null
          reversal_of?: string | null
          reversed_by?: string | null
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
            referencedRelation: "account_balances"
            referencedColumns: ["account_id"]
          },
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
      leads: {
        Row: {
          company: string | null
          created_at: string
          email: string | null
          estimated_value: number | null
          id: string
          name: string
          notes: string | null
          owner: string | null
          phone: string | null
          source: string | null
          stage: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          email?: string | null
          estimated_value?: number | null
          id?: string
          name: string
          notes?: string | null
          owner?: string | null
          phone?: string | null
          source?: string | null
          stage?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string | null
          estimated_value?: number | null
          id?: string
          name?: string
          notes?: string | null
          owner?: string | null
          phone?: string | null
          source?: string | null
          stage?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      opportunities: {
        Row: {
          amount: number | null
          created_at: string
          customer_id: string | null
          expected_close_date: string | null
          id: string
          lead_id: string | null
          name: string
          notes: string | null
          owner: string | null
          probability: number | null
          stage: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number | null
          created_at?: string
          customer_id?: string | null
          expected_close_date?: string | null
          id?: string
          lead_id?: string | null
          name: string
          notes?: string | null
          owner?: string | null
          probability?: number | null
          stage?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number | null
          created_at?: string
          customer_id?: string | null
          expected_close_date?: string | null
          id?: string
          lead_id?: string | null
          name?: string
          notes?: string | null
          owner?: string | null
          probability?: number | null
          stage?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      payroll_runs: {
        Row: {
          created_at: string
          currency: string
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
          currency?: string
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
          currency?: string
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
          absentism: number | null
          advances: number | null
          allowances: number | null
          basic_salary: number | null
          bonus: number | null
          created_at: string
          currency: string
          days_worked: number | null
          deductions: Json
          earnings: Json
          employee_id: string
          gross_pay: number | null
          housing_allowance: number | null
          id: string
          late_reporting: number | null
          leave_days_taken: number | null
          leave_pay: number | null
          loan_balance: number | null
          loan_recovery: number | null
          napsa: number | null
          net_pay: number | null
          nhima: number | null
          notes: string | null
          other_deductions: number | null
          overtime: number | null
          overtime_hours: number | null
          paye: number | null
          payroll_run_id: string
          shift_differential: number | null
          transport_allowance: number | null
          user_id: string
          utility_allowance: number | null
          ytd_napsa: number | null
          ytd_paye: number | null
          ytd_taxable: number | null
        }
        Insert: {
          absentism?: number | null
          advances?: number | null
          allowances?: number | null
          basic_salary?: number | null
          bonus?: number | null
          created_at?: string
          currency?: string
          days_worked?: number | null
          deductions?: Json
          earnings?: Json
          employee_id: string
          gross_pay?: number | null
          housing_allowance?: number | null
          id?: string
          late_reporting?: number | null
          leave_days_taken?: number | null
          leave_pay?: number | null
          loan_balance?: number | null
          loan_recovery?: number | null
          napsa?: number | null
          net_pay?: number | null
          nhima?: number | null
          notes?: string | null
          other_deductions?: number | null
          overtime?: number | null
          overtime_hours?: number | null
          paye?: number | null
          payroll_run_id: string
          shift_differential?: number | null
          transport_allowance?: number | null
          user_id: string
          utility_allowance?: number | null
          ytd_napsa?: number | null
          ytd_paye?: number | null
          ytd_taxable?: number | null
        }
        Update: {
          absentism?: number | null
          advances?: number | null
          allowances?: number | null
          basic_salary?: number | null
          bonus?: number | null
          created_at?: string
          currency?: string
          days_worked?: number | null
          deductions?: Json
          earnings?: Json
          employee_id?: string
          gross_pay?: number | null
          housing_allowance?: number | null
          id?: string
          late_reporting?: number | null
          leave_days_taken?: number | null
          leave_pay?: number | null
          loan_balance?: number | null
          loan_recovery?: number | null
          napsa?: number | null
          net_pay?: number | null
          nhima?: number | null
          notes?: string | null
          other_deductions?: number | null
          overtime?: number | null
          overtime_hours?: number | null
          paye?: number | null
          payroll_run_id?: string
          shift_differential?: number | null
          transport_allowance?: number | null
          user_id?: string
          utility_allowance?: number | null
          ytd_napsa?: number | null
          ytd_paye?: number | null
          ytd_taxable?: number | null
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
      project_tasks: {
        Row: {
          actual_hours: number | null
          assignee: string | null
          created_at: string
          due_date: string | null
          estimated_hours: number | null
          id: string
          notes: string | null
          priority: string
          project_id: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          actual_hours?: number | null
          assignee?: string | null
          created_at?: string
          due_date?: string | null
          estimated_hours?: number | null
          id?: string
          notes?: string | null
          priority?: string
          project_id?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          actual_hours?: number | null
          assignee?: string | null
          created_at?: string
          due_date?: string | null
          estimated_hours?: number | null
          id?: string
          notes?: string | null
          priority?: string
          project_id?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          actual_cost: number | null
          budget: number | null
          code: string | null
          created_at: string
          customer_id: string | null
          end_date: string | null
          id: string
          manager: string | null
          name: string
          notes: string | null
          start_date: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          actual_cost?: number | null
          budget?: number | null
          code?: string | null
          created_at?: string
          customer_id?: string | null
          end_date?: string | null
          id?: string
          manager?: string | null
          name: string
          notes?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          actual_cost?: number | null
          budget?: number | null
          code?: string | null
          created_at?: string
          customer_id?: string | null
          end_date?: string | null
          id?: string
          manager?: string | null
          name?: string
          notes?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
          user_id?: string
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
          exchange_rate: number
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
          exchange_rate?: number
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
          exchange_rate?: number
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
          exchange_rate: number
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
          exchange_rate?: number
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
          exchange_rate?: number
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
          exchange_rate: number
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
          exchange_rate?: number
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
          exchange_rate?: number
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
      reconciliation_lines: {
        Row: {
          bank_txn_id: string
          cleared: boolean
          created_at: string
          id: string
          session_id: string
          user_id: string
        }
        Insert: {
          bank_txn_id: string
          cleared?: boolean
          created_at?: string
          id?: string
          session_id: string
          user_id: string
        }
        Update: {
          bank_txn_id?: string
          cleared?: boolean
          created_at?: string
          id?: string
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reconciliation_lines_bank_txn_id_fkey"
            columns: ["bank_txn_id"]
            isOneToOne: false
            referencedRelation: "bank_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reconciliation_lines_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "reconciliation_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      reconciliation_sessions: {
        Row: {
          bank_account_id: string | null
          book_balance: number
          cleared_deposits: number
          cleared_payments: number
          created_at: string
          difference: number
          id: string
          locked_at: string | null
          locked_by: string | null
          notes: string | null
          opening_balance: number
          statement_balance: number
          statement_date: string
          statement_start_date: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bank_account_id?: string | null
          book_balance?: number
          cleared_deposits?: number
          cleared_payments?: number
          created_at?: string
          difference?: number
          id?: string
          locked_at?: string | null
          locked_by?: string | null
          notes?: string | null
          opening_balance?: number
          statement_balance?: number
          statement_date: string
          statement_start_date?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bank_account_id?: string | null
          book_balance?: number
          cleared_deposits?: number
          cleared_payments?: number
          created_at?: string
          difference?: number
          id?: string
          locked_at?: string | null
          locked_by?: string | null
          notes?: string | null
          opening_balance?: number
          statement_balance?: number
          statement_date?: string
          statement_start_date?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reconciliation_sessions_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reconciliation_sessions_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_running_balance"
            referencedColumns: ["bank_account_id"]
          },
        ]
      }
      school_grants: {
        Row: {
          approved_amount: number
          attachment_url: string | null
          bank_account_id: string | null
          created_at: string
          currency: string | null
          date_received: string | null
          fiscal_year: number | null
          funding_institution: string | null
          grant_name: string
          grant_ref: string | null
          id: string
          journal_entry_id: string | null
          notes: string | null
          purpose: string | null
          quarter: string | null
          received_amount: number
          source: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          approved_amount?: number
          attachment_url?: string | null
          bank_account_id?: string | null
          created_at?: string
          currency?: string | null
          date_received?: string | null
          fiscal_year?: number | null
          funding_institution?: string | null
          grant_name: string
          grant_ref?: string | null
          id?: string
          journal_entry_id?: string | null
          notes?: string | null
          purpose?: string | null
          quarter?: string | null
          received_amount?: number
          source?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          approved_amount?: number
          attachment_url?: string | null
          bank_account_id?: string | null
          created_at?: string
          currency?: string | null
          date_received?: string | null
          fiscal_year?: number | null
          funding_institution?: string | null
          grant_name?: string
          grant_ref?: string | null
          id?: string
          journal_entry_id?: string | null
          notes?: string | null
          purpose?: string | null
          quarter?: string | null
          received_amount?: number
          source?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      service_tickets: {
        Row: {
          assigned_to: string | null
          created_at: string
          customer_id: string | null
          description: string | null
          id: string
          opened_at: string
          priority: string
          resolution: string | null
          resolved_at: string | null
          status: string
          subject: string
          ticket_number: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          customer_id?: string | null
          description?: string | null
          id?: string
          opened_at?: string
          priority?: string
          resolution?: string | null
          resolved_at?: string | null
          status?: string
          subject: string
          ticket_number?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          customer_id?: string | null
          description?: string | null
          id?: string
          opened_at?: string
          priority?: string
          resolution?: string | null
          resolved_at?: string | null
          status?: string
          subject?: string
          ticket_number?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      supplier_quotations: {
        Row: {
          attachment_url: string | null
          created_at: string
          id: string
          is_selected: boolean
          notes: string | null
          quote_date: string | null
          quoted_amount: number
          request_id: string | null
          supplier_id: string | null
          supplier_name: string
          user_id: string
        }
        Insert: {
          attachment_url?: string | null
          created_at?: string
          id?: string
          is_selected?: boolean
          notes?: string | null
          quote_date?: string | null
          quoted_amount?: number
          request_id?: string | null
          supplier_id?: string | null
          supplier_name: string
          user_id: string
        }
        Update: {
          attachment_url?: string | null
          created_at?: string
          id?: string
          is_selected?: boolean
          notes?: string | null
          quote_date?: string | null
          quoted_amount?: number
          request_id?: string | null
          supplier_id?: string | null
          supplier_name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_quotations_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "teaching_material_requests"
            referencedColumns: ["id"]
          },
        ]
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
      teaching_material_requests: {
        Row: {
          actual_cost: number | null
          approved_by: string | null
          category: string
          created_at: string
          estimated_cost: number
          grant_id: string | null
          id: string
          item_name: string
          notes: string | null
          quantity: number
          request_date: string
          request_no: string
          requested_by: string | null
          status: string
          supplier_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          actual_cost?: number | null
          approved_by?: string | null
          category?: string
          created_at?: string
          estimated_cost?: number
          grant_id?: string | null
          id?: string
          item_name: string
          notes?: string | null
          quantity?: number
          request_date?: string
          request_no: string
          requested_by?: string | null
          status?: string
          supplier_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          actual_cost?: number | null
          approved_by?: string | null
          category?: string
          created_at?: string
          estimated_cost?: number
          grant_id?: string | null
          id?: string
          item_name?: string
          notes?: string | null
          quantity?: number
          request_date?: string
          request_no?: string
          requested_by?: string | null
          status?: string
          supplier_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teaching_material_requests_grant_id_fkey"
            columns: ["grant_id"]
            isOneToOne: false
            referencedRelation: "school_grants"
            referencedColumns: ["id"]
          },
        ]
      }
      time_entries: {
        Row: {
          billable: boolean
          created_at: string
          description: string | null
          employee_id: string | null
          hourly_rate: number | null
          hours: number
          id: string
          project_id: string | null
          task_id: string | null
          updated_at: string
          user_id: string
          work_date: string
        }
        Insert: {
          billable?: boolean
          created_at?: string
          description?: string | null
          employee_id?: string | null
          hourly_rate?: number | null
          hours?: number
          id?: string
          project_id?: string | null
          task_id?: string | null
          updated_at?: string
          user_id: string
          work_date?: string
        }
        Update: {
          billable?: boolean
          created_at?: string
          description?: string | null
          employee_id?: string | null
          hourly_rate?: number | null
          hours?: number
          id?: string
          project_id?: string | null
          task_id?: string | null
          updated_at?: string
          user_id?: string
          work_date?: string
        }
        Relationships: []
      }
      tuckshop_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          journal_entry_id: string | null
          notes: string | null
          payment_method: string | null
          quantity: number | null
          txn_date: string
          txn_type: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          journal_entry_id?: string | null
          notes?: string | null
          payment_method?: string | null
          quantity?: number | null
          txn_date?: string
          txn_type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          journal_entry_id?: string | null
          notes?: string | null
          payment_method?: string | null
          quantity?: number | null
          txn_date?: string
          txn_type?: string
          user_id?: string
        }
        Relationships: []
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
      workshop_allowances: {
        Row: {
          allowance_type: string | null
          amount: number
          created_at: string
          id: string
          journal_entry_id: string | null
          paid: boolean
          paid_date: string | null
          payment_method: string | null
          recipient_name: string
          role: string | null
          user_id: string
          workshop_id: string | null
        }
        Insert: {
          allowance_type?: string | null
          amount?: number
          created_at?: string
          id?: string
          journal_entry_id?: string | null
          paid?: boolean
          paid_date?: string | null
          payment_method?: string | null
          recipient_name: string
          role?: string | null
          user_id: string
          workshop_id?: string | null
        }
        Update: {
          allowance_type?: string | null
          amount?: number
          created_at?: string
          id?: string
          journal_entry_id?: string | null
          paid?: boolean
          paid_date?: string | null
          payment_method?: string | null
          recipient_name?: string
          role?: string | null
          user_id?: string
          workshop_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workshop_allowances_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshops"
            referencedColumns: ["id"]
          },
        ]
      }
      workshops: {
        Row: {
          actual_spent: number
          budget: number
          created_at: string
          end_date: string | null
          grant_id: string | null
          id: string
          notes: string | null
          participants_count: number | null
          start_date: string
          status: string
          updated_at: string
          user_id: string
          venue: string | null
          workshop_name: string
        }
        Insert: {
          actual_spent?: number
          budget?: number
          created_at?: string
          end_date?: string | null
          grant_id?: string | null
          id?: string
          notes?: string | null
          participants_count?: number | null
          start_date: string
          status?: string
          updated_at?: string
          user_id: string
          venue?: string | null
          workshop_name: string
        }
        Update: {
          actual_spent?: number
          budget?: number
          created_at?: string
          end_date?: string | null
          grant_id?: string | null
          id?: string
          notes?: string | null
          participants_count?: number | null
          start_date?: string
          status?: string
          updated_at?: string
          user_id?: string
          venue?: string | null
          workshop_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "workshops_grant_id_fkey"
            columns: ["grant_id"]
            isOneToOne: false
            referencedRelation: "school_grants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      account_balances: {
        Row: {
          account_code: string | null
          account_id: string | null
          account_name: string | null
          account_type: string | null
          balance: number | null
          entry_count: number | null
          total_credit: number | null
          total_debit: number | null
          user_id: string | null
        }
        Relationships: []
      }
      bank_running_balance: {
        Row: {
          bank_account_id: string | null
          currency: string | null
          current_balance: number | null
          name: string | null
          unallocated_count: number | null
          unreconciled_count: number | null
          user_id: string | null
        }
        Insert: {
          bank_account_id?: string | null
          currency?: string | null
          current_balance?: never
          name?: string | null
          unallocated_count?: never
          unreconciled_count?: never
          user_id?: string | null
        }
        Update: {
          bank_account_id?: string | null
          currency?: string | null
          current_balance?: never
          name?: string | null
          unallocated_count?: never
          unreconciled_count?: never
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      apply_bank_rules: { Args: never; Returns: Json }
      approver_role_for_request: { Args: { _req: string }; Returns: string }
      auto_match_bank_transactions: { Args: never; Returns: Json }
      can_act_on_request: {
        Args: { _req: string; _user: string }
        Returns: boolean
      }
      close_month: { Args: { _month: number; _year: number }; Returns: Json }
      close_year: { Args: { _year: number }; Returns: Json }
      compute_reconciliation: { Args: { _session_id: string }; Returns: Json }
      ensure_account: {
        Args: { _code: string; _name: string; _type: string; _uid: string }
        Returns: string
      }
      fx_rate: {
        Args: { _as_of?: string; _from: string; _to: string; _uid: string }
        Returns: number
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
      lock_reconciliation: { Args: { _session_id: string }; Returns: Json }
      notify_once: {
        Args: {
          _key: string
          _link: string
          _message: string
          _title: string
          _type: string
          _user_id: string
        }
        Returns: undefined
      }
      post_allowance: { Args: { _id: string }; Returns: string }
      post_bill: { Args: { _bill_id: string }; Returns: string }
      post_bill_payment: { Args: { _payment_id: string }; Returns: string }
      post_depreciation: {
        Args: { _month: number; _year: number }
        Returns: Json
      }
      post_expense: { Args: { _expense_id: string }; Returns: string }
      post_imprest: { Args: { _id: string }; Returns: string }
      post_receipt: { Args: { _receipt_id: string }; Returns: string }
      post_school_grant: { Args: { _id: string }; Returns: string }
      post_tuckshop: { Args: { _id: string }; Returns: string }
      rebuild_ledgers: { Args: never; Returns: Json }
      recalc_bank_txn_allocation: {
        Args: { _txn_id: string }
        Returns: undefined
      }
      recalc_invoice_balance: {
        Args: { _invoice_id: string }
        Returns: undefined
      }
      reopen_period: {
        Args: { _month: number; _period_type?: string; _year: number }
        Returns: Json
      }
      reverse_bank_allocation: {
        Args: { _alloc_id: string; _reason?: string }
        Returns: Json
      }
      run_notification_scans: { Args: never; Returns: Json }
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
