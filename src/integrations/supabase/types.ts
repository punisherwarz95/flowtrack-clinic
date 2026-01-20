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
      atencion_documentos: {
        Row: {
          atencion_id: string
          completado_at: string | null
          created_at: string
          documento_id: string
          estado: string
          id: string
          observaciones: string | null
          respuestas: Json
          revisado_at: string | null
          revisado_por: string | null
          updated_at: string
        }
        Insert: {
          atencion_id: string
          completado_at?: string | null
          created_at?: string
          documento_id: string
          estado?: string
          id?: string
          observaciones?: string | null
          respuestas?: Json
          revisado_at?: string | null
          revisado_por?: string | null
          updated_at?: string
        }
        Update: {
          atencion_id?: string
          completado_at?: string | null
          created_at?: string
          documento_id?: string
          estado?: string
          id?: string
          observaciones?: string | null
          respuestas?: Json
          revisado_at?: string | null
          revisado_por?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "atencion_documentos_atencion_id_fkey"
            columns: ["atencion_id"]
            isOneToOne: false
            referencedRelation: "atenciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atencion_documentos_documento_id_fkey"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "documentos_formularios"
            referencedColumns: ["id"]
          },
        ]
      }
      atencion_examenes: {
        Row: {
          atencion_id: string
          created_at: string | null
          estado: Database["public"]["Enums"]["estado_examen"] | null
          examen_id: string
          fecha_realizacion: string | null
          id: string
          observaciones: string | null
          realizado_por: string | null
        }
        Insert: {
          atencion_id: string
          created_at?: string | null
          estado?: Database["public"]["Enums"]["estado_examen"] | null
          examen_id: string
          fecha_realizacion?: string | null
          id?: string
          observaciones?: string | null
          realizado_por?: string | null
        }
        Update: {
          atencion_id?: string
          created_at?: string | null
          estado?: Database["public"]["Enums"]["estado_examen"] | null
          examen_id?: string
          fecha_realizacion?: string | null
          id?: string
          observaciones?: string | null
          realizado_por?: string | null
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
      bateria_documentos: {
        Row: {
          created_at: string
          documento_id: string
          id: string
          orden: number
          paquete_id: string
        }
        Insert: {
          created_at?: string
          documento_id: string
          id?: string
          orden?: number
          paquete_id: string
        }
        Update: {
          created_at?: string
          documento_id?: string
          id?: string
          orden?: number
          paquete_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bateria_documentos_documento_id_fkey"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "documentos_formularios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bateria_documentos_paquete_id_fkey"
            columns: ["paquete_id"]
            isOneToOne: false
            referencedRelation: "paquetes_examenes"
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
      chat_messages: {
        Row: {
          created_at: string
          id: string
          message: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cotizacion_items: {
        Row: {
          cantidad: number
          cotizacion_id: string
          created_at: string | null
          detalle_examenes: Json | null
          examen_id: string | null
          id: string
          item_numero: number
          iva_porcentaje: number | null
          margen_id: string | null
          margen_nombre: string | null
          margen_porcentaje: number | null
          nombre_prestacion: string
          paquete_id: string | null
          tipo_item: string
          valor_con_iva: number | null
          valor_final: number | null
          valor_iva: number | null
          valor_margen: number | null
          valor_total_neto: number
          valor_unitario_neto: number
        }
        Insert: {
          cantidad?: number
          cotizacion_id: string
          created_at?: string | null
          detalle_examenes?: Json | null
          examen_id?: string | null
          id?: string
          item_numero: number
          iva_porcentaje?: number | null
          margen_id?: string | null
          margen_nombre?: string | null
          margen_porcentaje?: number | null
          nombre_prestacion: string
          paquete_id?: string | null
          tipo_item: string
          valor_con_iva?: number | null
          valor_final?: number | null
          valor_iva?: number | null
          valor_margen?: number | null
          valor_total_neto?: number
          valor_unitario_neto?: number
        }
        Update: {
          cantidad?: number
          cotizacion_id?: string
          created_at?: string | null
          detalle_examenes?: Json | null
          examen_id?: string | null
          id?: string
          item_numero?: number
          iva_porcentaje?: number | null
          margen_id?: string | null
          margen_nombre?: string | null
          margen_porcentaje?: number | null
          nombre_prestacion?: string
          paquete_id?: string | null
          tipo_item?: string
          valor_con_iva?: number | null
          valor_final?: number | null
          valor_iva?: number | null
          valor_margen?: number | null
          valor_total_neto?: number
          valor_unitario_neto?: number
        }
        Relationships: [
          {
            foreignKeyName: "cotizacion_items_cotizacion_id_fkey"
            columns: ["cotizacion_id"]
            isOneToOne: false
            referencedRelation: "cotizaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotizacion_items_examen_id_fkey"
            columns: ["examen_id"]
            isOneToOne: false
            referencedRelation: "examenes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotizacion_items_margen_id_fkey"
            columns: ["margen_id"]
            isOneToOne: false
            referencedRelation: "margenes_cotizacion"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotizacion_items_paquete_id_fkey"
            columns: ["paquete_id"]
            isOneToOne: false
            referencedRelation: "paquetes_examenes"
            referencedColumns: ["id"]
          },
        ]
      }
      cotizaciones: {
        Row: {
          afecto_iva: boolean
          created_at: string | null
          created_by: string | null
          empresa_contacto: string | null
          empresa_email: string | null
          empresa_id: string | null
          empresa_nombre: string | null
          empresa_razon_social: string | null
          empresa_rut: string | null
          empresa_telefono: string | null
          estado: string | null
          fecha_cotizacion: string
          id: string
          numero_cotizacion: number
          observaciones: string | null
          subtotal_neto: number | null
          total_con_iva: number | null
          total_con_margen: number | null
          total_iva: number | null
        }
        Insert: {
          afecto_iva?: boolean
          created_at?: string | null
          created_by?: string | null
          empresa_contacto?: string | null
          empresa_email?: string | null
          empresa_id?: string | null
          empresa_nombre?: string | null
          empresa_razon_social?: string | null
          empresa_rut?: string | null
          empresa_telefono?: string | null
          estado?: string | null
          fecha_cotizacion?: string
          id?: string
          numero_cotizacion?: number
          observaciones?: string | null
          subtotal_neto?: number | null
          total_con_iva?: number | null
          total_con_margen?: number | null
          total_iva?: number | null
        }
        Update: {
          afecto_iva?: boolean
          created_at?: string | null
          created_by?: string | null
          empresa_contacto?: string | null
          empresa_email?: string | null
          empresa_id?: string | null
          empresa_nombre?: string | null
          empresa_razon_social?: string | null
          empresa_rut?: string | null
          empresa_telefono?: string | null
          estado?: string | null
          fecha_cotizacion?: string
          id?: string
          numero_cotizacion?: number
          observaciones?: string | null
          subtotal_neto?: number | null
          total_con_iva?: number | null
          total_con_margen?: number | null
          total_iva?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cotizaciones_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      documento_campos: {
        Row: {
          created_at: string
          documento_id: string
          etiqueta: string
          id: string
          opciones: Json | null
          orden: number
          requerido: boolean
          tipo_campo: string
        }
        Insert: {
          created_at?: string
          documento_id: string
          etiqueta: string
          id?: string
          opciones?: Json | null
          orden?: number
          requerido?: boolean
          tipo_campo?: string
        }
        Update: {
          created_at?: string
          documento_id?: string
          etiqueta?: string
          id?: string
          opciones?: Json | null
          orden?: number
          requerido?: boolean
          tipo_campo?: string
        }
        Relationships: [
          {
            foreignKeyName: "documento_campos_documento_id_fkey"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "documentos_formularios"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos_formularios: {
        Row: {
          activo: boolean
          created_at: string
          descripcion: string | null
          id: string
          nombre: string
          tipo: string
          updated_at: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          descripcion?: string | null
          id?: string
          nombre: string
          tipo?: string
          updated_at?: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          descripcion?: string | null
          id?: string
          nombre?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: []
      }
      empresa_baterias: {
        Row: {
          activo: boolean
          created_at: string
          empresa_id: string
          id: string
          paquete_id: string
          updated_at: string
          valor: number
        }
        Insert: {
          activo?: boolean
          created_at?: string
          empresa_id: string
          id?: string
          paquete_id: string
          updated_at?: string
          valor?: number
        }
        Update: {
          activo?: boolean
          created_at?: string
          empresa_id?: string
          id?: string
          paquete_id?: string
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "empresa_baterias_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empresa_baterias_paquete_id_fkey"
            columns: ["paquete_id"]
            isOneToOne: false
            referencedRelation: "paquetes_examenes"
            referencedColumns: ["id"]
          },
        ]
      }
      empresas: {
        Row: {
          activo: boolean | null
          centro_costo: string | null
          contacto: string | null
          created_at: string | null
          email: string | null
          id: string
          nombre: string
          razon_social: string | null
          rut: string | null
          telefono: string | null
        }
        Insert: {
          activo?: boolean | null
          centro_costo?: string | null
          contacto?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          nombre: string
          razon_social?: string | null
          rut?: string | null
          telefono?: string | null
        }
        Update: {
          activo?: boolean | null
          centro_costo?: string | null
          contacto?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          nombre?: string
          razon_social?: string | null
          rut?: string | null
          telefono?: string | null
        }
        Relationships: []
      }
      examenes: {
        Row: {
          codigo: string | null
          costo_neto: number | null
          created_at: string | null
          descripcion: string | null
          duracion_estimada: number | null
          id: string
          nombre: string
        }
        Insert: {
          codigo?: string | null
          costo_neto?: number | null
          created_at?: string | null
          descripcion?: string | null
          duracion_estimada?: number | null
          id?: string
          nombre: string
        }
        Update: {
          codigo?: string | null
          costo_neto?: number | null
          created_at?: string | null
          descripcion?: string | null
          duracion_estimada?: number | null
          id?: string
          nombre?: string
        }
        Relationships: []
      }
      margenes_cotizacion: {
        Row: {
          activo: boolean | null
          created_at: string | null
          id: string
          nombre: string
          orden: number | null
          porcentaje: number
        }
        Insert: {
          activo?: boolean | null
          created_at?: string | null
          id?: string
          nombre: string
          orden?: number | null
          porcentaje?: number
        }
        Update: {
          activo?: boolean | null
          created_at?: string | null
          id?: string
          nombre?: string
          orden?: number | null
          porcentaje?: number
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
      modulos: {
        Row: {
          activo: boolean | null
          created_at: string | null
          icon: string | null
          id: string
          label: string
          orden: number | null
          path: string
        }
        Insert: {
          activo?: boolean | null
          created_at?: string | null
          icon?: string | null
          id?: string
          label: string
          orden?: number | null
          path: string
        }
        Update: {
          activo?: boolean | null
          created_at?: string | null
          icon?: string | null
          id?: string
          label?: string
          orden?: number | null
          path?: string
        }
        Relationships: []
      }
      pacientes: {
        Row: {
          created_at: string | null
          direccion: string | null
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
          direccion?: string | null
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
          direccion?: string | null
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
      prestador_examenes: {
        Row: {
          created_at: string
          examen_id: string
          id: string
          prestador_id: string
          valor_prestacion: number
        }
        Insert: {
          created_at?: string
          examen_id: string
          id?: string
          prestador_id: string
          valor_prestacion?: number
        }
        Update: {
          created_at?: string
          examen_id?: string
          id?: string
          prestador_id?: string
          valor_prestacion?: number
        }
        Relationships: [
          {
            foreignKeyName: "prestador_examenes_examen_id_fkey"
            columns: ["examen_id"]
            isOneToOne: false
            referencedRelation: "examenes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prestador_examenes_prestador_id_fkey"
            columns: ["prestador_id"]
            isOneToOne: false
            referencedRelation: "prestadores"
            referencedColumns: ["id"]
          },
        ]
      }
      prestador_reemplazos: {
        Row: {
          created_at: string
          fecha: string
          id: string
          motivo: string | null
          prestador_original_id: string
          prestador_reemplazo_id: string
        }
        Insert: {
          created_at?: string
          fecha: string
          id?: string
          motivo?: string | null
          prestador_original_id: string
          prestador_reemplazo_id: string
        }
        Update: {
          created_at?: string
          fecha?: string
          id?: string
          motivo?: string | null
          prestador_original_id?: string
          prestador_reemplazo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prestador_reemplazos_prestador_original_id_fkey"
            columns: ["prestador_original_id"]
            isOneToOne: false
            referencedRelation: "prestadores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prestador_reemplazos_prestador_reemplazo_id_fkey"
            columns: ["prestador_reemplazo_id"]
            isOneToOne: false
            referencedRelation: "prestadores"
            referencedColumns: ["id"]
          },
        ]
      }
      prestadores: {
        Row: {
          activo: boolean
          created_at: string
          email: string | null
          especialidad: string | null
          id: string
          nombre: string
          rut: string | null
          telefono: string | null
          user_id: string | null
        }
        Insert: {
          activo?: boolean
          created_at?: string
          email?: string | null
          especialidad?: string | null
          id?: string
          nombre: string
          rut?: string | null
          telefono?: string | null
          user_id?: string | null
        }
        Update: {
          activo?: boolean
          created_at?: string
          email?: string | null
          especialidad?: string | null
          id?: string
          nombre?: string
          rut?: string | null
          telefono?: string | null
          user_id?: string | null
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
      get_next_cotizacion_number: { Args: never; Returns: number }
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
