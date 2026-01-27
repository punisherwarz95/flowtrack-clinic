import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LoginRequest {
  email: string;
  password: string;
}

interface SignupRequest {
  email: string;
  password: string;
  nombre: string;
  cargo?: string;
  empresa_rut: string; // Para validar que la empresa existe
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

    const url = new URL(req.url);
    const action = url.pathname.split("/").pop();

    if (action === "login") {
      const { email, password }: LoginRequest = await req.json();

      if (!email || !password) {
        return new Response(
          JSON.stringify({ error: "Email y contraseña son requeridos" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Verificar que el email corresponde a un usuario de empresa
      const { data: empresaUsuario, error: empresaError } = await supabaseAdmin
        .from("empresa_usuarios")
        .select("*, empresas(*)")
        .eq("email", email.toLowerCase())
        .eq("activo", true)
        .limit(1);

      if (empresaError || !empresaUsuario || empresaUsuario.length === 0) {
        console.log("Usuario de empresa no encontrado:", email);
        return new Response(
          JSON.stringify({ error: "Credenciales inválidas o usuario no autorizado" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Intentar login con Supabase Auth
      const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        console.log("Error de autenticación:", authError.message);
        return new Response(
          JSON.stringify({ error: "Credenciales inválidas" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Actualizar auth_user_id si no está configurado
      if (!empresaUsuario[0].auth_user_id && authData.user) {
        await supabaseAdmin
          .from("empresa_usuarios")
          .update({ auth_user_id: authData.user.id })
          .eq("id", empresaUsuario[0].id);
      }

      console.log("Login exitoso para usuario de empresa:", email);

      return new Response(
        JSON.stringify({
          success: true,
          session: authData.session,
          user: authData.user,
          empresa_usuario: empresaUsuario[0],
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "signup") {
      const { email, password, nombre, cargo, empresa_rut }: SignupRequest = await req.json();

      if (!email || !password || !nombre || !empresa_rut) {
        return new Response(
          JSON.stringify({ error: "Todos los campos obligatorios deben completarse" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Normalizar RUT para búsqueda
      const rutNormalizado = empresa_rut.replace(/[^0-9kK]/g, "").toUpperCase();

      // Verificar que la empresa existe por RUT
      const { data: empresa, error: empresaError } = await supabaseAdmin
        .from("empresas")
        .select("*")
        .eq("activo", true)
        .or(`rut.ilike.%${rutNormalizado}%,rut.ilike.%${empresa_rut}%`)
        .limit(1);

      if (empresaError || !empresa || empresa.length === 0) {
        console.log("Empresa no encontrada con RUT:", empresa_rut);
        return new Response(
          JSON.stringify({ error: "Empresa no encontrada. Contacte al centro para registrar su empresa." }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Verificar que no exista ya un usuario con ese email para esa empresa
      const { data: existingUser } = await supabaseAdmin
        .from("empresa_usuarios")
        .select("id")
        .eq("empresa_id", empresa[0].id)
        .eq("email", email.toLowerCase())
        .limit(1);

      if (existingUser && existingUser.length > 0) {
        return new Response(
          JSON.stringify({ error: "Ya existe un usuario con este email para esta empresa" }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Crear usuario en Supabase Auth
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          nombre,
          tipo: "empresa",
          empresa_id: empresa[0].id,
        },
      });

      if (authError) {
        console.log("Error creando usuario auth:", authError.message);
        return new Response(
          JSON.stringify({ error: "Error al crear usuario: " + authError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Crear registro en empresa_usuarios
      const { data: empresaUsuario, error: insertError } = await supabaseAdmin
        .from("empresa_usuarios")
        .insert({
          empresa_id: empresa[0].id,
          auth_user_id: authData.user.id,
          email: email.toLowerCase(),
          nombre,
          cargo,
          activo: true,
        })
        .select()
        .single();

      if (insertError) {
        // Rollback: eliminar usuario auth
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        console.log("Error creando empresa_usuario:", insertError.message);
        return new Response(
          JSON.stringify({ error: "Error al crear perfil de empresa" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Asignar rol de usuario
      await supabaseAdmin.from("empresa_user_roles").insert({
        empresa_usuario_id: empresaUsuario.id,
        role: "usuario",
      });

      console.log("Signup exitoso para usuario de empresa:", email, "Empresa:", empresa[0].nombre);

      return new Response(
        JSON.stringify({
          success: true,
          message: "Usuario creado exitosamente. Ya puede iniciar sesión.",
          empresa_usuario: empresaUsuario,
        }),
        { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "check-empresa") {
      const { rut } = await req.json();

      if (!rut) {
        return new Response(
          JSON.stringify({ error: "RUT es requerido" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const rutNormalizado = rut.replace(/[^0-9kK]/g, "").toUpperCase();

      const { data: empresa, error } = await supabaseAdmin
        .from("empresas")
        .select("id, nombre, rut")
        .eq("activo", true)
        .or(`rut.ilike.%${rutNormalizado}%,rut.ilike.%${rut}%`)
        .limit(1);

      if (error || !empresa || empresa.length === 0) {
        return new Response(
          JSON.stringify({ exists: false }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ exists: true, empresa: empresa[0] }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Acción no válida" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error en empresa-auth:", error);
    return new Response(
      JSON.stringify({ error: "Error interno del servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
