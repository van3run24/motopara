-- Создание таблицы для push подписок
CREATE TABLE push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh_key TEXT NOT NULL,
  auth_key TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Индексы для производительности
CREATE INDEX idx_push_subscriptions_user_id ON push_subscriptions(user_id);

-- RLS политики
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Политики для push подписок
CREATE POLICY "Users can manage own push subscriptions" ON push_subscriptions
  FOR ALL USING (auth.uid()::text = user_id::text);

-- Политики для чтения (для отправки уведомлений)
CREATE POLICY "Service can read push subscriptions" ON push_subscriptions
  FOR SELECT USING (true);

-- Функция для обновления подписки
CREATE OR REPLACE FUNCTION upsert_push_subscription(
  p_user_id UUID,
  p_endpoint TEXT,
  p_p256dh_key TEXT,
  p_auth_key TEXT
) RETURNS VOID AS $$
BEGIN
  INSERT INTO push_subscriptions (user_id, endpoint, p256dh_key, auth_key)
  VALUES (p_user_id, p_endpoint, p_p256dh_key, p_auth_key)
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    endpoint = p_endpoint,
    p256dh_key = p_p256dh_key,
    auth_key = p_auth_key,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
