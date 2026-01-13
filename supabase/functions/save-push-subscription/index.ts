import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (req.method === 'POST') {
      const { userId, endpoint, p256dhKey, authKey } = await req.json()

      if (!userId || !endpoint || !p256dhKey || !authKey) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields' }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400 
          }
        )
      }

      // Создаем клиент Supabase
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )

      // Сохраняем подписку через RPC функцию
      const { data, error } = await supabaseClient.rpc('upsert_push_subscription', {
        p_user_id: userId,
        p_endpoint: endpoint,
        p_p256dh_key: p256dhKey,
        p_auth_key: authKey
      })

      if (error) {
        console.error('Error saving push subscription:', error)
        return new Response(
          JSON.stringify({ error: 'Failed to save subscription' }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500 
          }
        )
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Push subscription saved' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }
    
    return new Response('Method not allowed', { 
      headers: corsHeaders, 
      status: 405 
    })
    
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
