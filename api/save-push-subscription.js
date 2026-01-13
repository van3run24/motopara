// API endpoint для сохранения push подписок
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { userId, endpoint, p256dhKey, authKey } = req.body

    if (!userId || !endpoint || !p256dhKey || !authKey) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    // Сохраняем подписку в Supabase
    const { data, error } = await supabase.rpc('upsert_push_subscription', {
      p_user_id: userId,
      p_endpoint: endpoint,
      p_p256dh_key: p256dhKey,
      p_auth_key: authKey
    })

    if (error) {
      console.error('Error saving push subscription:', error)
      return res.status(500).json({ error: 'Failed to save subscription' })
    }

    res.status(200).json({ success: true, message: 'Push subscription saved' })
  } catch (error) {
    console.error('Error in save-push-subscription:', error)
    res.status(500).json({ error: error.message })
  }
}
