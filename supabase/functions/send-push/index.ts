import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'https://esm.sh/web-push@3.6.5'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// VAPID ключи из environment variables
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY') || ''
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') || ''
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:support@motopara.ru'

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Проверка VAPID ключей
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.error('VAPID keys not configured in environment variables')
    return new Response(
      JSON.stringify({ error: 'VAPID keys not configured' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }

  try {
    const { method } = req
    
    if (method === 'POST') {
      const { title, body, icon, tag, userId } = await req.json()
      
      if (!userId) {
        return new Response(
          JSON.stringify({ error: 'userId is required' }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400 
          }
        )
      }
      
      // Получаем подписки пользователей
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? ''
      )
      
      const { data: subscriptions, error } = await supabaseClient
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', userId)
      
      if (error) {
        console.error('Error fetching subscriptions:', error)
        throw error
      }
      
      if (!subscriptions || subscriptions.length === 0) {
        console.log('No push subscriptions found for user:', userId)
        return new Response(
          JSON.stringify({ success: true, message: 'No subscriptions found' }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200 
          }
        )
      }
      
      // Настраиваем VAPID
      webpush.setVapidDetails(
        VAPID_SUBJECT,
        VAPID_PUBLIC_KEY,
        VAPID_PRIVATE_KEY
      )

      // Отправляем push уведомления через Web Push Protocol
      const results = []
      
      for (const subscription of subscriptions) {
        try {
          const pushSubscription = {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh_key,
              auth: subscription.auth_key
            }
          }

          const payload = JSON.stringify({
            title: title || 'МОТОЗНАКОМСТВА',
            body: body || 'Новое уведомление',
            icon: icon || '/favicons/android-chrome-192x192.png',
            badge: '/favicons/favicon-32x32.png',
            vibrate: [100, 50, 100],
            tag: tag || 'motopara-notification',
            data: { 
              url: '/', // Используем корневой URL вместо window.location.origin
              dateOfArrival: Date.now()
            }
          })

          await webpush.sendNotification(
            pushSubscription,
            payload
          )
          
          results.push({ success: true, subscription: subscription.endpoint })
          console.log('Push notification sent successfully to:', subscription.endpoint)
        } catch (error) {
          console.error('Error sending notification to', subscription.endpoint, ':', error)
          
          // Если подписка больше не активна, удаляем её
          if (error && typeof error === 'object' && 'statusCode' in error && 
              (error.statusCode === 410 || error.statusCode === 404)) {
            await supabaseClient
              .from('push_subscriptions')
              .delete()
              .eq('endpoint', subscription.endpoint)
            console.log('Removed inactive subscription:', subscription.endpoint)
          }
          
          results.push({ success: false, error: error instanceof Error ? error.message : String(error), subscription: subscription.endpoint })
        }
      }
      
      return new Response(
        JSON.stringify({ success: true, results }),
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
    console.error('Push notification error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
