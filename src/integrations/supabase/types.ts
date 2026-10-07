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
      audit_logs: {
        Row: {
          action: string
          branch: string
          created_at: string
          details: Json | null
          entity: string
          entity_id: string | null
          id: string
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          action: string
          branch?: string
          created_at?: string
          details?: Json | null
          entity: string
          entity_id?: string | null
          id?: string
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          action?: string
          branch?: string
          created_at?: string
          details?: Json | null
          entity?: string
          entity_id?: string | null
          id?: string
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          branch: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          branch?: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          branch?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          address: string | null
          branch: string
          created_at: string
          credit_limit: number
          customer_number: string | null
          email: string | null
          id: string
          name: string
          outstanding_balance: number
          phone: string | null
          referral_credits: number
          referred_by: string | null
          tin_number: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          branch?: string
          created_at?: string
          credit_limit?: number
          customer_number?: string | null
          email?: string | null
          id?: string
          name: string
          outstanding_balance?: number
          phone?: string | null
          referral_credits?: number
          referred_by?: string | null
          tin_number?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          branch?: string
          created_at?: string
          credit_limit?: number
          customer_number?: string | null
          email?: string | null
          id?: string
          name?: string
          outstanding_balance?: number
          phone?: string | null
          referral_credits?: number
          referred_by?: string | null
          tin_number?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          branch: string
          category: string
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          paid_on: string
          payment_method: string
          receipt_number: string
          title: string
          updated_at: string
          vendor: string | null
        }
        Insert: {
          amount?: number
          branch?: string
          category?: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          paid_on?: string
          payment_method?: string
          receipt_number: string
          title: string
          updated_at?: string
          vendor?: string | null
        }
        Update: {
          amount?: number
          branch?: string
          category?: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          paid_on?: string
          payment_method?: string
          receipt_number?: string
          title?: string
          updated_at?: string
          vendor?: string | null
        }
        Relationships: []
      }
      injection_repayments: {
        Row: {
          amount: number
          branch: string
          created_at: string
          created_by: string | null
          id: string
          injection_id: string
          notes: string | null
          paid_on: string
          payment_method: string
          receipt_number: string
        }
        Insert: {
          amount?: number
          branch?: string
          created_at?: string
          created_by?: string | null
          id?: string
          injection_id: string
          notes?: string | null
          paid_on?: string
          payment_method?: string
          receipt_number: string
        }
        Update: {
          amount?: number
          branch?: string
          created_at?: string
          created_by?: string | null
          id?: string
          injection_id?: string
          notes?: string | null
          paid_on?: string
          payment_method?: string
          receipt_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "injection_repayments_injection_id_fkey"
            columns: ["injection_id"]
            isOneToOne: false
            referencedRelation: "injections"
            referencedColumns: ["id"]
          },
        ]
      }
      injections: {
        Row: {
          amount: number
          branch: string
          created_at: string
          created_by: string | null
          currency: string
          due_date: string | null
          id: string
          notes: string | null
          received_on: string
          reference: string
          source: string
          updated_at: string
        }
        Insert: {
          amount?: number
          branch?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          received_on?: string
          reference: string
          source: string
          updated_at?: string
        }
        Update: {
          amount?: number
          branch?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          received_on?: string
          reference?: string
          source?: string
          updated_at?: string
        }
        Relationships: []
      }
      money_rounds: {
        Row: {
          branch: string
          created_at: string
          currency: string
          cycle_days: number
          id: string
          monthly_amount: number
          name: string
          notes: string | null
          start_date: string | null
          start_month: string
          updated_at: string
          user_id: string
        }
        Insert: {
          branch?: string
          created_at?: string
          currency?: string
          cycle_days?: number
          id?: string
          monthly_amount?: number
          name: string
          notes?: string | null
          start_date?: string | null
          start_month: string
          updated_at?: string
          user_id: string
        }
        Update: {
          branch?: string
          created_at?: string
          currency?: string
          cycle_days?: number
          id?: string
          monthly_amount?: number
          name?: string
          notes?: string | null
          start_date?: string | null
          start_month?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          barcode: string | null
          branch: string
          category: string
          cost_price: number
          created_at: string
          created_by: string | null
          current_stock: number
          id: string
          low_stock_threshold: number
          name: string
          product_type: string
          selling_price: number
          sku: string
          stock_tracking_enabled: boolean
          unit_of_measure: string
          updated_at: string
          vat_applicable: boolean
        }
        Insert: {
          barcode?: string | null
          branch?: string
          category?: string
          cost_price?: number
          created_at?: string
          created_by?: string | null
          current_stock?: number
          id?: string
          low_stock_threshold?: number
          name: string
          product_type?: string
          selling_price?: number
          sku: string
          stock_tracking_enabled?: boolean
          unit_of_measure?: string
          updated_at?: string
          vat_applicable?: boolean
        }
        Update: {
          barcode?: string | null
          branch?: string
          category?: string
          cost_price?: number
          created_at?: string
          created_by?: string | null
          current_stock?: number
          id?: string
          low_stock_threshold?: number
          name?: string
          product_type?: string
          selling_price?: number
          sku?: string
          stock_tracking_enabled?: boolean
          unit_of_measure?: string
          updated_at?: string
          vat_applicable?: boolean
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          is_active: boolean | null
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      quotations: {
        Row: {
          amount_paid: number
          balance_due: number
          branch: string
          created_at: string
          created_by: string | null
          customer_address: string | null
          customer_name: string | null
          customer_number: string | null
          customer_phone: string | null
          discount: number
          doc_number: string
          doc_type: string
          due_date: string | null
          id: string
          lines: Json
          notes: string | null
          payment_method: string | null
          subtotal: number
          total: number
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          amount_paid?: number
          balance_due?: number
          branch?: string
          created_at?: string
          created_by?: string | null
          customer_address?: string | null
          customer_name?: string | null
          customer_number?: string | null
          customer_phone?: string | null
          discount?: number
          doc_number: string
          doc_type?: string
          due_date?: string | null
          id?: string
          lines?: Json
          notes?: string | null
          payment_method?: string | null
          subtotal?: number
          total?: number
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          amount_paid?: number
          balance_due?: number
          branch?: string
          created_at?: string
          created_by?: string | null
          customer_address?: string | null
          customer_name?: string | null
          customer_number?: string | null
          customer_phone?: string | null
          discount?: number
          doc_number?: string
          doc_type?: string
          due_date?: string | null
          id?: string
          lines?: Json
          notes?: string | null
          payment_method?: string | null
          subtotal?: number
          total?: number
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: []
      }
      round_entries: {
        Row: {
          amount: number
          branch: string
          created_at: string
          direction: string
          id: string
          member_id: string | null
          member_name: string
          month: string
          month_index: number
          note: string | null
          receipt_number: string
          round_id: string
        }
        Insert: {
          amount?: number
          branch?: string
          created_at?: string
          direction: string
          id?: string
          member_id?: string | null
          member_name: string
          month: string
          month_index: number
          note?: string | null
          receipt_number: string
          round_id: string
        }
        Update: {
          amount?: number
          branch?: string
          created_at?: string
          direction?: string
          id?: string
          member_id?: string | null
          member_name?: string
          month?: string
          month_index?: number
          note?: string | null
          receipt_number?: string
          round_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "round_entries_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "round_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "round_entries_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "money_rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      round_members: {
        Row: {
          branch: string
          created_at: string
          id: string
          is_me: boolean
          name: string
          phone: string | null
          position: number
          round_id: string
        }
        Insert: {
          branch?: string
          created_at?: string
          id?: string
          is_me?: boolean
          name: string
          phone?: string | null
          position: number
          round_id: string
        }
        Update: {
          branch?: string
          created_at?: string
          id?: string
          is_me?: boolean
          name?: string
          phone?: string | null
          position?: number
          round_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "round_members_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "money_rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_items: {
        Row: {
          branch: string
          created_at: string
          id: string
          line_total: number
          product_id: string | null
          product_name: string
          quantity: number
          sale_id: string
          sku: string | null
          unit_price: number
          vat_applicable: boolean
        }
        Insert: {
          branch?: string
          created_at?: string
          id?: string
          line_total: number
          product_id?: string | null
          product_name: string
          quantity: number
          sale_id: string
          sku?: string | null
          unit_price: number
          vat_applicable?: boolean
        }
        Update: {
          branch?: string
          created_at?: string
          id?: string
          line_total?: number
          product_id?: string | null
          product_name?: string
          quantity?: number
          sale_id?: string
          sku?: string | null
          unit_price?: number
          vat_applicable?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          amount_paid: number
          balance_due: number
          branch: string
          cashier_id: string | null
          cashier_name: string | null
          client_id: string | null
          client_name: string | null
          client_phone: string | null
          created_at: string
          currency: string
          customer_number: string | null
          discount: number
          doc_type: string
          due_date: string | null
          id: string
          notes: string | null
          payment_method: string
          receipt_number: string
          referral_code: string | null
          status: string
          subtotal: number
          total: number
          vat_amount: number
        }
        Insert: {
          amount_paid?: number
          balance_due?: number
          branch?: string
          cashier_id?: string | null
          cashier_name?: string | null
          client_id?: string | null
          client_name?: string | null
          client_phone?: string | null
          created_at?: string
          currency?: string
          customer_number?: string | null
          discount?: number
          doc_type?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          payment_method?: string
          receipt_number: string
          referral_code?: string | null
          status?: string
          subtotal?: number
          total?: number
          vat_amount?: number
        }
        Update: {
          amount_paid?: number
          balance_due?: number
          branch?: string
          cashier_id?: string | null
          cashier_name?: string | null
          client_id?: string | null
          client_name?: string | null
          client_phone?: string | null
          created_at?: string
          currency?: string
          customer_number?: string | null
          discount?: number
          doc_type?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          payment_method?: string
          receipt_number?: string
          referral_code?: string | null
          status?: string
          subtotal?: number
          total?: number
          vat_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          address: string | null
          branch: string
          currency: string
          id: string
          phone: string
          store_name: string
          tagline: string
          updated_at: string
          vat_rate: number
        }
        Insert: {
          address?: string | null
          branch?: string
          currency?: string
          id?: string
          phone?: string
          store_name?: string
          tagline?: string
          updated_at?: string
          vat_rate?: number
        }
        Update: {
          address?: string | null
          branch?: string
          currency?: string
          id?: string
          phone?: string
          store_name?: string
          tagline?: string
          updated_at?: string
          vat_rate?: number
        }
        Relationships: []
      }
      stock_movements: {
        Row: {
          branch: string
          change: number
          created_at: string
          id: string
          product_id: string
          reason: string
          reference: string | null
          user_id: string | null
        }
        Insert: {
          branch?: string
          change: number
          created_at?: string
          id?: string
          product_id: string
          reason: string
          reference?: string | null
          user_id?: string | null
        }
        Update: {
          branch?: string
          change?: number
          created_at?: string
          id?: string
          product_id?: string
          reason?: string
          reference?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          branch: string
          contact_person: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          branch?: string
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          branch?: string
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      transporters: {
        Row: {
          branch: string
          created_at: string
          driver_name: string | null
          id: string
          name: string
          phone: string | null
          status: string
          updated_at: string
          vehicle_number: string | null
        }
        Insert: {
          branch?: string
          created_at?: string
          driver_name?: string | null
          id?: string
          name: string
          phone?: string | null
          status?: string
          updated_at?: string
          vehicle_number?: string | null
        }
        Update: {
          branch?: string
          created_at?: string
          driver_name?: string | null
          id?: string
          name?: string
          phone?: string | null
          status?: string
          updated_at?: string
          vehicle_number?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      clear_branch_data: { Args: never; Returns: undefined }
      current_branch: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "admin"
        | "cashier"
        | "operations_manager"
        | "accountant"
        | "auditor"
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
        "super_admin",
        "admin",
        "cashier",
        "operations_manager",
        "accountant",
        "auditor",
      ],
    },
  },
} as const
