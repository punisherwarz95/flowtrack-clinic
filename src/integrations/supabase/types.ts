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
          estado_ficha: Database["public"]["Enums"]["estado_ficha"] | null
          fecha_fin_atencion: string | null
          fecha_ingreso: string | null
          fecha_inicio_atencion: string | null
          id: string
          numero_ingreso: number | null
          observaciones: string | null
          paciente_id: string
        }
        Insert: {
          box_id?: string | null
          created_at?: string | null
          estado?: Database["public"]["Enums"]["estado_atencion"] | null
          estado_ficha?: Database["public"]["Enums"]["estado_ficha"] | null
          fecha_fin_atencion?: string | null
          fecha_ingreso?: string | null
          fecha_inicio_atencion?: string | null
          id?: string
          numero_ingreso?: number | null
          observaciones?: string | null
          paciente_id: string
        }
        Update: {
          box_id?: string | null
          created_at?: string | null
          estado?: Database["public"]["Enums"]["estado_atencion"] | null
          estado_ficha?: Database["public"]["Enums"]["estado_ficha"] | null
          fecha_fin_atencion?: string | null
          fecha_ingreso?: string | null
          fecha_inicio_atencion?: string | null
          id?: string
          numero_ingreso?: number | null
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
      menu_permissions: {
        Row: {
          created_at: string | null
          id: string
          menu_path: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          menu_path: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          menu_path?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_permissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pacientes: {
        Row: {
          created_at: string | null
          email: string | null
          empresa_id: string | null
          fecha_nacimiento: string | null
          id: string
          nombre: string
          rut: string | null
          telefono: string | null
          tipo_servicio: Database["public"]["Enums"]["tipo_servicio"] | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          empresa_id?: string | null
          fecha_nacimiento?: string | null
          id?: string
          nombre: string
          rut?: string | null
          telefono?: string | null
          tipo_servicio?: Database["public"]["Enums"]["tipo_servicio"] | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          empresa_id?: string | null
          fecha_nacimiento?: string | null
          id?: string
          nombre?: string
          rut?: string | null
          telefono?: string | null
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
      paquete_examen_items: {
        Row: {
          created_at: string | null
          examen_id: string
          id: string
          paquete_id: string
        }
        Insert: {
          created_at?: string | null
          examen_id: string
          id?: string
          paquete_id: string
        }
        Update: {
          created_at?: string | null
          examen_id?: string
          id?: string
          paquete_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "paquete_examen_items_examen_id_fkey"
            columns: ["examen_id"]
            isOneToOne: false
            referencedRelation: "examenes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "paquete_examen_items_paquete_id_fkey"
            columns: ["paquete_id"]
            isOneToOne: false
            referencedRelation: "paquetes_examenes"
            referencedColumns: ["id"]
          },
        ]
      }
      paquetes_examenes: {
        Row: {
          created_at: string | null
          descripcion: string | null
          id: string
          nombre: string
        }
        Insert: {
          created_at?: string | null
          descripcion?: string | null
          id?: string
          nombre: string
        }
        Update: {
          created_at?: string | null
          descripcion?: string | null
          id?: string
          nombre?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          id: string
          username: string
        }
        Insert: {
          created_at?: string | null
          id: string
          username: string
        }
        Update: {
          created_at?: string | null
          id?: string
          username?: string
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
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      estado_atencion: "en_espera" | "en_atencion" | "completado" | "incompleto"
      estado_examen: "pendiente" | "completado" | "incompleto"
      estado_ficha: "pendiente" | "en_mano_paciente" | "completada"
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
      app_role: ["admin", "user"],
      estado_atencion: ["en_espera", "en_atencion", "completado", "incompleto"],
      estado_examen: ["pendiente", "completado", "incompleto"],
      estado_ficha: ["pendiente", "en_mano_paciente", "completada"],
      tipo_servicio: ["workmed", "jenner"],
    },
  },
} as const
