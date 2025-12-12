import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-sync-secret',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const syncSecret = req.headers.get('x-sync-secret');
    const expectedSecret = Deno.env.get('SYNC_WEBHOOK_SECRET');
    
    if (!syncSecret || syncSecret !== expectedSecret) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), 
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { table, action, record, old_record } = await req.json();
    console.log(`Sync from facturación: ${action} on ${table}`, record);

    if (table === 'empresas') {
      if (action === 'DELETE') {
        await supabase.from('empresas').update({ activo: false }).eq('id', old_record.id);
      } else {
        await supabase.from('empresas').upsert({
          id: record.id,
          rut: record.rut,
          razon_social: record.razon_social,
          contacto: record.contacto,
          email: record.email,
          telefono: record.telefono,
          centro_costo: record.centro_costo,
          activo: record.activo ?? true,
          created_at: record.created_at
        }, { onConflict: 'id' });
      }
    }

    return new Response(JSON.stringify({ success: true }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
