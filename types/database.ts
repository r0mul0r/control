export type UserRole = 'admin' | 'co_admin' | 'supervisor' | 'hr'

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  PostgrestVersion: "12"
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string
          role: UserRole
          shift_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name: string
          role?: UserRole
          shift_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          role?: UserRole
          shift_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      shifts: {
        Row: {
          id: string
          name: string
          start_time: string
          end_time: string
          description: string | null
          color: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          start_time: string
          end_time: string
          description?: string | null
          color?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          start_time?: string
          end_time?: string
          description?: string | null
          color?: string
          updated_at?: string
        }
        Relationships: []
      }
      employees: {
        Row: {
          id: string
          full_name: string
          document_id: string
          position: string
          shift_id: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          full_name: string
          document_id: string
          position: string
          shift_id: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          document_id?: string
          position?: string
          shift_id?: string
          is_active?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      novelties: {
        Row: {
          id: string
          shift_id: string
          supervisor_id: string
          received_from_supervisor_id: string | null
          received_at: string
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          shift_id: string
          supervisor_id: string
          received_from_supervisor_id?: string | null
          received_at: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          shift_id?: string
          supervisor_id?: string
          received_from_supervisor_id?: string | null
          received_at?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      novelty_operators: {
        Row: {
          id: string
          novelty_id: string
          employee_id: string
          is_present: boolean
          created_at: string
        }
        Insert: {
          id?: string
          novelty_id: string
          employee_id: string
          is_present?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          novelty_id?: string
          employee_id?: string
          is_present?: boolean
        }
        Relationships: []
      }
      shift_changes: {
        Row: {
          id: string
          novelty_id: string
          employee_id: string
          from_shift_id: string
          to_shift_id: string
          reason: string | null
          created_at: string
        }
        Insert: {
          id?: string
          novelty_id: string
          employee_id: string
          from_shift_id: string
          to_shift_id: string
          reason?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          novelty_id?: string
          employee_id?: string
          from_shift_id?: string
          to_shift_id?: string
          reason?: string | null
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      user_role: UserRole
    }
    CompositeTypes: Record<string, never>
  }
}

export type Profile = Database['public']['Tables']['profiles']['Row']
export type Shift = Database['public']['Tables']['shifts']['Row']
export type Employee = Database['public']['Tables']['employees']['Row']
export type Novelty = Database['public']['Tables']['novelties']['Row']
export type NoveltyOperator = Database['public']['Tables']['novelty_operators']['Row']
export type ShiftChange = Database['public']['Tables']['shift_changes']['Row']

export type EmployeeWithShift = Employee & { shift: Shift }
export type NoveltyWithDetails = Novelty & {
  shift: Shift
  supervisor: Profile
  received_from_supervisor: Profile | null
  novelty_operators: (NoveltyOperator & { employee: EmployeeWithShift })[]
  shift_changes: (ShiftChange & { employee: Employee; from_shift: Shift; to_shift: Shift })[]
}
