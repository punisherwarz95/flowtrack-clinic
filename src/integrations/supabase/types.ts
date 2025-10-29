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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      atencion_examenes: {
        Row: {
          atencion_id: string
          created_at: string | null
          estado: Database["public"]["Enums"]["estado_examen"] | null
          examen_id: string
          fecha_realizacion: string | null
          id: string
          observaciones: string | null
        }
        Insert: {
          atencion_id: string
          created_at?: string | null
          estado?: Database["public"]["Enums"]["estado_examen"] | null
          examen_id: string
          fecha_realizacion?: string | null
          id?: string
          observaciones?: string | null
        }
        Update: {
          atencion_id?: string
          created_at?: string | null
          estado?: Database["public"]["Enums"]["estado_examen"] | null
          examen_id?: string
          fecha_realizacion?: string | null
          id?: string
          observaciones?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "atencion_examenes_atencion_id_fkey"
            columns: ["atencion_id"]
            isOneToOne: false
            referencedRelation: "atenciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atencion_examenes_examen_id_fkey"
            columns: ["examen_id"]
            isOneToOne: false
            referencedRelation: "examenes"
            referencedColumns: ["id"]
          },
        ]
      }
      atenciones: {
        Row: {
          box_id: string | null
          created_at: string | null
          estado: Database["public"]["Enums"]["estado_atencion"] | null
          fecha_fin_atencion: string | null
          fecha_ingreso: string | null
          fecha_inicio_atencion: string | null
          id: string
          observaciones: string | null
          paciente_id: string
        }
        Insert: {
          box_id?: string | null
          created_at?: string | null
          estado?: Database["public"]["Enums"]["estado_atencion"] | null
          fecha_fin_atencion?: string | null
          fecha_ingreso?: string | null
          fecha_inicio_atencion?: string | null
          id?: string
          observaciones?: string | null
          paciente_id: string
        }
        Update: {
          box_id?: string | null
          created_at?: string | null
          estado?: Database["public"]["Enums"]["estado_atencion"] | null
          fecha_fin_atencion?: string | null
          fecha_ingreso?: string | null
          fecha_inicio_atencion?: string | null
          id?: string
          observaciones?: string | null
          paciente_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "atenciones_box_id_fkey"
            columns: ["box_id"]
            isOneToOne: false
            referencedRelation: "boxes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atenciones_paciente_id_fkey"
            columns: ["paciente_id"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
        ]
      }
      box_examenes: {
        Row: {
          box_id: string
          examen_id: string
          id: string
        }
        Insert: {
          box_id: string
          examen_id: string
          id?: string
        }
        Update: {
          box_id?: string
          examen_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "box_examenes_box_id_fkey"
            columns: ["box_id"]
            isOneToOne: false
            referencedRelation: "boxes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "box_examenes_examen_id_fkey"
            columns: ["examen_id"]
            isOneToOne: false
            referencedRelation: "examenes"
            referencedColumns: ["id"]
          },
        ]
      }
      boxes: {
        Row: {
          activo: boolean | null
          created_at: string | null
          descripcion: string | null
          id: string
          nombre: string
        }
        Insert: {
          activo?: boolean | null
          created_at?: string | null
          descripcion?: string | null
          id?: string
          nombre: string
        }
        Update: {
          activo?: boolean | null
          created_at?: string | null
          descripcion?: string | null
          id?: string
          nombre?: string
        }
        Relationships: []
      }
      empresas: {
        Row: {
          created_at: string | null
          id: string
          nombre: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          nombre: string
        }
        Update: {
          created_at?: string | null
          id?: string
          nombre?: string
        }
        Relationships: []
      }
      examenes: {
        Row: {
          created_at: string | null
          descripcion: string | null
          duracion_estimada: number | null
          id: string
          nombre: string
        }
        Insert: {
          created_at?: string | null
          descripcion?: string | null
          duracion_estimada?: number | null
          id?: string
          nombre: string
        }
        Update: {
          created_at?: string | null
          descripcion?: string | null
          duracion_estimada?: number | null
          id?: string
          nombre?: string
        }
        Relationships: []
      }
      pacientes: {
        Row: {
          created_at: string | null
          email: string | null
          empresa_id: string | null
          fecha_nacimiento: string | null
          id: string
          nombre: string
          rut: string
          telefono: string | null
          tiene_ficha: boolean | null
          tipo_servicio: Database["public"]["Enums"]["tipo_servicio"] | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          empresa_id?: string | null
          fecha_nacimiento?: string | null
          id?: string
          nombre: string
          rut: string
          telefono?: string | null
          tiene_ficha?: boolean | null
          tipo_servicio?: Database["public"]["Enums"]["tipo_servicio"] | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          empresa_id?: string | null
          fecha_nacimiento?: string | null
          id?: string
          nombre?: string
          rut?: string
          telefono?: string | null
          tiene_ficha?: boolean | null
          tipo_servicio?: Database["public"]["Enums"]["tipo_servicio"] | null
        }
        Relationships: [
          {
            foreignKeyName: "pacientes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
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
      estado_atencion: "en_espera" | "en_atencion" | "completado" | "incompleto"
      estado_examen: "pendiente" | "completado" | "incompleto"
      tipo_servicio: "workmed" | "jenner"
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
      estado_atencion: ["en_espera", "en_atencion", "completado", "incompleto"],
      estado_examen: ["pendiente", "completado", "incompleto"],
      tipo_servicio: ["workmed", "jenner"],
    },
  },
} as const
