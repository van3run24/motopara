import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// VAPID ключи (лучше вынести в environment variables)
const VAPID_PUBLIC_KEY = 'BLc1xPvF8jHq3xL8f9k2mN4p7r6sT5uV8wX2yZ1aQ3bC4dE5fG6hI7jK8lM9nO0p'
const VAPID_PRIVATE_KEY = 'YOUR_VAPID_PRIVATE_KEY' // Нужно сгенерировать!
const VAPID_EMAIL = 'your-email@example.com'

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { method } = req
    
    if (method === 'POST') {
      const { title, body, icon, tag, userId } = await req.json()
      
      // Получаем подписки пользователей
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? ''
      )
      
      let subscriptions = []
      
      if (userId) {
        // Отправка конкретному пользователю
        const { data, error } = await supabaseClient
          .from('push_subscriptions')
          .select('*')
          .eq('user_id', userId)
        
        if (error) throw error
        subscriptions = data
      } else {
        // Отправка всем пользователям
        const { data, error } = await supabaseClient
          .from('push_subscriptions')
          .select('*')
        
        if (error) throw error
        subscriptions = data
      }
      
      // Отправляем push уведомления
      const results = []
      
      for (const subscription of subscriptions) {
        try {
          const payload = JSON.stringify({
            title: title || 'МОТОЗНАКОМСТВА',
            body: body || 'Новое уведомление',
            icon: icon || 'https://your-domain.com/favicons/android-chrome-192x192.png',
            tag: tag || 'default',
            data: { url: 'https://your-domain.com' }
          })
          
          const response = await fetch('https://fcm.googleapis.com/fcm/send', {
            method: 'POST',
            headers: {
              'Authorization': `key=${Deno.env.get('FCM_SERVER_KEY')}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              to: subscription.endpoint,
              notification: {
                title: title || 'МОТОЗНАКОМСТВА',
                body: body || 'Новое уведомление',
                icon: icon || 'https://your-domain.com/favicons/android-chrome-192x192.png',
                click_action: 'https://your-domain.com'
              }
            })
          })
          
          results.push({ success: response.ok, subscription: subscription.endpoint })
        } catch (error) {
          console.error('Error sending notification:', error)
          results.push({ success: false, error: error.message, subscription: subscription.endpoint })
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
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
