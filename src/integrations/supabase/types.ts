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
      asset_categories: {
        Row: {
          accumulated_depreciation_code: string
          capitalisation_threshold: number
          code: string
          created_at: string
          depreciation_expense_code: string
          depreciation_method: string
          depreciation_rate: number | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
          useful_life_years: number
          user_id: string
        }
        Insert: {
          accumulated_depreciation_code?: string
          capitalisation_threshold?: number
          code: string
          created_at?: string
          depreciation_expense_code?: string
          depreciation_method?: string
          depreciation_rate?: number | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
          useful_life_years?: number
          user_id: string
        }
        Update: {
          accumulated_depreciation_code?: string
          capitalisation_threshold?: number
          code?: string
          created_at?: string
          depreciation_expense_code?: string
          depreciation_method?: string
          depreciation_rate?: number | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
          useful_life_years?: number
          user_id?: string
        }
        Relationships: []
      }
      asset_disposals: {
        Row: {
          asset_id: string
          buyer: string | null
          created_at: string
          disposal_date: string
          disposal_method: string
          gain_loss: number | null
          id: string
          journal_entry_id: string | null
          proceeds: number
          reason: string | null
          user_id: string
        }
        Insert: {
          asset_id: string
          buyer?: string | null
          created_at?: string
          disposal_date?: string
          disposal_method?: string
          gain_loss?: number | null
          id?: string
          journal_entry_id?: string | null
          proceeds?: number
          reason?: string | null
          user_id: string
        }
        Update: {
          asset_id?: string
          buyer?: string | null
          created_at?: string
          disposal_date?: string
          disposal_method?: string
          gain_loss?: number | null
          id?: string
          journal_entry_id?: string | null
          proceeds?: number
          reason?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_disposals_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "fixed_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_disposals_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_transfers: {
        Row: {
          asset_id: string
          created_at: string
          from_custodian: string | null
          from_department: string | null
          from_location: string | null
          id: string
          reason: string | null
          to_custodian: string | null
          to_department: string | null
          to_location: string | null
          transfer_date: string
          user_id: string
        }
        Insert: {
          asset_id: string
          created_at?: string
          from_custodian?: string | null
          from_department?: string | null
          from_location?: string | null
          id?: string
          reason?: string | null
          to_custodian?: string | null
          to_department?: string | null
          to_location?: string | null
          transfer_date?: string
          user_id: string
        }
        Update: {
          asset_id?: string
          created_at?: string
          from_custodian?: string | null
          from_department?: string | null
          from_location?: string | null
          id?: string
          reason?: string | null
          to_custodian?: string | null
          to_department?: string | null
          to_location?: string | null
          transfer_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_transfers_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "fixed_assets"
            referencedColumns: ["id"]
          },
        ]
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
          cashbook_type: string
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
          cashbook_type?: string
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
          cashbook_type?: string
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
      bank_transaction_events: {
        Row: {
          actor_id: string | null
          bank_txn_id: string
          created_at: string
          event: string
          id: string
          journal_entry_id: string | null
          new_status: string | null
          previous_status: string | null
          reason: string | null
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          bank_txn_id: string
          created_at?: string
          event: string
          id?: string
          journal_entry_id?: string | null
          new_status?: string | null
          previous_status?: string | null
          reason?: string | null
          user_id: string
        }
        Update: {
          actor_id?: string | null
          bank_txn_id?: string
          created_at?: string
          event?: string
          id?: string
          journal_entry_id?: string | null
          new_status?: string | null
          previous_status?: string | null
          reason?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_transaction_events_bank_txn_id_fkey"
            columns: ["bank_txn_id"]
            isOneToOne: false
            referencedRelation: "bank_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_transactions: {
        Row: {
          allocated_amount: number
          allocated_at: string | null
          allocated_by: string | null
          amount: number
          balance: number | null
          bank_account_id: string | null
          category: string | null
          charge_code: string | null
          cleared_at: string | null
          cleared_by: string | null
          cleared_reference: string | null
          content_hash: string | null
          cost_centre: string | null
          created_at: string
          currency: string
          description: string
          exchange_rate: number
          external_transaction_id: string | null
          fund_source: string | null
          id: string
          import_batch_id: string | null
          is_allocated: boolean
          is_cleared: boolean
          is_posted: boolean
          journal_entry_id: string | null
          last_allocated_at: string | null
          matched_id: string | null
          matched_invoice: string | null
          matched_type: string | null
          payee: string | null
          posted_at: string | null
          posted_by: string | null
          project_ref: string | null
          receipt_no: string | null
          reconciled: boolean
          reconciled_at: string | null
          reconciled_by: string | null
          reconciliation_id: string | null
          reference: string | null
          reversal_of_transaction_id: string | null
          source: string
          source_file: string | null
          status: string
          txn_date: string
          updated_at: string
          user_id: string
          voucher_no: string | null
        }
        Insert: {
          allocated_amount?: number
          allocated_at?: string | null
          allocated_by?: string | null
          amount: number
          balance?: number | null
          bank_account_id?: string | null
          category?: string | null
          charge_code?: string | null
          cleared_at?: string | null
          cleared_by?: string | null
          cleared_reference?: string | null
          content_hash?: string | null
          cost_centre?: string | null
          created_at?: string
          currency?: string
          description: string
          exchange_rate?: number
          external_transaction_id?: string | null
          fund_source?: string | null
          id?: string
          import_batch_id?: string | null
          is_allocated?: boolean
          is_cleared?: boolean
          is_posted?: boolean
          journal_entry_id?: string | null
          last_allocated_at?: string | null
          matched_id?: string | null
          matched_invoice?: string | null
          matched_type?: string | null
          payee?: string | null
          posted_at?: string | null
          posted_by?: string | null
          project_ref?: string | null
          receipt_no?: string | null
          reconciled?: boolean
          reconciled_at?: string | null
          reconciled_by?: string | null
          reconciliation_id?: string | null
          reference?: string | null
          reversal_of_transaction_id?: string | null
          source?: string
          source_file?: string | null
          status?: string
          txn_date: string
          updated_at?: string
          user_id: string
          voucher_no?: string | null
        }
        Update: {
          allocated_amount?: number
          allocated_at?: string | null
          allocated_by?: string | null
          amount?: number
          balance?: number | null
          bank_account_id?: string | null
          category?: string | null
          charge_code?: string | null
          cleared_at?: string | null
          cleared_by?: string | null
          cleared_reference?: string | null
          content_hash?: string | null
          cost_centre?: string | null
          created_at?: string
          currency?: string
          description?: string
          exchange_rate?: number
          external_transaction_id?: string | null
          fund_source?: string | null
          id?: string
          import_batch_id?: string | null
          is_allocated?: boolean
          is_cleared?: boolean
          is_posted?: boolean
          journal_entry_id?: string | null
          last_allocated_at?: string | null
          matched_id?: string | null
          matched_invoice?: string | null
          matched_type?: string | null
          payee?: string | null
          posted_at?: string | null
          posted_by?: string | null
          project_ref?: string | null
          receipt_no?: string | null
          reconciled?: boolean
          reconciled_at?: string | null
          reconciled_by?: string | null
          reconciliation_id?: string | null
          reference?: string | null
          reversal_of_transaction_id?: string | null
          source?: string
          source_file?: string | null
          status?: string
          txn_date?: string
          updated_at?: string
          user_id?: string
          voucher_no?: string | null
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
          bank_account_id: string | null
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
          bank_account_id?: string | null
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
          bank_account_id?: string | null
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
            foreignKeyName: "bill_payments_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bill_payments_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_running_balance"
            referencedColumns: ["bank_account_id"]
          },
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
          allocation_percentage: number | null
          budgeted_amount: number
          charge_code: string | null
          company_id: string | null
          created_at: string
          department_id: string | null
          fiscal_year: number
          funding_source: string | null
          id: string
          name: string
          notes: string | null
          period: string | null
          programme_code: string | null
          programme_name: string | null
          quarter: string | null
          sub_programme_code: string | null
          sub_programme_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          actual_amount?: number | null
          allocation_percentage?: number | null
          budgeted_amount?: number
          charge_code?: string | null
          company_id?: string | null
          created_at?: string
          department_id?: string | null
          fiscal_year: number
          funding_source?: string | null
          id?: string
          name: string
          notes?: string | null
          period?: string | null
          programme_code?: string | null
          programme_name?: string | null
          quarter?: string | null
          sub_programme_code?: string | null
          sub_programme_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          actual_amount?: number | null
          allocation_percentage?: number | null
          budgeted_amount?: number
          charge_code?: string | null
          company_id?: string | null
          created_at?: string
          department_id?: string | null
          fiscal_year?: number
          funding_source?: string | null
          id?: string
          name?: string
          notes?: string | null
          period?: string | null
          programme_code?: string | null
          programme_name?: string | null
          quarter?: string | null
          sub_programme_code?: string | null
          sub_programme_name?: string | null
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
      business_presets: {
        Row: {
          code: string
          created_at: string
          description: string | null
          icon: string | null
          id: string
          industry: string | null
          is_active: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          industry?: string | null
          is_active?: boolean
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          industry?: string | null
          is_active?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
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
      cashbooks: {
        Row: {
          bank_account_id: string | null
          cashbook_type: string
          code: string
          created_at: string
          currency: string
          gl_account_id: string | null
          id: string
          is_active: boolean
          name: string
          opening_balance: number
          updated_at: string
          user_id: string
        }
        Insert: {
          bank_account_id?: string | null
          cashbook_type?: string
          code: string
          created_at?: string
          currency?: string
          gl_account_id?: string | null
          id?: string
          is_active?: boolean
          name: string
          opening_balance?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          bank_account_id?: string | null
          cashbook_type?: string
          code?: string
          created_at?: string
          currency?: string
          gl_account_id?: string | null
          id?: string
          is_active?: boolean
          name?: string
          opening_balance?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cashbooks_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cashbooks_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_running_balance"
            referencedColumns: ["bank_account_id"]
          },
          {
            foreignKeyName: "cashbooks_gl_account_id_fkey"
            columns: ["gl_account_id"]
            isOneToOne: false
            referencedRelation: "account_balances"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "cashbooks_gl_account_id_fkey"
            columns: ["gl_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      cashier_records: {
        Row: {
          cashier_name: string | null
          cashier_user_id: string | null
          created_at: string
          created_by: string | null
          delivered_qty: number
          id: string
          item_id: string | null
          location_id: string | null
          notes: string | null
          period_end: string | null
          period_start: string | null
          physical_count: number | null
          remaining_qty: number
          sales_value: number | null
          selling_price: number | null
          sold_qty: number
          source_image_url: string | null
          source_type: string
          status: string
          updated_at: string
          user_id: string
          variance: number | null
          verified: boolean
        }
        Insert: {
          cashier_name?: string | null
          cashier_user_id?: string | null
          created_at?: string
          created_by?: string | null
          delivered_qty?: number
          id?: string
          item_id?: string | null
          location_id?: string | null
          notes?: string | null
          period_end?: string | null
          period_start?: string | null
          physical_count?: number | null
          remaining_qty?: number
          sales_value?: number | null
          selling_price?: number | null
          sold_qty?: number
          source_image_url?: string | null
          source_type?: string
          status?: string
          updated_at?: string
          user_id: string
          variance?: number | null
          verified?: boolean
        }
        Update: {
          cashier_name?: string | null
          cashier_user_id?: string | null
          created_at?: string
          created_by?: string | null
          delivered_qty?: number
          id?: string
          item_id?: string | null
          location_id?: string | null
          notes?: string | null
          period_end?: string | null
          period_start?: string | null
          physical_count?: number | null
          remaining_qty?: number
          sales_value?: number | null
          selling_price?: number | null
          sold_qty?: number
          source_image_url?: string | null
          source_type?: string
          status?: string
          updated_at?: string
          user_id?: string
          variance?: number | null
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "cashier_records_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "stock_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cashier_records_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "inventory_locations"
            referencedColumns: ["id"]
          },
        ]
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
          normal_balance: string | null
          parent_id: string | null
          purpose: string | null
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
          normal_balance?: string | null
          parent_id?: string | null
          purpose?: string | null
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
          normal_balance?: string | null
          parent_id?: string | null
          purpose?: string | null
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
          payslip_footer: string | null
          payslip_header: string | null
          phone: string | null
          timezone: string
          tpin: string | null
          trading_name: string | null
          updated_at: string
          user_id: string
          vat_number: string | null
          vat_registered: boolean
          website: string | null
          workspace_mode: string
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
          payslip_footer?: string | null
          payslip_header?: string | null
          phone?: string | null
          timezone?: string
          tpin?: string | null
          trading_name?: string | null
          updated_at?: string
          user_id: string
          vat_number?: string | null
          vat_registered?: boolean
          website?: string | null
          workspace_mode?: string
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
          payslip_footer?: string | null
          payslip_header?: string | null
          phone?: string | null
          timezone?: string
          tpin?: string | null
          trading_name?: string | null
          updated_at?: string
          user_id?: string
          vat_number?: string | null
          vat_registered?: boolean
          website?: string | null
          workspace_mode?: string
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
          billing_cycle: string
          cancel_at: string | null
          cancel_reason: string | null
          company_id: string
          coupon_code: string | null
          created_at: string
          current_period_end: string
          discount_pct: number
          grace_until: string | null
          id: string
          last_payment_at: string | null
          notes: string | null
          plan_id: string
          seats_used: number
          started_at: string
          status: string
          storage_used_mb: number
          trial_ends_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          billing_cycle?: string
          cancel_at?: string | null
          cancel_reason?: string | null
          company_id: string
          coupon_code?: string | null
          created_at?: string
          current_period_end?: string
          discount_pct?: number
          grace_until?: string | null
          id?: string
          last_payment_at?: string | null
          notes?: string | null
          plan_id: string
          seats_used?: number
          started_at?: string
          status?: string
          storage_used_mb?: number
          trial_ends_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          billing_cycle?: string
          cancel_at?: string | null
          cancel_reason?: string | null
          company_id?: string
          coupon_code?: string | null
          created_at?: string
          current_period_end?: string
          discount_pct?: number
          grace_until?: string | null
          id?: string
          last_payment_at?: string | null
          notes?: string | null
          plan_id?: string
          seats_used?: number
          started_at?: string
          status?: string
          storage_used_mb?: number
          trial_ends_at?: string | null
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
          cost_centre_id: string | null
          created_at: string
          description: string | null
          division_id: string | null
          id: string
          manager_name: string | null
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          code?: string | null
          company_id: string
          cost_centre_id?: string | null
          created_at?: string
          description?: string | null
          division_id?: string | null
          id?: string
          manager_name?: string | null
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          code?: string | null
          company_id?: string
          cost_centre_id?: string | null
          created_at?: string
          description?: string | null
          division_id?: string | null
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
          {
            foreignKeyName: "departments_cost_centre_id_fkey"
            columns: ["cost_centre_id"]
            isOneToOne: false
            referencedRelation: "cost_centres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departments_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
        ]
      }
      divisions: {
        Row: {
          code: string | null
          company_id: string | null
          created_at: string
          description: string | null
          id: string
          manager_name: string | null
          name: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          code?: string | null
          company_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          manager_name?: string | null
          name: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          code?: string | null
          company_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          manager_name?: string | null
          name?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "divisions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      donation_receipts: {
        Row: {
          amount: number
          created_at: string
          currency: string
          donor_id: string | null
          fund_name: string | null
          id: string
          journal_entry_id: string | null
          method: string | null
          notes: string | null
          pledge_id: string | null
          receipt_date: string
          receipt_no: string | null
          reference: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          currency?: string
          donor_id?: string | null
          fund_name?: string | null
          id?: string
          journal_entry_id?: string | null
          method?: string | null
          notes?: string | null
          pledge_id?: string | null
          receipt_date?: string
          receipt_no?: string | null
          reference?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          donor_id?: string | null
          fund_name?: string | null
          id?: string
          journal_entry_id?: string | null
          method?: string | null
          notes?: string | null
          pledge_id?: string | null
          receipt_date?: string
          receipt_no?: string | null
          reference?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "donation_receipts_donor_id_fkey"
            columns: ["donor_id"]
            isOneToOne: false
            referencedRelation: "donors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donation_receipts_pledge_id_fkey"
            columns: ["pledge_id"]
            isOneToOne: false
            referencedRelation: "donor_pledges"
            referencedColumns: ["id"]
          },
        ]
      }
      donor_pledges: {
        Row: {
          amount: number
          created_at: string
          currency: string
          donor_id: string | null
          expected_date: string | null
          fund_name: string | null
          id: string
          is_restricted: boolean
          notes: string | null
          pledge_date: string
          pledge_ref: string | null
          purpose: string | null
          received_amount: number
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          currency?: string
          donor_id?: string | null
          expected_date?: string | null
          fund_name?: string | null
          id?: string
          is_restricted?: boolean
          notes?: string | null
          pledge_date?: string
          pledge_ref?: string | null
          purpose?: string | null
          received_amount?: number
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          donor_id?: string | null
          expected_date?: string | null
          fund_name?: string | null
          id?: string
          is_restricted?: boolean
          notes?: string | null
          pledge_date?: string
          pledge_ref?: string | null
          purpose?: string | null
          received_amount?: number
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "donor_pledges_donor_id_fkey"
            columns: ["donor_id"]
            isOneToOne: false
            referencedRelation: "donors"
            referencedColumns: ["id"]
          },
        ]
      }
      donors: {
        Row: {
          address: string | null
          company_id: string | null
          contact_person: string | null
          country: string | null
          created_at: string
          donor_code: string | null
          donor_type: string
          email: string | null
          focus_area: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          company_id?: string | null
          contact_person?: string | null
          country?: string | null
          created_at?: string
          donor_code?: string | null
          donor_type?: string
          email?: string | null
          focus_area?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          company_id?: string | null
          contact_person?: string | null
          country?: string | null
          created_at?: string
          donor_code?: string | null
          donor_type?: string
          email?: string | null
          focus_area?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
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
      employee_deductions: {
        Row: {
          comments: string | null
          company_id: string | null
          created_at: string
          currency: string
          data1: number | null
          data2: number | null
          data3: number | null
          date_taken: string | null
          deduction_type_id: string | null
          employee_id: string
          end_date: string | null
          id: string
          initial_deposit: number | null
          instalments: number | null
          interest_monthly: number | null
          interest_outstanding: number | null
          interest_rate: number | null
          monthly_amount: number | null
          outstanding_amount: number | null
          outstanding_months: number | null
          start_date: string | null
          status: string
          this_month: string | null
          total_amount: number | null
          total_interest: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          comments?: string | null
          company_id?: string | null
          created_at?: string
          currency?: string
          data1?: number | null
          data2?: number | null
          data3?: number | null
          date_taken?: string | null
          deduction_type_id?: string | null
          employee_id: string
          end_date?: string | null
          id?: string
          initial_deposit?: number | null
          instalments?: number | null
          interest_monthly?: number | null
          interest_outstanding?: number | null
          interest_rate?: number | null
          monthly_amount?: number | null
          outstanding_amount?: number | null
          outstanding_months?: number | null
          start_date?: string | null
          status?: string
          this_month?: string | null
          total_amount?: number | null
          total_interest?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          comments?: string | null
          company_id?: string | null
          created_at?: string
          currency?: string
          data1?: number | null
          data2?: number | null
          data3?: number | null
          date_taken?: string | null
          deduction_type_id?: string | null
          employee_id?: string
          end_date?: string | null
          id?: string
          initial_deposit?: number | null
          instalments?: number | null
          interest_monthly?: number | null
          interest_outstanding?: number | null
          interest_rate?: number | null
          monthly_amount?: number | null
          outstanding_amount?: number | null
          outstanding_months?: number | null
          start_date?: string | null
          status?: string
          this_month?: string | null
          total_amount?: number | null
          total_interest?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_deductions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_deductions_deduction_type_id_fkey"
            columns: ["deduction_type_id"]
            isOneToOne: false
            referencedRelation: "payroll_deduction_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_deductions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_incomes: {
        Row: {
          amount: number
          comments: string | null
          company_id: string | null
          created_at: string
          currency: string
          data1: number | null
          data2: number | null
          data3: number | null
          effective_from: string | null
          effective_to: string | null
          employee_id: string
          hours_days_worked: number | null
          id: string
          income_type_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          comments?: string | null
          company_id?: string | null
          created_at?: string
          currency?: string
          data1?: number | null
          data2?: number | null
          data3?: number | null
          effective_from?: string | null
          effective_to?: string | null
          employee_id: string
          hours_days_worked?: number | null
          id?: string
          income_type_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          comments?: string | null
          company_id?: string | null
          created_at?: string
          currency?: string
          data1?: number | null
          data2?: number | null
          data3?: number | null
          effective_from?: string | null
          effective_to?: string | null
          employee_id?: string
          hours_days_worked?: number | null
          id?: string
          income_type_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_incomes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_incomes_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_incomes_income_type_id_fkey"
            columns: ["income_type_id"]
            isOneToOne: false
            referencedRelation: "payroll_income_types"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_pos_permissions: {
        Row: {
          allow: Json
          branch_id: string | null
          company_id: string | null
          created_at: string
          deny: Json
          drawer_name: string | null
          email: string | null
          employee_id: string | null
          failed_pin_attempts: number
          full_name: string | null
          id: string
          is_active: boolean
          last_pin_login_at: string | null
          location_id: string | null
          pin: string | null
          pin_disabled: boolean
          pin_hash: string | null
          pin_locked: boolean
          pin_locked_until: string | null
          pin_set_at: string | null
          pos_role: string
          register_id: string | null
          updated_at: string
          user_id: string
          worker_user_id: string | null
        }
        Insert: {
          allow?: Json
          branch_id?: string | null
          company_id?: string | null
          created_at?: string
          deny?: Json
          drawer_name?: string | null
          email?: string | null
          employee_id?: string | null
          failed_pin_attempts?: number
          full_name?: string | null
          id?: string
          is_active?: boolean
          last_pin_login_at?: string | null
          location_id?: string | null
          pin?: string | null
          pin_disabled?: boolean
          pin_hash?: string | null
          pin_locked?: boolean
          pin_locked_until?: string | null
          pin_set_at?: string | null
          pos_role?: string
          register_id?: string | null
          updated_at?: string
          user_id: string
          worker_user_id?: string | null
        }
        Update: {
          allow?: Json
          branch_id?: string | null
          company_id?: string | null
          created_at?: string
          deny?: Json
          drawer_name?: string | null
          email?: string | null
          employee_id?: string | null
          failed_pin_attempts?: number
          full_name?: string | null
          id?: string
          is_active?: boolean
          last_pin_login_at?: string | null
          location_id?: string | null
          pin?: string | null
          pin_disabled?: boolean
          pin_hash?: string | null
          pin_locked?: boolean
          pin_locked_until?: string | null
          pin_set_at?: string | null
          pos_role?: string
          register_id?: string | null
          updated_at?: string
          user_id?: string
          worker_user_id?: string | null
        }
        Relationships: []
      }
      employee_pos_sessions: {
        Row: {
          created_at: string
          device_type: string | null
          ended_at: string | null
          id: string
          permission_id: string | null
          pos_role: string | null
          started_at: string
          terminal: string | null
          user_id: string
          worker_user_id: string | null
        }
        Insert: {
          created_at?: string
          device_type?: string | null
          ended_at?: string | null
          id?: string
          permission_id?: string | null
          pos_role?: string | null
          started_at?: string
          terminal?: string | null
          user_id: string
          worker_user_id?: string | null
        }
        Update: {
          created_at?: string
          device_type?: string | null
          ended_at?: string | null
          id?: string
          permission_id?: string | null
          pos_role?: string | null
          started_at?: string
          terminal?: string | null
          user_id?: string
          worker_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_pos_sessions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "employee_pos_permissions"
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
          cost_centre_id: string | null
          created_at: string
          date_of_birth: string | null
          department_id: string | null
          division_id: string | null
          email: string | null
          emergency_contact: string | null
          employee_code: string | null
          employment_type: string | null
          first_name: string
          gender: string | null
          hire_date: string | null
          id: string
          job_category_id: string | null
          job_description: string | null
          last_name: string
          leave_days_entitlement: number | null
          manager_id: string | null
          marital_status: string | null
          napsa_number: string | null
          national_id: string | null
          nhima_number: string | null
          num_children: number | null
          pay_grade_id: string | null
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
          cost_centre_id?: string | null
          created_at?: string
          date_of_birth?: string | null
          department_id?: string | null
          division_id?: string | null
          email?: string | null
          emergency_contact?: string | null
          employee_code?: string | null
          employment_type?: string | null
          first_name: string
          gender?: string | null
          hire_date?: string | null
          id?: string
          job_category_id?: string | null
          job_description?: string | null
          last_name: string
          leave_days_entitlement?: number | null
          manager_id?: string | null
          marital_status?: string | null
          napsa_number?: string | null
          national_id?: string | null
          nhima_number?: string | null
          num_children?: number | null
          pay_grade_id?: string | null
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
          cost_centre_id?: string | null
          created_at?: string
          date_of_birth?: string | null
          department_id?: string | null
          division_id?: string | null
          email?: string | null
          emergency_contact?: string | null
          employee_code?: string | null
          employment_type?: string | null
          first_name?: string
          gender?: string | null
          hire_date?: string | null
          id?: string
          job_category_id?: string | null
          job_description?: string | null
          last_name?: string
          leave_days_entitlement?: number | null
          manager_id?: string | null
          marital_status?: string | null
          napsa_number?: string | null
          national_id?: string | null
          nhima_number?: string | null
          num_children?: number | null
          pay_grade_id?: string | null
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
            foreignKeyName: "employees_cost_centre_id_fkey"
            columns: ["cost_centre_id"]
            isOneToOne: false
            referencedRelation: "cost_centres"
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
            foreignKeyName: "employees_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_job_category_id_fkey"
            columns: ["job_category_id"]
            isOneToOne: false
            referencedRelation: "job_categories"
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
            foreignKeyName: "employees_pay_grade_id_fkey"
            columns: ["pay_grade_id"]
            isOneToOne: false
            referencedRelation: "pay_grades"
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
          charge_code: string | null
          created_at: string
          currency: string
          exchange_rate: number
          expense_account_id: string | null
          expense_date: string
          expense_number: string | null
          funding_source: string | null
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
          charge_code?: string | null
          created_at?: string
          currency?: string
          exchange_rate?: number
          expense_account_id?: string | null
          expense_date?: string
          expense_number?: string | null
          funding_source?: string | null
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
          charge_code?: string | null
          created_at?: string
          currency?: string
          exchange_rate?: number
          expense_account_id?: string | null
          expense_date?: string
          expense_number?: string | null
          funding_source?: string | null
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
      fee_payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          journal_entry_id: string | null
          method: string | null
          notes: string | null
          payment_date: string
          receipt_no: string | null
          reference: string | null
          student_fee_id: string | null
          student_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          journal_entry_id?: string | null
          method?: string | null
          notes?: string | null
          payment_date?: string
          receipt_no?: string | null
          reference?: string | null
          student_fee_id?: string | null
          student_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          journal_entry_id?: string | null
          method?: string | null
          notes?: string | null
          payment_date?: string
          receipt_no?: string | null
          reference?: string | null
          student_fee_id?: string | null
          student_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fee_payments_student_fee_id_fkey"
            columns: ["student_fee_id"]
            isOneToOne: false
            referencedRelation: "student_fees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_payments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_structures: {
        Row: {
          academic_year: number
          amount: number
          class_id: string | null
          company_id: string | null
          created_at: string
          fee_name: string
          fee_type: string | null
          id: string
          income_account_code: string | null
          is_mandatory: boolean
          notes: string | null
          term: string
          updated_at: string
          user_id: string
        }
        Insert: {
          academic_year?: number
          amount?: number
          class_id?: string | null
          company_id?: string | null
          created_at?: string
          fee_name: string
          fee_type?: string | null
          id?: string
          income_account_code?: string | null
          is_mandatory?: boolean
          notes?: string | null
          term?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          academic_year?: number
          amount?: number
          class_id?: string | null
          company_id?: string | null
          created_at?: string
          fee_name?: string
          fee_type?: string | null
          id?: string
          income_account_code?: string | null
          is_mandatory?: boolean
          notes?: string | null
          term?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fee_structures_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "school_classes"
            referencedColumns: ["id"]
          },
        ]
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
          category_id: string | null
          condition: string | null
          cost: number
          created_at: string
          custodian: string | null
          department: string | null
          depreciation_expense_code: string | null
          description: string
          disposal_date: string | null
          disposal_proceeds: number | null
          id: string
          insurance_expiry: string | null
          location: string | null
          method: string
          notes: string | null
          purchase_date: string
          registration_number: string | null
          salvage_value: number
          status: string
          supplier: string | null
          updated_at: string
          useful_life_years: number
          user_id: string
          warranty_expiry: string | null
        }
        Insert: {
          accumulated_depreciation?: number
          accumulated_depreciation_code?: string | null
          asset_account_code?: string | null
          asset_number: string
          book_value?: number
          category?: string | null
          category_id?: string | null
          condition?: string | null
          cost?: number
          created_at?: string
          custodian?: string | null
          department?: string | null
          depreciation_expense_code?: string | null
          description: string
          disposal_date?: string | null
          disposal_proceeds?: number | null
          id?: string
          insurance_expiry?: string | null
          location?: string | null
          method?: string
          notes?: string | null
          purchase_date: string
          registration_number?: string | null
          salvage_value?: number
          status?: string
          supplier?: string | null
          updated_at?: string
          useful_life_years?: number
          user_id: string
          warranty_expiry?: string | null
        }
        Update: {
          accumulated_depreciation?: number
          accumulated_depreciation_code?: string | null
          asset_account_code?: string | null
          asset_number?: string
          book_value?: number
          category?: string | null
          category_id?: string | null
          condition?: string | null
          cost?: number
          created_at?: string
          custodian?: string | null
          department?: string | null
          depreciation_expense_code?: string | null
          description?: string
          disposal_date?: string | null
          disposal_proceeds?: number | null
          id?: string
          insurance_expiry?: string | null
          location?: string | null
          method?: string
          notes?: string | null
          purchase_date?: string
          registration_number?: string | null
          salvage_value?: number
          status?: string
          supplier?: string | null
          updated_at?: string
          useful_life_years?: number
          user_id?: string
          warranty_expiry?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fixed_assets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "asset_categories"
            referencedColumns: ["id"]
          },
        ]
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
      grant_milestones: {
        Row: {
          amount: number | null
          completed_date: string | null
          created_at: string
          donor_id: string | null
          due_date: string | null
          grant_id: string | null
          id: string
          milestone_type: string
          notes: string | null
          owner: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number | null
          completed_date?: string | null
          created_at?: string
          donor_id?: string | null
          due_date?: string | null
          grant_id?: string | null
          id?: string
          milestone_type?: string
          notes?: string | null
          owner?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number | null
          completed_date?: string | null
          created_at?: string
          donor_id?: string | null
          due_date?: string | null
          grant_id?: string | null
          id?: string
          milestone_type?: string
          notes?: string | null
          owner?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "grant_milestones_donor_id_fkey"
            columns: ["donor_id"]
            isOneToOne: false
            referencedRelation: "donors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grant_milestones_grant_id_fkey"
            columns: ["grant_id"]
            isOneToOne: false
            referencedRelation: "school_grants"
            referencedColumns: ["id"]
          },
        ]
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
      inventory_locations: {
        Row: {
          address: string | null
          branch_id: string | null
          code: string | null
          company_id: string | null
          created_at: string
          id: string
          is_active: boolean
          is_default: boolean
          location_type: string
          name: string
          notes: string | null
          parent_id: string | null
          updated_at: string
          user_id: string
          warehouse_id: string | null
        }
        Insert: {
          address?: string | null
          branch_id?: string | null
          code?: string | null
          company_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          location_type?: string
          name: string
          notes?: string | null
          parent_id?: string | null
          updated_at?: string
          user_id: string
          warehouse_id?: string | null
        }
        Update: {
          address?: string | null
          branch_id?: string | null
          code?: string | null
          company_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          location_type?: string
          name?: string
          notes?: string | null
          parent_id?: string | null
          updated_at?: string
          user_id?: string
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_locations_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "inventory_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_transfer_items: {
        Row: {
          batch_no: string | null
          created_at: string
          description: string | null
          expiry_date: string | null
          id: string
          item_id: string | null
          notes: string | null
          qty_received: number
          quantity: number
          transfer_id: string
          unit_cost: number
        }
        Insert: {
          batch_no?: string | null
          created_at?: string
          description?: string | null
          expiry_date?: string | null
          id?: string
          item_id?: string | null
          notes?: string | null
          qty_received?: number
          quantity?: number
          transfer_id: string
          unit_cost?: number
        }
        Update: {
          batch_no?: string | null
          created_at?: string
          description?: string | null
          expiry_date?: string | null
          id?: string
          item_id?: string | null
          notes?: string | null
          qty_received?: number
          quantity?: number
          transfer_id?: string
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "inventory_transfer_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "stock_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transfer_items_transfer_id_fkey"
            columns: ["transfer_id"]
            isOneToOne: false
            referencedRelation: "inventory_transfers"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_transfers: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          company_id: string | null
          created_at: string
          created_by: string | null
          dispatched_at: string | null
          dispatched_by: string | null
          from_location_id: string | null
          id: string
          notes: string | null
          purpose: string | null
          received_at: string | null
          received_by: string | null
          reference: string | null
          requested_by: string | null
          status: string
          to_location_id: string | null
          total_value: number
          transfer_date: string
          transfer_number: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          dispatched_at?: string | null
          dispatched_by?: string | null
          from_location_id?: string | null
          id?: string
          notes?: string | null
          purpose?: string | null
          received_at?: string | null
          received_by?: string | null
          reference?: string | null
          requested_by?: string | null
          status?: string
          to_location_id?: string | null
          total_value?: number
          transfer_date?: string
          transfer_number?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          dispatched_at?: string | null
          dispatched_by?: string | null
          from_location_id?: string | null
          id?: string
          notes?: string | null
          purpose?: string | null
          received_at?: string | null
          received_by?: string | null
          reference?: string | null
          requested_by?: string | null
          status?: string
          to_location_id?: string | null
          total_value?: number
          transfer_date?: string
          transfer_number?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_transfers_from_location_id_fkey"
            columns: ["from_location_id"]
            isOneToOne: false
            referencedRelation: "inventory_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transfers_to_location_id_fkey"
            columns: ["to_location_id"]
            isOneToOne: false
            referencedRelation: "inventory_locations"
            referencedColumns: ["id"]
          },
        ]
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
      job_categories: {
        Row: {
          code: string | null
          company_id: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          code?: string | null
          company_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          code?: string | null
          company_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_categories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entries: {
        Row: {
          attachment_mime: string | null
          attachment_name: string | null
          attachment_url: string | null
          batch_id: string | null
          created_at: string
          currency: string
          description: string | null
          entry_date: string
          entry_number: string
          exchange_rate: number
          id: string
          reference: string | null
          reversal_of: string | null
          reversal_reason: string | null
          reversed_at: string | null
          reversed_by: string | null
          status: string
          total_credit: number | null
          total_debit: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          attachment_mime?: string | null
          attachment_name?: string | null
          attachment_url?: string | null
          batch_id?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          entry_date?: string
          entry_number: string
          exchange_rate?: number
          id?: string
          reference?: string | null
          reversal_of?: string | null
          reversal_reason?: string | null
          reversed_at?: string | null
          reversed_by?: string | null
          status?: string
          total_credit?: number | null
          total_debit?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          attachment_mime?: string | null
          attachment_name?: string | null
          attachment_url?: string | null
          batch_id?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          entry_date?: string
          entry_number?: string
          exchange_rate?: number
          id?: string
          reference?: string | null
          reversal_of?: string | null
          reversal_reason?: string | null
          reversed_at?: string | null
          reversed_by?: string | null
          status?: string
          total_credit?: number | null
          total_debit?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_entries_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "posting_batches"
            referencedColumns: ["id"]
          },
        ]
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
      leave_register: {
        Row: {
          closing_balance: number | null
          company_id: string | null
          created_at: string
          employee_id: string
          id: string
          leave_days_taken: number | null
          leave_value: number | null
          month: number
          normal_accrual: number | null
          notes: string | null
          opening_balance: number | null
          status: string
          total_days: number | null
          updated_at: string
          user_id: string
          year: number
        }
        Insert: {
          closing_balance?: number | null
          company_id?: string | null
          created_at?: string
          employee_id: string
          id?: string
          leave_days_taken?: number | null
          leave_value?: number | null
          month: number
          normal_accrual?: number | null
          notes?: string | null
          opening_balance?: number | null
          status?: string
          total_days?: number | null
          updated_at?: string
          user_id: string
          year: number
        }
        Update: {
          closing_balance?: number | null
          company_id?: string | null
          created_at?: string
          employee_id?: string
          id?: string
          leave_days_taken?: number | null
          leave_value?: number | null
          month?: number
          normal_accrual?: number | null
          notes?: string | null
          opening_balance?: number | null
          status?: string
          total_days?: number | null
          updated_at?: string
          user_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "leave_register_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_register_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
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
      loan_repayments: {
        Row: {
          amount: number
          created_at: string
          id: string
          interest_portion: number
          journal_entry_id: string | null
          loan_id: string
          method: string | null
          notes: string | null
          payment_date: string
          payroll_run_id: string | null
          principal_portion: number
          reference: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          interest_portion?: number
          journal_entry_id?: string | null
          loan_id: string
          method?: string | null
          notes?: string | null
          payment_date?: string
          payroll_run_id?: string | null
          principal_portion?: number
          reference?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          interest_portion?: number
          journal_entry_id?: string | null
          loan_id?: string
          method?: string | null
          notes?: string | null
          payment_date?: string
          payroll_run_id?: string | null
          principal_portion?: number
          reference?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loan_repayments_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loans"
            referencedColumns: ["id"]
          },
        ]
      }
      loan_schedule: {
        Row: {
          amount_paid: number
          closing_balance: number
          created_at: string
          due_date: string
          id: string
          interest_due: number
          loan_id: string
          opening_balance: number
          period_no: number
          principal_due: number
          status: string
          total_due: number
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_paid?: number
          closing_balance?: number
          created_at?: string
          due_date: string
          id?: string
          interest_due?: number
          loan_id: string
          opening_balance?: number
          period_no: number
          principal_due?: number
          status?: string
          total_due?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_paid?: number
          closing_balance?: number
          created_at?: string
          due_date?: string
          id?: string
          interest_due?: number
          loan_id?: string
          opening_balance?: number
          period_no?: number
          principal_due?: number
          status?: string
          total_due?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loan_schedule_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loans"
            referencedColumns: ["id"]
          },
        ]
      }
      loans: {
        Row: {
          amount_repaid: number
          company_id: string | null
          control_account_code: string | null
          counterparty: string | null
          created_at: string
          currency: string
          customer_id: string | null
          deduct_from_payroll: boolean
          employee_id: string | null
          first_due_date: string | null
          id: string
          instalment_amount: number | null
          interest_account_code: string | null
          interest_method: string
          interest_rate: number
          loan_number: string
          loan_type: string
          notes: string | null
          outstanding_balance: number
          principal: number
          start_date: string
          status: string
          supplier_id: string | null
          term_months: number
          total_interest: number | null
          total_repayable: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_repaid?: number
          company_id?: string | null
          control_account_code?: string | null
          counterparty?: string | null
          created_at?: string
          currency?: string
          customer_id?: string | null
          deduct_from_payroll?: boolean
          employee_id?: string | null
          first_due_date?: string | null
          id?: string
          instalment_amount?: number | null
          interest_account_code?: string | null
          interest_method?: string
          interest_rate?: number
          loan_number: string
          loan_type?: string
          notes?: string | null
          outstanding_balance?: number
          principal?: number
          start_date?: string
          status?: string
          supplier_id?: string | null
          term_months?: number
          total_interest?: number | null
          total_repayable?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_repaid?: number
          company_id?: string | null
          control_account_code?: string | null
          counterparty?: string | null
          created_at?: string
          currency?: string
          customer_id?: string | null
          deduct_from_payroll?: boolean
          employee_id?: string | null
          first_due_date?: string | null
          id?: string
          instalment_amount?: number | null
          interest_account_code?: string | null
          interest_method?: string
          interest_rate?: number
          loan_number?: string
          loan_type?: string
          notes?: string | null
          outstanding_balance?: number
          principal?: number
          start_date?: string
          status?: string
          supplier_id?: string | null
          term_months?: number
          total_interest?: number | null
          total_repayable?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      management_reports: {
        Row: {
          approved_at: string | null
          comments: string | null
          company_id: string | null
          created_at: string
          id: string
          period: string
          prepared_at: string
          prepared_by: string | null
          reference: string
          reviewed_by: string | null
          snapshot: Json
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          comments?: string | null
          company_id?: string | null
          created_at?: string
          id?: string
          period: string
          prepared_at?: string
          prepared_by?: string | null
          reference: string
          reviewed_by?: string | null
          snapshot?: Json
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          approved_at?: string | null
          comments?: string | null
          company_id?: string | null
          created_at?: string
          id?: string
          period?: string
          prepared_at?: string
          prepared_by?: string | null
          reference?: string
          reviewed_by?: string | null
          snapshot?: Json
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      module_dependencies: {
        Row: {
          depends_on: string
          id: string
          is_hard: boolean
          module_key: string
          note: string | null
        }
        Insert: {
          depends_on: string
          id?: string
          is_hard?: boolean
          module_key: string
          note?: string | null
        }
        Update: {
          depends_on?: string
          id?: string
          is_hard?: boolean
          module_key?: string
          note?: string | null
        }
        Relationships: []
      }
      moe_charge_codes: {
        Row: {
          charge_code: string
          code_type: string
          created_at: string
          description: string
          id: string
          suggested_account_code: string | null
        }
        Insert: {
          charge_code: string
          code_type: string
          created_at?: string
          description: string
          id?: string
          suggested_account_code?: string | null
        }
        Update: {
          charge_code?: string
          code_type?: string
          created_at?: string
          description?: string
          id?: string
          suggested_account_code?: string | null
        }
        Relationships: []
      }
      moe_programmes: {
        Row: {
          created_at: string
          default_percentage: number | null
          id: string
          programme_code: string
          programme_name: string
          school_level: string
          sub_programme_code: string
          sub_programme_name: string
        }
        Insert: {
          created_at?: string
          default_percentage?: number | null
          id?: string
          programme_code: string
          programme_name: string
          school_level: string
          sub_programme_code: string
          sub_programme_name: string
        }
        Update: {
          created_at?: string
          default_percentage?: number | null
          id?: string
          programme_code?: string
          programme_name?: string
          school_level?: string
          sub_programme_code?: string
          sub_programme_name?: string
        }
        Relationships: []
      }
      napsa_icare_entries: {
        Row: {
          company_id: string | null
          created_at: string
          date_of_birth: string | null
          employee_contribution: number | null
          employee_id: string | null
          employer_acc_no: string | null
          employer_contribution: number | null
          forename: string | null
          gross_pay: number | null
          id: string
          id_no: string | null
          month: number
          other_names: string | null
          process: string | null
          social_security_no: string | null
          status: string
          surname: string | null
          updated_at: string
          user_id: string
          year: number
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          date_of_birth?: string | null
          employee_contribution?: number | null
          employee_id?: string | null
          employer_acc_no?: string | null
          employer_contribution?: number | null
          forename?: string | null
          gross_pay?: number | null
          id?: string
          id_no?: string | null
          month: number
          other_names?: string | null
          process?: string | null
          social_security_no?: string | null
          status?: string
          surname?: string | null
          updated_at?: string
          user_id: string
          year: number
        }
        Update: {
          company_id?: string | null
          created_at?: string
          date_of_birth?: string | null
          employee_contribution?: number | null
          employee_id?: string | null
          employer_acc_no?: string | null
          employer_contribution?: number | null
          forename?: string | null
          gross_pay?: number | null
          id?: string
          id_no?: string | null
          month?: number
          other_names?: string | null
          process?: string | null
          social_security_no?: string | null
          status?: string
          surname?: string | null
          updated_at?: string
          user_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "napsa_icare_entries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "napsa_icare_entries_employee_id_fkey"
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
      pay_grades: {
        Row: {
          code: string | null
          company_id: string | null
          created_at: string
          description: string | null
          housing_allowance: number | null
          id: string
          max_salary: number | null
          mid_salary: number | null
          min_salary: number | null
          name: string
          notch: string | null
          status: string
          transport_allowance: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          code?: string | null
          company_id?: string | null
          created_at?: string
          description?: string | null
          housing_allowance?: number | null
          id?: string
          max_salary?: number | null
          mid_salary?: number | null
          min_salary?: number | null
          name: string
          notch?: string | null
          status?: string
          transport_allowance?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          code?: string | null
          company_id?: string | null
          created_at?: string
          description?: string | null
          housing_allowance?: number | null
          id?: string
          max_salary?: number | null
          mid_salary?: number | null
          min_salary?: number | null
          name?: string
          notch?: string | null
          status?: string
          transport_allowance?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pay_grades_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_deduction_types: {
        Row: {
          account_ref: string | null
          annual_tax_limit: number | null
          basis: string | null
          before_tax: boolean
          code: string
          company_id: string | null
          created_at: string
          earn_exclusion: string | null
          earn_inclusion: string | null
          earnings_max: number | null
          employee_formula: string | null
          employer_account_ref: string | null
          employer_formula: string | null
          employer_rate: number | null
          id: string
          name: string
          rate: number | null
          show_on: string | null
          sort_order: number | null
          status: string
          statutory: boolean
          tax_pct: number | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_ref?: string | null
          annual_tax_limit?: number | null
          basis?: string | null
          before_tax?: boolean
          code: string
          company_id?: string | null
          created_at?: string
          earn_exclusion?: string | null
          earn_inclusion?: string | null
          earnings_max?: number | null
          employee_formula?: string | null
          employer_account_ref?: string | null
          employer_formula?: string | null
          employer_rate?: number | null
          id?: string
          name: string
          rate?: number | null
          show_on?: string | null
          sort_order?: number | null
          status?: string
          statutory?: boolean
          tax_pct?: number | null
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_ref?: string | null
          annual_tax_limit?: number | null
          basis?: string | null
          before_tax?: boolean
          code?: string
          company_id?: string | null
          created_at?: string
          earn_exclusion?: string | null
          earn_inclusion?: string | null
          earnings_max?: number | null
          employee_formula?: string | null
          employer_account_ref?: string | null
          employer_formula?: string | null
          employer_rate?: number | null
          id?: string
          name?: string
          rate?: number | null
          show_on?: string | null
          sort_order?: number | null
          status?: string
          statutory?: boolean
          tax_pct?: number | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_deduction_types_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_income_types: {
        Row: {
          account_ref: string | null
          basis: string | null
          code: string
          company_id: string | null
          created_at: string
          deductible: boolean
          default_amount: number | null
          employee_formula: string | null
          employer_account_ref: string | null
          employer_formula: string | null
          freeze_me: boolean
          gross_up: boolean
          has_napsa: boolean
          has_nhima: boolean
          id: string
          name: string
          recover_days: boolean
          short_name: string | null
          show_on: string | null
          sort_order: number | null
          status: string
          taxable: boolean
          taxable_pct: number | null
          to_all: boolean
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_ref?: string | null
          basis?: string | null
          code: string
          company_id?: string | null
          created_at?: string
          deductible?: boolean
          default_amount?: number | null
          employee_formula?: string | null
          employer_account_ref?: string | null
          employer_formula?: string | null
          freeze_me?: boolean
          gross_up?: boolean
          has_napsa?: boolean
          has_nhima?: boolean
          id?: string
          name: string
          recover_days?: boolean
          short_name?: string | null
          show_on?: string | null
          sort_order?: number | null
          status?: string
          taxable?: boolean
          taxable_pct?: number | null
          to_all?: boolean
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_ref?: string | null
          basis?: string | null
          code?: string
          company_id?: string | null
          created_at?: string
          deductible?: boolean
          default_amount?: number | null
          employee_formula?: string | null
          employer_account_ref?: string | null
          employer_formula?: string | null
          freeze_me?: boolean
          gross_up?: boolean
          has_napsa?: boolean
          has_nhima?: boolean
          id?: string
          name?: string
          recover_days?: boolean
          short_name?: string | null
          show_on?: string | null
          sort_order?: number | null
          status?: string
          taxable?: boolean
          taxable_pct?: number | null
          to_all?: boolean
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_income_types_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_runs: {
        Row: {
          created_at: string
          currency: string
          employees_paid: number | null
          id: string
          notes: string | null
          pay_date: string | null
          period_month: number
          period_year: number
          run_number: string
          status: string
          total_allowances: number | null
          total_bonus: number | null
          total_employer_cost: number | null
          total_gross: number | null
          total_napsa: number | null
          total_net: number | null
          total_nhima: number | null
          total_overtime: number | null
          total_paye: number | null
          total_sdl: number | null
          total_wcf: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          currency?: string
          employees_paid?: number | null
          id?: string
          notes?: string | null
          pay_date?: string | null
          period_month: number
          period_year: number
          run_number: string
          status?: string
          total_allowances?: number | null
          total_bonus?: number | null
          total_employer_cost?: number | null
          total_gross?: number | null
          total_napsa?: number | null
          total_net?: number | null
          total_nhima?: number | null
          total_overtime?: number | null
          total_paye?: number | null
          total_sdl?: number | null
          total_wcf?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          currency?: string
          employees_paid?: number | null
          id?: string
          notes?: string | null
          pay_date?: string | null
          period_month?: number
          period_year?: number
          run_number?: string
          status?: string
          total_allowances?: number | null
          total_bonus?: number | null
          total_employer_cost?: number | null
          total_gross?: number | null
          total_napsa?: number | null
          total_net?: number | null
          total_nhima?: number | null
          total_overtime?: number | null
          total_paye?: number | null
          total_sdl?: number | null
          total_wcf?: number | null
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
      petty_cash: {
        Row: {
          amount: number
          approved_by: string | null
          balance_after: number | null
          charge_code: string | null
          company_id: string | null
          created_at: string
          description: string | null
          id: string
          journal_entry_id: string | null
          payee: string | null
          txn_date: string
          txn_type: string
          updated_at: string
          user_id: string
          voucher_no: string | null
        }
        Insert: {
          amount?: number
          approved_by?: string | null
          balance_after?: number | null
          charge_code?: string | null
          company_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          journal_entry_id?: string | null
          payee?: string | null
          txn_date?: string
          txn_type?: string
          updated_at?: string
          user_id: string
          voucher_no?: string | null
        }
        Update: {
          amount?: number
          approved_by?: string | null
          balance_after?: number | null
          charge_code?: string | null
          company_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          journal_entry_id?: string | null
          payee?: string | null
          txn_date?: string
          txn_type?: string
          updated_at?: string
          user_id?: string
          voucher_no?: string | null
        }
        Relationships: []
      }
      pos_favorites: {
        Row: {
          created_at: string
          group_name: string
          id: string
          item_id: string
          sort_order: number
          user_id: string
        }
        Insert: {
          created_at?: string
          group_name?: string
          id?: string
          item_id: string
          sort_order?: number
          user_id?: string
        }
        Update: {
          created_at?: string
          group_name?: string
          id?: string
          item_id?: string
          sort_order?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pos_favorites_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "stock_items"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_manager_overrides: {
        Row: {
          action: string
          cashier_user_id: string
          created_at: string
          entity_id: string | null
          expires_at: string
          id: string
          manager_user_id: string
          tenant_id: string
          used_at: string | null
        }
        Insert: {
          action: string
          cashier_user_id: string
          created_at?: string
          entity_id?: string | null
          expires_at?: string
          id?: string
          manager_user_id: string
          tenant_id: string
          used_at?: string | null
        }
        Update: {
          action?: string
          cashier_user_id?: string
          created_at?: string
          entity_id?: string | null
          expires_at?: string
          id?: string
          manager_user_id?: string
          tenant_id?: string
          used_at?: string | null
        }
        Relationships: []
      }
      pos_payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          method: string
          reference: string | null
          sale_id: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          method?: string
          reference?: string | null
          sale_id: string
          user_id?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          method?: string
          reference?: string | null
          sale_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pos_payments_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "pos_sales"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_pin_resets: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          attempts: number
          confirmed_at: string | null
          created_at: string
          denied_reason: string | null
          id: string
          new_pin: string | null
          owner_user_id: string
          permission_id: string
          reason: string | null
          requested_by: string | null
          status: string
          updated_at: string
          worker_user_id: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          attempts?: number
          confirmed_at?: string | null
          created_at?: string
          denied_reason?: string | null
          id?: string
          new_pin?: string | null
          owner_user_id: string
          permission_id: string
          reason?: string | null
          requested_by?: string | null
          status?: string
          updated_at?: string
          worker_user_id?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          attempts?: number
          confirmed_at?: string | null
          created_at?: string
          denied_reason?: string | null
          id?: string
          new_pin?: string | null
          owner_user_id?: string
          permission_id?: string
          reason?: string | null
          requested_by?: string | null
          status?: string
          updated_at?: string
          worker_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pos_pin_resets_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "employee_pos_permissions"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_registers: {
        Row: {
          branch: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          branch?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          branch?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pos_sale_items: {
        Row: {
          created_at: string
          discount: number
          id: string
          item_id: string | null
          line_total: number
          name: string
          note: string | null
          price: number
          qty: number
          sale_id: string
          sku: string | null
          tax_rate: number
          unit_cost: number
          user_id: string
        }
        Insert: {
          created_at?: string
          discount?: number
          id?: string
          item_id?: string | null
          line_total?: number
          name: string
          note?: string | null
          price?: number
          qty?: number
          sale_id: string
          sku?: string | null
          tax_rate?: number
          unit_cost?: number
          user_id?: string
        }
        Update: {
          created_at?: string
          discount?: number
          id?: string
          item_id?: string | null
          line_total?: number
          name?: string
          note?: string | null
          price?: number
          qty?: number
          sale_id?: string
          sku?: string | null
          tax_rate?: number
          unit_cost?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pos_sale_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "stock_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "pos_sales"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_sales: {
        Row: {
          branch_id: string | null
          change_due: number
          client_ref: string | null
          cost_total: number
          created_at: string
          created_by: string | null
          customer_id: string | null
          customer_name: string
          discount: number
          id: string
          journal_entry_id: string | null
          location_id: string | null
          note: string | null
          paid: number
          price_level: string
          refund_of: string | null
          register_id: string | null
          sale_no: string | null
          shift_id: string | null
          sold_at: string
          status: string
          subtotal: number
          tax: number
          total: number
          updated_at: string
          user_id: string
          void_reason: string | null
        }
        Insert: {
          branch_id?: string | null
          change_due?: number
          client_ref?: string | null
          cost_total?: number
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          customer_name?: string
          discount?: number
          id?: string
          journal_entry_id?: string | null
          location_id?: string | null
          note?: string | null
          paid?: number
          price_level?: string
          refund_of?: string | null
          register_id?: string | null
          sale_no?: string | null
          shift_id?: string | null
          sold_at?: string
          status?: string
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string
          user_id?: string
          void_reason?: string | null
        }
        Update: {
          branch_id?: string | null
          change_due?: number
          client_ref?: string | null
          cost_total?: number
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          customer_name?: string
          discount?: number
          id?: string
          journal_entry_id?: string | null
          location_id?: string | null
          note?: string | null
          paid?: number
          price_level?: string
          refund_of?: string | null
          register_id?: string | null
          sale_no?: string | null
          shift_id?: string | null
          sold_at?: string
          status?: string
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string
          user_id?: string
          void_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pos_sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_sales_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "inventory_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_sales_register_id_fkey"
            columns: ["register_id"]
            isOneToOne: false
            referencedRelation: "pos_registers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_sales_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "pos_shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_settings: {
        Row: {
          allow_negative_stock: boolean
          allow_price_change: boolean
          auto_new_sale: boolean
          auto_print_receipt: boolean
          created_at: string
          default_customer: string
          default_payment: string
          default_price_level: string
          enable_fast_sellers: boolean
          enable_quick_discounts: boolean
          enable_quick_qty: boolean
          products_per_row: number
          receipt_footer: string | null
          show_images: boolean
          show_sku: boolean
          show_stock: boolean
          silent_print: boolean
          tax_inclusive: boolean
          tax_rate: number
          updated_at: string
          user_id: string
        }
        Insert: {
          allow_negative_stock?: boolean
          allow_price_change?: boolean
          auto_new_sale?: boolean
          auto_print_receipt?: boolean
          created_at?: string
          default_customer?: string
          default_payment?: string
          default_price_level?: string
          enable_fast_sellers?: boolean
          enable_quick_discounts?: boolean
          enable_quick_qty?: boolean
          products_per_row?: number
          receipt_footer?: string | null
          show_images?: boolean
          show_sku?: boolean
          show_stock?: boolean
          silent_print?: boolean
          tax_inclusive?: boolean
          tax_rate?: number
          updated_at?: string
          user_id?: string
        }
        Update: {
          allow_negative_stock?: boolean
          allow_price_change?: boolean
          auto_new_sale?: boolean
          auto_print_receipt?: boolean
          created_at?: string
          default_customer?: string
          default_payment?: string
          default_price_level?: string
          enable_fast_sellers?: boolean
          enable_quick_discounts?: boolean
          enable_quick_qty?: boolean
          products_per_row?: number
          receipt_footer?: string | null
          show_images?: boolean
          show_sku?: boolean
          show_stock?: boolean
          silent_print?: boolean
          tax_inclusive?: boolean
          tax_rate?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pos_shifts: {
        Row: {
          actual_cash: number | null
          branch_id: string | null
          card_sales: number
          cash_in: number
          cash_out: number
          cash_sales: number
          cashier_name: string | null
          cashier_user_id: string | null
          closed_at: string | null
          created_at: string
          created_by: string | null
          drawer_name: string | null
          expected_cash: number
          id: string
          location_id: string | null
          manager_comment: string | null
          momo_sales: number
          notes: string | null
          opened_at: string
          opening_float: number
          other_sales: number
          refunds_total: number
          register_id: string | null
          review_status: string
          reviewed_at: string | null
          reviewed_by: string | null
          station: string | null
          status: string
          submitted_at: string | null
          updated_at: string
          user_id: string
          variance: number | null
        }
        Insert: {
          actual_cash?: number | null
          branch_id?: string | null
          card_sales?: number
          cash_in?: number
          cash_out?: number
          cash_sales?: number
          cashier_name?: string | null
          cashier_user_id?: string | null
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          drawer_name?: string | null
          expected_cash?: number
          id?: string
          location_id?: string | null
          manager_comment?: string | null
          momo_sales?: number
          notes?: string | null
          opened_at?: string
          opening_float?: number
          other_sales?: number
          refunds_total?: number
          register_id?: string | null
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          station?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
          user_id?: string
          variance?: number | null
        }
        Update: {
          actual_cash?: number | null
          branch_id?: string | null
          card_sales?: number
          cash_in?: number
          cash_out?: number
          cash_sales?: number
          cashier_name?: string | null
          cashier_user_id?: string | null
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          drawer_name?: string | null
          expected_cash?: number
          id?: string
          location_id?: string | null
          manager_comment?: string | null
          momo_sales?: number
          notes?: string | null
          opened_at?: string
          opening_float?: number
          other_sales?: number
          refunds_total?: number
          register_id?: string | null
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          station?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
          user_id?: string
          variance?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pos_shifts_register_id_fkey"
            columns: ["register_id"]
            isOneToOne: false
            referencedRelation: "pos_registers"
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
      posting_batches: {
        Row: {
          batch_date: string
          batch_number: string
          batch_type: string
          created_at: string
          description: string | null
          entry_count: number
          id: string
          posted_at: string | null
          posted_by: string | null
          reversed_at: string | null
          reversed_by: string | null
          source_module: string | null
          status: string
          total_credit: number
          total_debit: number
          updated_at: string
          user_id: string
        }
        Insert: {
          batch_date?: string
          batch_number: string
          batch_type: string
          created_at?: string
          description?: string | null
          entry_count?: number
          id?: string
          posted_at?: string | null
          posted_by?: string | null
          reversed_at?: string | null
          reversed_by?: string | null
          source_module?: string | null
          status?: string
          total_credit?: number
          total_debit?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          batch_date?: string
          batch_number?: string
          batch_type?: string
          created_at?: string
          description?: string | null
          entry_count?: number
          id?: string
          posted_at?: string | null
          posted_by?: string | null
          reversed_at?: string | null
          reversed_by?: string | null
          source_module?: string | null
          status?: string
          total_credit?: number
          total_debit?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      preset_accounts: {
        Row: {
          account_code: string
          account_name: string
          account_type: string
          id: string
          normal_balance: string | null
          preset_id: string
          purpose: string | null
          sort_order: number
        }
        Insert: {
          account_code: string
          account_name: string
          account_type: string
          id?: string
          normal_balance?: string | null
          preset_id: string
          purpose?: string | null
          sort_order?: number
        }
        Update: {
          account_code?: string
          account_name?: string
          account_type?: string
          id?: string
          normal_balance?: string | null
          preset_id?: string
          purpose?: string | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "preset_accounts_preset_id_fkey"
            columns: ["preset_id"]
            isOneToOne: false
            referencedRelation: "business_presets"
            referencedColumns: ["id"]
          },
        ]
      }
      preset_modules: {
        Row: {
          id: string
          is_enabled: boolean
          module_key: string
          preset_id: string
        }
        Insert: {
          id?: string
          is_enabled?: boolean
          module_key: string
          preset_id: string
        }
        Update: {
          id?: string
          is_enabled?: boolean
          module_key?: string
          preset_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "preset_modules_preset_id_fkey"
            columns: ["preset_id"]
            isOneToOne: false
            referencedRelation: "business_presets"
            referencedColumns: ["id"]
          },
        ]
      }
      print_devices: {
        Row: {
          agent_seen_at: string | null
          agent_status: string
          agent_url: string | null
          auto_print_kitchen: boolean
          auto_print_receipt: boolean
          branch_id: string | null
          branch_name: string | null
          company_id: string | null
          company_name: string | null
          created_at: string
          device_id: string
          device_type: string
          id: string
          last_seen_at: string
          open_cash_drawer: boolean
          printer_config: Json
          queue_when_offline: boolean
          retry_failed: boolean
          terminal_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_seen_at?: string | null
          agent_status?: string
          agent_url?: string | null
          auto_print_kitchen?: boolean
          auto_print_receipt?: boolean
          branch_id?: string | null
          branch_name?: string | null
          company_id?: string | null
          company_name?: string | null
          created_at?: string
          device_id: string
          device_type?: string
          id?: string
          last_seen_at?: string
          open_cash_drawer?: boolean
          printer_config?: Json
          queue_when_offline?: boolean
          retry_failed?: boolean
          terminal_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          agent_seen_at?: string | null
          agent_status?: string
          agent_url?: string | null
          auto_print_kitchen?: boolean
          auto_print_receipt?: boolean
          branch_id?: string | null
          branch_name?: string | null
          company_id?: string | null
          company_name?: string | null
          created_at?: string
          device_id?: string
          device_type?: string
          id?: string
          last_seen_at?: string
          open_cash_drawer?: boolean
          printer_config?: Json
          queue_when_offline?: boolean
          retry_failed?: boolean
          terminal_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      print_jobs: {
        Row: {
          attempt_count: number
          branch_id: string | null
          company_id: string | null
          copies: number
          created_at: string
          device_id: string | null
          error: string | null
          id: string
          job_key: string | null
          job_type: string
          payload: Json | null
          printed_at: string | null
          printer_id: string | null
          printer_name: string | null
          reference_id: string | null
          status: string
          terminal_name: string | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          attempt_count?: number
          branch_id?: string | null
          company_id?: string | null
          copies?: number
          created_at?: string
          device_id?: string | null
          error?: string | null
          id?: string
          job_key?: string | null
          job_type: string
          payload?: Json | null
          printed_at?: string | null
          printer_id?: string | null
          printer_name?: string | null
          reference_id?: string | null
          status?: string
          terminal_name?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          attempt_count?: number
          branch_id?: string | null
          company_id?: string | null
          copies?: number
          created_at?: string
          device_id?: string | null
          error?: string | null
          id?: string
          job_key?: string | null
          job_type?: string
          payload?: Json | null
          printed_at?: string | null
          printer_id?: string | null
          printer_name?: string | null
          reference_id?: string | null
          status?: string
          terminal_name?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      print_printers: {
        Row: {
          branch_id: string | null
          company_id: string | null
          connection: string
          created_at: string
          device_id: string | null
          id: string
          ip_address: string | null
          is_default: boolean
          is_system_default: boolean
          label: string | null
          last_seen_at: string | null
          name: string
          port: number | null
          printer_type: string
          protocol: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          branch_id?: string | null
          company_id?: string | null
          connection?: string
          created_at?: string
          device_id?: string | null
          id?: string
          ip_address?: string | null
          is_default?: boolean
          is_system_default?: boolean
          label?: string | null
          last_seen_at?: string | null
          name: string
          port?: number | null
          printer_type?: string
          protocol?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          branch_id?: string | null
          company_id?: string | null
          connection?: string
          created_at?: string
          device_id?: string | null
          id?: string
          ip_address?: string | null
          is_default?: boolean
          is_system_default?: boolean
          label?: string | null
          last_seen_at?: string | null
          name?: string
          port?: number | null
          printer_type?: string
          protocol?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      print_routing: {
        Row: {
          branch_id: string | null
          company_id: string | null
          copies: number
          created_at: string
          device_id: string | null
          enabled: boolean
          id: string
          job_type: string
          printer_id: string | null
          printer_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          branch_id?: string | null
          company_id?: string | null
          copies?: number
          created_at?: string
          device_id?: string | null
          enabled?: boolean
          id?: string
          job_type: string
          printer_id?: string | null
          printer_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          branch_id?: string | null
          company_id?: string | null
          copies?: number
          created_at?: string
          device_id?: string | null
          enabled?: boolean
          id?: string
          job_type?: string
          printer_id?: string | null
          printer_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "print_routing_printer_id_fkey"
            columns: ["printer_id"]
            isOneToOne: false
            referencedRelation: "print_printers"
            referencedColumns: ["id"]
          },
        ]
      }
      product_price_history: {
        Row: {
          cashier_name: string | null
          created_at: string
          created_by: string | null
          effective_date: string
          id: string
          item_id: string
          location_id: string | null
          note: string | null
          price: number
          price_type: string
          quantity: number | null
          source_id: string | null
          source_type: string | null
          user_id: string
        }
        Insert: {
          cashier_name?: string | null
          created_at?: string
          created_by?: string | null
          effective_date?: string
          id?: string
          item_id: string
          location_id?: string | null
          note?: string | null
          price: number
          price_type?: string
          quantity?: number | null
          source_id?: string | null
          source_type?: string | null
          user_id: string
        }
        Update: {
          cashier_name?: string | null
          created_at?: string
          created_by?: string | null
          effective_date?: string
          id?: string
          item_id?: string
          location_id?: string | null
          note?: string | null
          price?: number
          price_type?: string
          quantity?: number | null
          source_id?: string | null
          source_type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_price_history_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "stock_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_price_history_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "inventory_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      production_batch_lines: {
        Row: {
          batch_id: string
          created_at: string
          id: string
          item_id: string
          note: string | null
          quantity: number
          unit_cost: number | null
          user_id: string
        }
        Insert: {
          batch_id: string
          created_at?: string
          id?: string
          item_id: string
          note?: string | null
          quantity?: number
          unit_cost?: number | null
          user_id: string
        }
        Update: {
          batch_id?: string
          created_at?: string
          id?: string
          item_id?: string
          note?: string | null
          quantity?: number
          unit_cost?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_batch_lines_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "production_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_batch_lines_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "stock_items"
            referencedColumns: ["id"]
          },
        ]
      }
      production_batches: {
        Row: {
          batch_date: string
          batch_no: string
          created_at: string
          created_by: string | null
          id: string
          location_id: string | null
          notes: string | null
          posted_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          batch_date?: string
          batch_no: string
          created_at?: string
          created_by?: string | null
          id?: string
          location_id?: string | null
          notes?: string | null
          posted_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          batch_date?: string
          batch_no?: string
          created_at?: string
          created_by?: string | null
          id?: string
          location_id?: string | null
          notes?: string | null
          posted_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_batches_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "inventory_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active_company_id: string | null
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
          active_company_id?: string | null
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
          active_company_id?: string | null
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
        Relationships: [
          {
            foreignKeyName: "profiles_active_company_id_fkey"
            columns: ["active_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
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
      rbac_permissions: {
        Row: {
          key: string
          label: string
          perm_group: string
          sort: number
        }
        Insert: {
          key: string
          label: string
          perm_group: string
          sort?: number
        }
        Update: {
          key?: string
          label?: string
          perm_group?: string
          sort?: number
        }
        Relationships: []
      }
      rbac_role_permissions: {
        Row: {
          permission_key: string
          role_id: string
        }
        Insert: {
          permission_key: string
          role_id: string
        }
        Update: {
          permission_key?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rbac_role_permissions_permission_key_fkey"
            columns: ["permission_key"]
            isOneToOne: false
            referencedRelation: "rbac_permissions"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "rbac_role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "rbac_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      rbac_roles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_system: boolean
          key: string
          name: string
          pos_channel: string | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          key: string
          name: string
          pos_channel?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          key?: string
          name?: string
          pos_channel?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      receipt_allocations: {
        Row: {
          account_id: string | null
          amount: number
          created_at: string
          id: string
          invoice_id: string | null
          memo: string | null
          receipt_id: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          created_at?: string
          id?: string
          invoice_id?: string | null
          memo?: string | null
          receipt_id: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          created_at?: string
          id?: string
          invoice_id?: string | null
          memo?: string | null
          receipt_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "receipt_allocations_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "account_balances"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "receipt_allocations_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipt_allocations_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipt_allocations_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "receipts"
            referencedColumns: ["id"]
          },
        ]
      }
      receipts: {
        Row: {
          amount: number
          bank_account_id: string | null
          branch_id: string | null
          created_at: string
          currency: string
          customer_id: string | null
          exchange_rate: number
          id: string
          invoice_id: string | null
          method: string
          notes: string | null
          number: string
          payer_name: string | null
          receipt_date: string
          receipt_type: string
          reference: string | null
          reversal_reason: string | null
          reversed_at: string | null
          reversed_by: string | null
          status: string
          updated_at: string
          user_id: string
          voucher_no: string | null
        }
        Insert: {
          amount?: number
          bank_account_id?: string | null
          branch_id?: string | null
          created_at?: string
          currency?: string
          customer_id?: string | null
          exchange_rate?: number
          id?: string
          invoice_id?: string | null
          method?: string
          notes?: string | null
          number: string
          payer_name?: string | null
          receipt_date?: string
          receipt_type?: string
          reference?: string | null
          reversal_reason?: string | null
          reversed_at?: string | null
          reversed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
          voucher_no?: string | null
        }
        Update: {
          amount?: number
          bank_account_id?: string | null
          branch_id?: string | null
          created_at?: string
          currency?: string
          customer_id?: string | null
          exchange_rate?: number
          id?: string
          invoice_id?: string | null
          method?: string
          notes?: string | null
          number?: string
          payer_name?: string | null
          receipt_date?: string
          receipt_type?: string
          reference?: string | null
          reversal_reason?: string | null
          reversed_at?: string | null
          reversed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          voucher_no?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "receipts_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_running_balance"
            referencedColumns: ["bank_account_id"]
          },
          {
            foreignKeyName: "receipts_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
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
      restaurant_cash_drawers: {
        Row: {
          business_date: string
          cash_drops: number
          cash_payouts: number
          cash_sales: number
          closed_at: string | null
          closed_by: string | null
          counted_cash: number
          created_at: string
          created_by: string | null
          expected_cash: number
          id: string
          name: string
          opened_at: string
          opened_by: string | null
          opening_float: number
          station: string | null
          status: string
          updated_at: string
          user_id: string
          variance: number
        }
        Insert: {
          business_date?: string
          cash_drops?: number
          cash_payouts?: number
          cash_sales?: number
          closed_at?: string | null
          closed_by?: string | null
          counted_cash?: number
          created_at?: string
          created_by?: string | null
          expected_cash?: number
          id?: string
          name?: string
          opened_at?: string
          opened_by?: string | null
          opening_float?: number
          station?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          variance?: number
        }
        Update: {
          business_date?: string
          cash_drops?: number
          cash_payouts?: number
          cash_sales?: number
          closed_at?: string | null
          closed_by?: string | null
          counted_cash?: number
          created_at?: string
          created_by?: string | null
          expected_cash?: number
          id?: string
          name?: string
          opened_at?: string
          opened_by?: string | null
          opening_float?: number
          station?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          variance?: number
        }
        Relationships: []
      }
      restaurant_cash_transactions: {
        Row: {
          amount: number
          approved_by: string | null
          created_at: string
          drawer_id: string | null
          id: string
          journal_entry_id: string | null
          reason: string | null
          reference: string | null
          txn_type: string
          user_id: string
        }
        Insert: {
          amount?: number
          approved_by?: string | null
          created_at?: string
          drawer_id?: string | null
          id?: string
          journal_entry_id?: string | null
          reason?: string | null
          reference?: string | null
          txn_type?: string
          user_id?: string
        }
        Update: {
          amount?: number
          approved_by?: string | null
          created_at?: string
          drawer_id?: string | null
          id?: string
          journal_entry_id?: string | null
          reason?: string | null
          reference?: string | null
          txn_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_cash_transactions_drawer_id_fkey"
            columns: ["drawer_id"]
            isOneToOne: false
            referencedRelation: "restaurant_cash_drawers"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_delivery_zones: {
        Row: {
          active: boolean
          created_at: string
          eta_minutes: number
          fee: number
          id: string
          min_order: number
          name: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          eta_minutes?: number
          fee?: number
          id?: string
          min_order?: number
          name: string
          user_id?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          eta_minutes?: number
          fee?: number
          id?: string
          min_order?: number
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      restaurant_end_of_day: {
        Row: {
          approved_by: string | null
          business_date: string
          card_sales: number
          cash_payouts: number
          cash_sales: number
          cash_variance: number
          created_at: string
          delivery_fees: number
          discounts: number
          gratuity: number
          gross_sales: number
          id: string
          momo_sales: number
          net_total: number
          notes: string | null
          orders_count: number
          other_sales: number
          service_charge: number
          status: string
          tax: number
          user_id: string
        }
        Insert: {
          approved_by?: string | null
          business_date?: string
          card_sales?: number
          cash_payouts?: number
          cash_sales?: number
          cash_variance?: number
          created_at?: string
          delivery_fees?: number
          discounts?: number
          gratuity?: number
          gross_sales?: number
          id?: string
          momo_sales?: number
          net_total?: number
          notes?: string | null
          orders_count?: number
          other_sales?: number
          service_charge?: number
          status?: string
          tax?: number
          user_id?: string
        }
        Update: {
          approved_by?: string | null
          business_date?: string
          card_sales?: number
          cash_payouts?: number
          cash_sales?: number
          cash_variance?: number
          created_at?: string
          delivery_fees?: number
          discounts?: number
          gratuity?: number
          gross_sales?: number
          id?: string
          momo_sales?: number
          net_total?: number
          notes?: string | null
          orders_count?: number
          other_sales?: number
          service_charge?: number
          status?: string
          tax?: number
          user_id?: string
        }
        Relationships: []
      }
      restaurant_gift_cards: {
        Row: {
          balance: number
          code: string
          created_at: string
          customer_id: string | null
          expires_on: string | null
          id: string
          initial_value: number
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          code: string
          created_at?: string
          customer_id?: string | null
          expires_on?: string | null
          id?: string
          initial_value?: number
          status?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          balance?: number
          code?: string
          created_at?: string
          customer_id?: string | null
          expires_on?: string | null
          id?: string
          initial_value?: number
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_gift_cards_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_kitchen_stations: {
        Row: {
          active: boolean
          categories: string[]
          colour: string | null
          created_at: string
          id: string
          name: string
          printer: string | null
          sort_order: number
          user_id: string
        }
        Insert: {
          active?: boolean
          categories?: string[]
          colour?: string | null
          created_at?: string
          id?: string
          name: string
          printer?: string | null
          sort_order?: number
          user_id?: string
        }
        Update: {
          active?: boolean
          categories?: string[]
          colour?: string | null
          created_at?: string
          id?: string
          name?: string
          printer?: string | null
          sort_order?: number
          user_id?: string
        }
        Relationships: []
      }
      restaurant_loyalty_accounts: {
        Row: {
          created_at: string
          customer_id: string | null
          id: string
          lifetime_spend: number
          member_name: string | null
          phone: string | null
          points: number
          tier: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          id?: string
          lifetime_spend?: number
          member_name?: string | null
          phone?: string | null
          points?: number
          tier?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          id?: string
          lifetime_spend?: number
          member_name?: string | null
          phone?: string | null
          points?: number
          tier?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_loyalty_accounts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_menu_item_groups: {
        Row: {
          created_at: string
          group_id: string
          id: string
          menu_item_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          menu_item_id: string
          user_id?: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          menu_item_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_menu_item_groups_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "restaurant_modifier_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_menu_item_groups_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "restaurant_menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_menu_items: {
        Row: {
          active: boolean
          category: string
          cost: number
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_86: boolean
          name: string
          price: number
          prices: Json
          sku: string | null
          sort_order: number
          station: string
          stock_item_id: string | null
          tax_rate: number
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          category?: string
          cost?: number
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_86?: boolean
          name: string
          price?: number
          prices?: Json
          sku?: string | null
          sort_order?: number
          station?: string
          stock_item_id?: string | null
          tax_rate?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          category?: string
          cost?: number
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_86?: boolean
          name?: string
          price?: number
          prices?: Json
          sku?: string | null
          sort_order?: number
          station?: string
          stock_item_id?: string | null
          tax_rate?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_menu_items_stock_item_id_fkey"
            columns: ["stock_item_id"]
            isOneToOne: false
            referencedRelation: "stock_items"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_modifier_groups: {
        Row: {
          applies_to_categories: string[]
          created_at: string
          id: string
          max_select: number
          min_select: number
          name: string
          required: boolean
          sort_order: number
          updated_at: string
          user_id: string
        }
        Insert: {
          applies_to_categories?: string[]
          created_at?: string
          id?: string
          max_select?: number
          min_select?: number
          name: string
          required?: boolean
          sort_order?: number
          updated_at?: string
          user_id?: string
        }
        Update: {
          applies_to_categories?: string[]
          created_at?: string
          id?: string
          max_select?: number
          min_select?: number
          name?: string
          required?: boolean
          sort_order?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      restaurant_modifiers: {
        Row: {
          active: boolean
          created_at: string
          group_id: string
          id: string
          name: string
          price: number
          sort_order: number
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          group_id: string
          id?: string
          name: string
          price?: number
          sort_order?: number
          user_id?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          group_id?: string
          id?: string
          name?: string
          price?: number
          sort_order?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_modifiers_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "restaurant_modifier_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_order_items: {
        Row: {
          created_at: string
          discount: number
          id: string
          item_name: string
          kds_status: string
          menu_item_id: string | null
          modifiers: Json
          notes: string | null
          order_id: string
          price: number
          qty: number
          seat_no: number | null
          station: string
          unit_cost: number
          user_id: string
        }
        Insert: {
          created_at?: string
          discount?: number
          id?: string
          item_name: string
          kds_status?: string
          menu_item_id?: string | null
          modifiers?: Json
          notes?: string | null
          order_id: string
          price?: number
          qty?: number
          seat_no?: number | null
          station?: string
          unit_cost?: number
          user_id: string
        }
        Update: {
          created_at?: string
          discount?: number
          id?: string
          item_name?: string
          kds_status?: string
          menu_item_id?: string | null
          modifiers?: Json
          notes?: string | null
          order_id?: string
          price?: number
          qty?: number
          seat_no?: number | null
          station?: string
          unit_cost?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_order_items_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "restaurant_menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "restaurant_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_order_types: {
        Row: {
          active: boolean
          created_at: string
          default_gratuity_pct: number
          id: string
          key: string
          label: string
          packaging_fee: number
          price_key: string | null
          requires_address: boolean
          requires_customer: boolean
          requires_table: boolean
          service_charge_pct: number
          settings: Json
          sort_order: number
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          default_gratuity_pct?: number
          id?: string
          key: string
          label: string
          packaging_fee?: number
          price_key?: string | null
          requires_address?: boolean
          requires_customer?: boolean
          requires_table?: boolean
          service_charge_pct?: number
          settings?: Json
          sort_order?: number
          updated_at?: string
          user_id?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          default_gratuity_pct?: number
          id?: string
          key?: string
          label?: string
          packaging_fee?: number
          price_key?: string | null
          requires_address?: boolean
          requires_customer?: boolean
          requires_table?: boolean
          service_charge_pct?: number
          settings?: Json
          sort_order?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      restaurant_orders: {
        Row: {
          amount_paid: number
          branch_id: string | null
          business_date: string
          change_due: number
          closed_at: string | null
          created_by: string | null
          customer_id: string | null
          customer_name: string | null
          customer_phone: string | null
          delivered_at: string | null
          delivery_address: string | null
          delivery_fee: number
          delivery_zone_id: string | null
          discount: number
          dispatched_at: string | null
          drawer_id: string | null
          driver_name: string | null
          driver_phone: string | null
          eod_id: string | null
          gratuity: number
          guests: number
          id: string
          journal_entry_id: string | null
          notes: string | null
          opened_at: string
          order_no: string | null
          order_type: string
          packaging_fee: number
          payment_method: string | null
          priority: string
          server_name: string | null
          service_charge: number
          status: string
          subtotal: number
          table_id: string | null
          tax: number
          total: number
          updated_at: string
          user_id: string
          void_reason: string | null
        }
        Insert: {
          amount_paid?: number
          branch_id?: string | null
          business_date?: string
          change_due?: number
          closed_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivered_at?: string | null
          delivery_address?: string | null
          delivery_fee?: number
          delivery_zone_id?: string | null
          discount?: number
          dispatched_at?: string | null
          drawer_id?: string | null
          driver_name?: string | null
          driver_phone?: string | null
          eod_id?: string | null
          gratuity?: number
          guests?: number
          id?: string
          journal_entry_id?: string | null
          notes?: string | null
          opened_at?: string
          order_no?: string | null
          order_type?: string
          packaging_fee?: number
          payment_method?: string | null
          priority?: string
          server_name?: string | null
          service_charge?: number
          status?: string
          subtotal?: number
          table_id?: string | null
          tax?: number
          total?: number
          updated_at?: string
          user_id: string
          void_reason?: string | null
        }
        Update: {
          amount_paid?: number
          branch_id?: string | null
          business_date?: string
          change_due?: number
          closed_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivered_at?: string | null
          delivery_address?: string | null
          delivery_fee?: number
          delivery_zone_id?: string | null
          discount?: number
          dispatched_at?: string | null
          drawer_id?: string | null
          driver_name?: string | null
          driver_phone?: string | null
          eod_id?: string | null
          gratuity?: number
          guests?: number
          id?: string
          journal_entry_id?: string | null
          notes?: string | null
          opened_at?: string
          order_no?: string | null
          order_type?: string
          packaging_fee?: number
          payment_method?: string | null
          priority?: string
          server_name?: string | null
          service_charge?: number
          status?: string
          subtotal?: number
          table_id?: string | null
          tax?: number
          total?: number
          updated_at?: string
          user_id?: string
          void_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_orders_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_orders_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "restaurant_tables"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_payments: {
        Row: {
          amount: number
          change_given: number
          created_at: string
          drawer_id: string | null
          id: string
          method: string
          order_id: string
          reference: string | null
          tendered: number
          user_id: string
        }
        Insert: {
          amount?: number
          change_given?: number
          created_at?: string
          drawer_id?: string | null
          id?: string
          method?: string
          order_id: string
          reference?: string | null
          tendered?: number
          user_id?: string
        }
        Update: {
          amount?: number
          change_given?: number
          created_at?: string
          drawer_id?: string | null
          id?: string
          method?: string
          order_id?: string
          reference?: string | null
          tendered?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_payments_drawer_id_fkey"
            columns: ["drawer_id"]
            isOneToOne: false
            referencedRelation: "restaurant_cash_drawers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "restaurant_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_recipes: {
        Row: {
          created_at: string
          id: string
          menu_item_id: string
          quantity: number
          stock_item_id: string
          unit: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          menu_item_id: string
          quantity?: number
          stock_item_id: string
          unit?: string | null
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          menu_item_id?: string
          quantity?: number
          stock_item_id?: string
          unit?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_recipes_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "restaurant_menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_recipes_stock_item_id_fkey"
            columns: ["stock_item_id"]
            isOneToOne: false
            referencedRelation: "stock_items"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_reservations: {
        Row: {
          created_at: string
          email: string | null
          guest_name: string
          guests: number
          id: string
          order_id: string | null
          phone: string | null
          reserved_date: string
          reserved_time: string
          source: string
          special_requests: string | null
          status: string
          table_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          guest_name: string
          guests?: number
          id?: string
          order_id?: string | null
          phone?: string | null
          reserved_date?: string
          reserved_time?: string
          source?: string
          special_requests?: string | null
          status?: string
          table_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          guest_name?: string
          guests?: number
          id?: string
          order_id?: string | null
          phone?: string | null
          reserved_date?: string
          reserved_time?: string
          source?: string
          special_requests?: string | null
          status?: string
          table_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_reservations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "restaurant_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_reservations_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "restaurant_tables"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_settings: {
        Row: {
          auto_post_sales: boolean
          business_name: string | null
          created_at: string
          deplete_ingredients: boolean
          gratuity_options: Json
          id: string
          packaging_fee: number
          receipt_footer: string | null
          service_charge_pct: number
          updated_at: string
          user_id: string
          vat_rate: number
        }
        Insert: {
          auto_post_sales?: boolean
          business_name?: string | null
          created_at?: string
          deplete_ingredients?: boolean
          gratuity_options?: Json
          id?: string
          packaging_fee?: number
          receipt_footer?: string | null
          service_charge_pct?: number
          updated_at?: string
          user_id?: string
          vat_rate?: number
        }
        Update: {
          auto_post_sales?: boolean
          business_name?: string | null
          created_at?: string
          deplete_ingredients?: boolean
          gratuity_options?: Json
          id?: string
          packaging_fee?: number
          receipt_footer?: string | null
          service_charge_pct?: number
          updated_at?: string
          user_id?: string
          vat_rate?: number
        }
        Relationships: []
      }
      restaurant_shifts: {
        Row: {
          branch_id: string | null
          business_date: string
          clock_in: string
          clock_out: string | null
          created_at: string
          created_by: string | null
          declared_tips: number
          employee_id: string | null
          id: string
          role: string
          staff_name: string
          user_id: string
        }
        Insert: {
          branch_id?: string | null
          business_date?: string
          clock_in?: string
          clock_out?: string | null
          created_at?: string
          created_by?: string | null
          declared_tips?: number
          employee_id?: string | null
          id?: string
          role?: string
          staff_name: string
          user_id?: string
        }
        Update: {
          branch_id?: string | null
          business_date?: string
          clock_in?: string
          clock_out?: string | null
          created_at?: string
          created_by?: string | null
          declared_tips?: number
          employee_id?: string | null
          id?: string
          role?: string
          staff_name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_shifts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_tables: {
        Row: {
          area: string
          branch_id: string | null
          created_at: string
          current_order_id: string | null
          id: string
          name: string
          occupied_since: string | null
          pos_x: number
          pos_y: number
          seats: number
          server_name: string | null
          shape: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          area?: string
          branch_id?: string | null
          created_at?: string
          current_order_id?: string | null
          id?: string
          name: string
          occupied_since?: string | null
          pos_x?: number
          pos_y?: number
          seats?: number
          server_name?: string | null
          shape?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          area?: string
          branch_id?: string | null
          created_at?: string
          current_order_id?: string | null
          id?: string
          name?: string
          occupied_since?: string | null
          pos_x?: number
          pos_y?: number
          seats?: number
          server_name?: string | null
          shape?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      restaurant_waitlist: {
        Row: {
          created_at: string
          guest_name: string
          guests: number
          id: string
          notes: string | null
          phone: string | null
          quoted_minutes: number
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          guest_name: string
          guests?: number
          id?: string
          notes?: string | null
          phone?: string | null
          quoted_minutes?: number
          status?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          guest_name?: string
          guests?: number
          id?: string
          notes?: string | null
          phone?: string | null
          quoted_minutes?: number
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      role_module_permissions: {
        Row: {
          can_manage: boolean
          can_view: boolean
          created_at: string
          id: string
          module_key: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          can_manage?: boolean
          can_view?: boolean
          created_at?: string
          id?: string
          module_key: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          can_manage?: boolean
          can_view?: boolean
          created_at?: string
          id?: string
          module_key?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: []
      }
      school_classes: {
        Row: {
          academic_year: number
          capacity: number | null
          class_teacher: string | null
          company_id: string | null
          created_at: string
          grade_level: string | null
          id: string
          name: string
          status: string
          stream: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          academic_year?: number
          capacity?: number | null
          class_teacher?: string | null
          company_id?: string | null
          created_at?: string
          grade_level?: string | null
          id?: string
          name: string
          status?: string
          stream?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          academic_year?: number
          capacity?: number | null
          class_teacher?: string | null
          company_id?: string | null
          created_at?: string
          grade_level?: string | null
          id?: string
          name?: string
          status?: string
          stream?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      school_grants: {
        Row: {
          allocation_percentage: number | null
          allocation_source: string | null
          approved_amount: number
          attachment_url: string | null
          bank_account_id: string | null
          charge_code: string | null
          company_id: string | null
          created_at: string
          currency: string | null
          date_received: string | null
          donor_id: string | null
          fiscal_year: number | null
          funding_institution: string | null
          grant_name: string
          grant_ref: string | null
          id: string
          journal_entry_id: string | null
          notes: string | null
          programme_code: string | null
          programme_name: string | null
          purpose: string | null
          quarter: string | null
          received_amount: number
          source: string
          status: string
          sub_programme_code: string | null
          sub_programme_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          allocation_percentage?: number | null
          allocation_source?: string | null
          approved_amount?: number
          attachment_url?: string | null
          bank_account_id?: string | null
          charge_code?: string | null
          company_id?: string | null
          created_at?: string
          currency?: string | null
          date_received?: string | null
          donor_id?: string | null
          fiscal_year?: number | null
          funding_institution?: string | null
          grant_name: string
          grant_ref?: string | null
          id?: string
          journal_entry_id?: string | null
          notes?: string | null
          programme_code?: string | null
          programme_name?: string | null
          purpose?: string | null
          quarter?: string | null
          received_amount?: number
          source?: string
          status?: string
          sub_programme_code?: string | null
          sub_programme_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          allocation_percentage?: number | null
          allocation_source?: string | null
          approved_amount?: number
          attachment_url?: string | null
          bank_account_id?: string | null
          charge_code?: string | null
          company_id?: string | null
          created_at?: string
          currency?: string | null
          date_received?: string | null
          donor_id?: string | null
          fiscal_year?: number | null
          funding_institution?: string | null
          grant_name?: string
          grant_ref?: string | null
          id?: string
          journal_entry_id?: string | null
          notes?: string | null
          programme_code?: string | null
          programme_name?: string | null
          purpose?: string | null
          quarter?: string | null
          received_amount?: number
          source?: string
          status?: string
          sub_programme_code?: string | null
          sub_programme_name?: string | null
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
      staff_members: {
        Row: {
          branch_id: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          is_active: boolean
          role_id: string | null
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean
          role_id?: string | null
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean
          role_id?: string | null
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_members_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_members_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "rbac_roles"
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
          location_id: string | null
          notes: string | null
          quantity_after: number
          quantity_before: number | null
          reason: string | null
          reason_code: string | null
          source_count_id: string | null
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
          location_id?: string | null
          notes?: string | null
          quantity_after: number
          quantity_before?: number | null
          reason?: string | null
          reason_code?: string | null
          source_count_id?: string | null
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
          location_id?: string | null
          notes?: string | null
          quantity_after?: number
          quantity_before?: number | null
          reason?: string | null
          reason_code?: string | null
          source_count_id?: string | null
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
            foreignKeyName: "stock_adjustments_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "inventory_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_adjustments_source_count_id_fkey"
            columns: ["source_count_id"]
            isOneToOne: false
            referencedRelation: "stock_counts"
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
      stock_balances: {
        Row: {
          created_at: string
          id: string
          item_id: string
          location_id: string
          quantity: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          location_id: string
          quantity?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          location_id?: string
          quantity?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_balances_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "stock_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_balances_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "inventory_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_batches: {
        Row: {
          batch_no: string
          created_at: string
          expiry_date: string | null
          id: string
          item_id: string
          manufactured_date: string | null
          note: string | null
          quantity: number
          status: string
          unit_cost: number
          updated_at: string
          user_id: string
          warehouse_id: string | null
        }
        Insert: {
          batch_no: string
          created_at?: string
          expiry_date?: string | null
          id?: string
          item_id: string
          manufactured_date?: string | null
          note?: string | null
          quantity?: number
          status?: string
          unit_cost?: number
          updated_at?: string
          user_id?: string
          warehouse_id?: string | null
        }
        Update: {
          batch_no?: string
          created_at?: string
          expiry_date?: string | null
          id?: string
          item_id?: string
          manufactured_date?: string | null
          note?: string | null
          quantity?: number
          status?: string
          unit_cost?: number
          updated_at?: string
          user_id?: string
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_batches_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "stock_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_batches_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_count_lines: {
        Row: {
          count_id: string
          counted_qty: number | null
          created_at: string
          expected_qty: number
          id: string
          item_id: string
          location_id: string | null
          note: string | null
          reason_code: string | null
          user_id: string
          variance: number | null
        }
        Insert: {
          count_id: string
          counted_qty?: number | null
          created_at?: string
          expected_qty?: number
          id?: string
          item_id: string
          location_id?: string | null
          note?: string | null
          reason_code?: string | null
          user_id?: string
          variance?: number | null
        }
        Update: {
          count_id?: string
          counted_qty?: number | null
          created_at?: string
          expected_qty?: number
          id?: string
          item_id?: string
          location_id?: string | null
          note?: string | null
          reason_code?: string | null
          user_id?: string
          variance?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_count_lines_count_id_fkey"
            columns: ["count_id"]
            isOneToOne: false
            referencedRelation: "stock_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_count_lines_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "stock_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_count_lines_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "inventory_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_counts: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          count_date: string
          count_number: string | null
          counted_by: string | null
          created_at: string
          id: string
          location_id: string | null
          notes: string | null
          posted_at: string | null
          status: string
          updated_at: string
          user_id: string
          warehouse_id: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          count_date?: string
          count_number?: string | null
          counted_by?: string | null
          created_at?: string
          id?: string
          location_id?: string | null
          notes?: string | null
          posted_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          warehouse_id?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          count_date?: string
          count_number?: string | null
          counted_by?: string | null
          created_at?: string
          id?: string
          location_id?: string | null
          notes?: string | null
          posted_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_counts_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "inventory_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_counts_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_items: {
        Row: {
          barcode: string | null
          bin: string | null
          branch_id: string | null
          brand: string | null
          category: string | null
          cogs_account_id: string | null
          conversion_factor: number
          cost_price: number
          created_at: string
          description: string | null
          hs_code: string | null
          id: string
          image_url: string | null
          inventory_account_id: string | null
          is_active: boolean
          item_type: string
          max_stock: number
          min_stock: number
          name: string
          needs_cost_review: boolean
          needs_unit_verification: boolean
          notes: string | null
          on_order_qty: number
          preferred_supplier_id: string | null
          purchase_account_id: string | null
          purchase_unit: string | null
          quantity_on_hand: number
          reorder_level: number
          reserved_qty: number
          retail_price: number
          safety_stock: number
          sales_account_id: string | null
          sales_unit: string | null
          sell_price: number
          sku: string | null
          source_unit: string | null
          tax_category: string
          track_batches: boolean
          track_expiry: boolean
          track_serials: boolean
          unit: string
          updated_at: string
          user_id: string
          vat_rate: number
          warehouse_id: string | null
          wholesale_price: number
        }
        Insert: {
          barcode?: string | null
          bin?: string | null
          branch_id?: string | null
          brand?: string | null
          category?: string | null
          cogs_account_id?: string | null
          conversion_factor?: number
          cost_price?: number
          created_at?: string
          description?: string | null
          hs_code?: string | null
          id?: string
          image_url?: string | null
          inventory_account_id?: string | null
          is_active?: boolean
          item_type?: string
          max_stock?: number
          min_stock?: number
          name: string
          needs_cost_review?: boolean
          needs_unit_verification?: boolean
          notes?: string | null
          on_order_qty?: number
          preferred_supplier_id?: string | null
          purchase_account_id?: string | null
          purchase_unit?: string | null
          quantity_on_hand?: number
          reorder_level?: number
          reserved_qty?: number
          retail_price?: number
          safety_stock?: number
          sales_account_id?: string | null
          sales_unit?: string | null
          sell_price?: number
          sku?: string | null
          source_unit?: string | null
          tax_category?: string
          track_batches?: boolean
          track_expiry?: boolean
          track_serials?: boolean
          unit?: string
          updated_at?: string
          user_id: string
          vat_rate?: number
          warehouse_id?: string | null
          wholesale_price?: number
        }
        Update: {
          barcode?: string | null
          bin?: string | null
          branch_id?: string | null
          brand?: string | null
          category?: string | null
          cogs_account_id?: string | null
          conversion_factor?: number
          cost_price?: number
          created_at?: string
          description?: string | null
          hs_code?: string | null
          id?: string
          image_url?: string | null
          inventory_account_id?: string | null
          is_active?: boolean
          item_type?: string
          max_stock?: number
          min_stock?: number
          name?: string
          needs_cost_review?: boolean
          needs_unit_verification?: boolean
          notes?: string | null
          on_order_qty?: number
          preferred_supplier_id?: string | null
          purchase_account_id?: string | null
          purchase_unit?: string | null
          quantity_on_hand?: number
          reorder_level?: number
          reserved_qty?: number
          retail_price?: number
          safety_stock?: number
          sales_account_id?: string | null
          sales_unit?: string | null
          sell_price?: number
          sku?: string | null
          source_unit?: string | null
          tax_category?: string
          track_batches?: boolean
          track_expiry?: boolean
          track_serials?: boolean
          unit?: string
          updated_at?: string
          user_id?: string
          vat_rate?: number
          warehouse_id?: string | null
          wholesale_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "stock_items_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          item_id: string
          location_id: string | null
          movement_type: string
          note: string | null
          quantity: number
          reference: string | null
          reversal_of: string | null
          source_id: string | null
          source_type: string | null
          total_cost: number | null
          transaction_date: string
          transfer_id: string | null
          unit_cost: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          item_id: string
          location_id?: string | null
          movement_type: string
          note?: string | null
          quantity: number
          reference?: string | null
          reversal_of?: string | null
          source_id?: string | null
          source_type?: string | null
          total_cost?: number | null
          transaction_date?: string
          transfer_id?: string | null
          unit_cost?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          item_id?: string
          location_id?: string | null
          movement_type?: string
          note?: string | null
          quantity?: number
          reference?: string | null
          reversal_of?: string | null
          source_id?: string | null
          source_type?: string | null
          total_cost?: number | null
          transaction_date?: string
          transfer_id?: string | null
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
          {
            foreignKeyName: "stock_movements_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "inventory_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_transfer_id_fkey"
            columns: ["transfer_id"]
            isOneToOne: false
            referencedRelation: "inventory_transfers"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_serials: {
        Row: {
          batch_id: string | null
          created_at: string
          id: string
          item_id: string
          note: string | null
          received_date: string | null
          reference: string | null
          serial_no: string
          sold_date: string | null
          status: string
          updated_at: string
          user_id: string
          warehouse_id: string | null
        }
        Insert: {
          batch_id?: string | null
          created_at?: string
          id?: string
          item_id: string
          note?: string | null
          received_date?: string | null
          reference?: string | null
          serial_no: string
          sold_date?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          warehouse_id?: string | null
        }
        Update: {
          batch_id?: string | null
          created_at?: string
          id?: string
          item_id?: string
          note?: string | null
          received_date?: string | null
          reference?: string | null
          serial_no?: string
          sold_date?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_serials_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "stock_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_serials_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "stock_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_serials_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      student_fees: {
        Row: {
          academic_year: number
          amount_due: number
          amount_paid: number
          balance: number
          created_at: string
          description: string | null
          due_date: string | null
          fee_structure_id: string | null
          id: string
          status: string
          student_id: string | null
          term: string
          updated_at: string
          user_id: string
        }
        Insert: {
          academic_year?: number
          amount_due?: number
          amount_paid?: number
          balance?: number
          created_at?: string
          description?: string | null
          due_date?: string | null
          fee_structure_id?: string | null
          id?: string
          status?: string
          student_id?: string | null
          term?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          academic_year?: number
          amount_due?: number
          amount_paid?: number
          balance?: number
          created_at?: string
          description?: string | null
          due_date?: string | null
          fee_structure_id?: string | null
          id?: string
          status?: string
          student_id?: string | null
          term?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_fees_fee_structure_id_fkey"
            columns: ["fee_structure_id"]
            isOneToOne: false
            referencedRelation: "fee_structures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_fees_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          address: string | null
          boarding: string | null
          class_id: string | null
          company_id: string | null
          created_at: string
          date_of_birth: string | null
          enrolment_date: string | null
          first_name: string
          gender: string | null
          guardian_email: string | null
          guardian_name: string | null
          guardian_phone: string | null
          guardian_relationship: string | null
          id: string
          last_name: string
          notes: string | null
          sponsorship: string | null
          status: string
          student_no: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          boarding?: string | null
          class_id?: string | null
          company_id?: string | null
          created_at?: string
          date_of_birth?: string | null
          enrolment_date?: string | null
          first_name: string
          gender?: string | null
          guardian_email?: string | null
          guardian_name?: string | null
          guardian_phone?: string | null
          guardian_relationship?: string | null
          id?: string
          last_name: string
          notes?: string | null
          sponsorship?: string | null
          status?: string
          student_no: string
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          boarding?: string | null
          class_id?: string | null
          company_id?: string | null
          created_at?: string
          date_of_birth?: string | null
          enrolment_date?: string | null
          first_name?: string
          gender?: string | null
          guardian_email?: string | null
          guardian_name?: string | null
          guardian_phone?: string | null
          guardian_relationship?: string | null
          id?: string
          last_name?: string
          notes?: string | null
          sponsorship?: string | null
          status?: string
          student_no?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "school_classes"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          api_access: boolean
          billing_cycle: string
          code: string
          created_at: string
          currency: string
          description: string | null
          features: Json
          id: string
          is_active: boolean
          max_branches: number | null
          max_companies: number | null
          max_customers: number | null
          max_employees: number | null
          max_invoices: number | null
          max_storage_gb: number | null
          max_suppliers: number | null
          max_users: number | null
          max_warehouses: number | null
          mobile_access: boolean
          module_keys: Json
          name: string
          offline_access: boolean
          price_monthly: number
          price_yearly: number
          sort_order: number
          trial_days: number
          updated_at: string
        }
        Insert: {
          api_access?: boolean
          billing_cycle?: string
          code: string
          created_at?: string
          currency?: string
          description?: string | null
          features?: Json
          id?: string
          is_active?: boolean
          max_branches?: number | null
          max_companies?: number | null
          max_customers?: number | null
          max_employees?: number | null
          max_invoices?: number | null
          max_storage_gb?: number | null
          max_suppliers?: number | null
          max_users?: number | null
          max_warehouses?: number | null
          mobile_access?: boolean
          module_keys?: Json
          name: string
          offline_access?: boolean
          price_monthly?: number
          price_yearly?: number
          sort_order?: number
          trial_days?: number
          updated_at?: string
        }
        Update: {
          api_access?: boolean
          billing_cycle?: string
          code?: string
          created_at?: string
          currency?: string
          description?: string | null
          features?: Json
          id?: string
          is_active?: boolean
          max_branches?: number | null
          max_companies?: number | null
          max_customers?: number | null
          max_employees?: number | null
          max_invoices?: number | null
          max_storage_gb?: number | null
          max_suppliers?: number | null
          max_users?: number | null
          max_warehouses?: number | null
          mobile_access?: boolean
          module_keys?: Json
          name?: string
          offline_access?: boolean
          price_monthly?: number
          price_yearly?: number
          sort_order?: number
          trial_days?: number
          updated_at?: string
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
      approve_pos_pin_reset: {
        Args: { _new_pin: string; _reset_id: string }
        Returns: Json
      }
      approve_stock_count: { Args: { _count_id: string }; Returns: Json }
      approver_role_for_request: { Args: { _req: string }; Returns: string }
      auto_match_bank_transactions: { Args: never; Returns: Json }
      branch_ok: { Args: { _row_branch: string }; Returns: boolean }
      can_act_on_request: {
        Args: { _req: string; _user: string }
        Returns: boolean
      }
      clear_bank_transaction: {
        Args: { _reference?: string; _txn_id: string }
        Returns: Json
      }
      close_month: { Args: { _month: number; _year: number }; Returns: Json }
      close_year: { Args: { _year: number }; Returns: Json }
      complete_pos_sale: { Args: { _sale_id: string }; Returns: string }
      compute_reconciliation: { Args: { _session_id: string }; Returns: Json }
      confirm_pos_pin_reset: { Args: { _pin: string }; Returns: Json }
      current_tenant: { Args: never; Returns: string }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      deny_pos_pin_reset: {
        Args: { _reason?: string; _reset_id: string }
        Returns: Json
      }
      dispatch_stock_transfer: {
        Args: { _allow_negative?: boolean; _transfer_id: string }
        Returns: Json
      }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      ensure_account: {
        Args: { _code: string; _name: string; _type: string; _uid: string }
        Returns: string
      }
      ensure_transit_location: { Args: { _uid: string }; Returns: string }
      fx_rate: {
        Args: { _as_of?: string; _from: string; _to: string; _uid: string }
        Returns: number
      }
      has_override: {
        Args: { _action: string; _entity: string }
        Returns: boolean
      }
      has_perm: { Args: { _perm: string; _tenant?: string }; Returns: boolean }
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
      is_staff_of: { Args: { _tenant: string }; Returns: boolean }
      lock_reconciliation: { Args: { _session_id: string }; Returns: Json }
      log_cashier_activity: {
        Args: {
          _action: string
          _details?: Json
          _entity?: string
          _tenant: string
        }
        Returns: undefined
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
      my_access: { Args: never; Returns: Json }
      next_doc_number: {
        Args: { _prefix: string; _uid: string }
        Returns: string
      }
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
      pos_can: {
        Args: { _feature: string; _tenant?: string; _worker: string }
        Returns: boolean
      }
      pos_default_location: {
        Args: { _uid: string; _worker: string }
        Returns: string
      }
      pos_has_books: { Args: { _tenant: string }; Returns: boolean }
      pos_matrix: { Args: { _feature: string; _role: string }; Returns: string }
      pos_tenant_for: { Args: { _worker: string }; Returns: string }
      post_allowance: { Args: { _id: string }; Returns: string }
      post_asset_disposal: { Args: { _disposal_id: string }; Returns: string }
      post_bill: { Args: { _bill_id: string }; Returns: string }
      post_bill_payment: { Args: { _payment_id: string }; Returns: string }
      post_depreciation: {
        Args: { _month: number; _year: number }
        Returns: Json
      }
      post_expense: { Args: { _expense_id: string }; Returns: string }
      post_imprest: { Args: { _id: string }; Returns: string }
      post_receipt: { Args: { _receipt_id: string }; Returns: string }
      post_restaurant_order: { Args: { _order_id: string }; Returns: string }
      post_school_grant: { Args: { _id: string }; Returns: string }
      post_stock_count: { Args: { _count_id: string }; Returns: Json }
      post_tuckshop: { Args: { _id: string }; Returns: string }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      rebuild_bank_status: { Args: never; Returns: Json }
      rebuild_ledgers: { Args: never; Returns: Json }
      rebuild_ledgers_for: { Args: { _uid: string }; Returns: Json }
      recalc_bank_txn_allocation: {
        Args: { _txn_id: string }
        Returns: undefined
      }
      recalc_invoice_balance: {
        Args: { _invoice_id: string }
        Returns: undefined
      }
      receive_stock_transfer: { Args: { _transfer_id: string }; Returns: Json }
      reopen_period: {
        Args: { _month: number; _period_type?: string; _year: number }
        Returns: Json
      }
      request_pos_pin_reset: { Args: { _reason?: string }; Returns: string }
      reverse_bank_allocation: {
        Args: { _alloc_id: string; _reason?: string }
        Returns: Json
      }
      review_cashier_shift: {
        Args: { _comment?: string; _decision: string; _shift_id: string }
        Returns: Json
      }
      run_notification_scans: { Args: never; Returns: Json }
      safe_reverse_journal_entry: {
        Args: { _entry_id: string; _reason: string; _reversal_date?: string }
        Returns: Json
      }
      set_cashier_pin: {
        Args: { _permission_id: string; _pin: string }
        Returns: Json
      }
      set_cashier_pin_state: {
        Args: { _disabled: boolean; _permission_id: string; _unlock?: boolean }
        Returns: Json
      }
      staff_branch: { Args: never; Returns: string }
      stock_reconciliation: {
        Args: { _from: string; _location: string; _to: string; _uid: string }
        Returns: {
          adjustments: number
          expected_closing: number
          item_id: string
          item_name: string
          opening: number
          other_in: number
          produced: number
          returns: number
          sales: number
          sku: string
          transfers_in: number
          transfers_out: number
          unit: string
        }[]
      }
      submit_cashier_shift: {
        Args: { _actual_cash: number; _breakdown?: Json; _shift_id: string }
        Returns: Json
      }
      sync_pos_sale: {
        Args: { _items?: Json; _payments?: Json; _sale: Json }
        Returns: string
      }
      transfer_can_manage: { Args: { _uid: string }; Returns: boolean }
      user_can_manage_module: {
        Args: { _module_key: string; _user_id: string }
        Returns: boolean
      }
      user_can_view_module: {
        Args: { _module_key: string; _user_id: string }
        Returns: boolean
      }
      verify_cashier_pin: {
        Args: { _permission_id: string; _pin: string }
        Returns: Json
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
