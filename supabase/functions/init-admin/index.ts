import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.77.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Check if any users exist
    const { data: existingProfiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .limit(1)

    if (profilesError) {
      console.error('Error checking profiles:', profilesError)
      throw profilesError
    }

    // If users already exist, don't create admin
    if (existingProfiles && existingProfiles.length > 0) {
      return new Response(
        JSON.stringify({ 
          message: 'Admin user already exists',
          alreadyExists: true 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    // Create the admin user with valid email format
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: 'operaciones@mediflow.local',
      password: 'sami1005',
      email_confirm: true,
      user_metadata: {
        username: 'operaciones'
      }
    })

    if (authError) {
      console.error('Error creating admin user:', authError)
      throw authError
    }

    if (!authData.user) {
      throw new Error('No user created')
    }

    console.log('Admin user created:', authData.user.id)

    // Add admin role
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: authData.user.id,
        role: 'admin',
      })

    if (roleError) {
      console.error('Error creating admin role:', roleError)
      throw roleError
    }

    console.log('Admin role assigned')

    // Add all menu permissions
    const allMenus = [
      '/',
      '/flujo',
      '/pacientes',
      '/completados',
      '/empresas',
      '/boxes',
      '/examenes',
      '/usuarios',
    ]

    const permissionsData = allMenus.map((path) => ({
      user_id: authData.user!.id,
      menu_path: path,
    }))

    const { error: permError } = await supabaseAdmin
      .from('menu_permissions')
      .insert(permissionsData)

    if (permError) {
      console.error('Error creating permissions:', permError)
      throw permError
    }

    console.log('All permissions assigned')

    return new Response(
      JSON.stringify({ 
        message: 'Admin user "operaciones" created successfully',
        userId: authData.user.id,
        created: true
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error) {
    console.error('Error in init-admin function:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
