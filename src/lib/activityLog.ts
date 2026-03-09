import { supabase } from "@/integrations/supabase/client";

export type ActivityAction = 
  | "login" | "logout" 
  | "crear_paciente" | "editar_paciente" | "eliminar_paciente"
  | "crear_atencion" | "completar_atencion" | "incompleto_atencion"
  | "llamar_paciente" | "devolver_espera"
  | "crear_usuario" | "eliminar_usuario" | "cambiar_password"
  | "crear_empresa" | "editar_empresa" | "eliminar_empresa"
  | "crear_cotizacion" | "editar_cotizacion" | "eliminar_cotizacion" | "duplicar_cotizacion"
  | "crear_prereserva" | "eliminar_prereserva"
  | "cambiar_estado_examen"
  | "navegar_modulo"
  | "crear_agenda_diferida" | "editar_agenda_diferida" | "vincular_agenda_diferida"
  | "generar_estado_pago"
  | "seleccionar_box"
  | "completar_box" | "devolver_espera_box"
  | "revertir_atencion" | "reactivar_paciente"
  | "evaluar_bateria" | "re_evaluar_bateria"
  | "crear_box" | "editar_box" | "eliminar_box" | "toggle_box"
  | "crear_examen" | "editar_examen" | "eliminar_examen"
  | "crear_paquete" | "editar_paquete" | "eliminar_paquete"
  | "importar_examenes"
  | "crear_bloque" | "editar_bloque" | "eliminar_bloque" | "toggle_bloque"
  | "otro";

export const logActivity = async (
  action: ActivityAction,
  details?: Record<string, any>,
  module?: string
) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get username from profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .maybeSingle();

    await supabase.from("activity_logs").insert({
      user_id: user.id,
      username: profile?.username || user.email?.split("@")[0] || "unknown",
      action,
      details: details || {},
      module: module || null,
    });
  } catch (error) {
    // Silent fail - don't interrupt user flow for logging
    console.error("Error logging activity:", error);
  }
};
