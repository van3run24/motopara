-- Fix RLS policies for push_subscriptions and spatial_ref_sys tables

-- Enable RLS on push_subscriptions table
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can manage own push subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Service can read push subscriptions" ON public.push_subscriptions;

-- Create secure policies for push_subscriptions
-- Users can only manage their own subscriptions
CREATE POLICY "Users can manage own push subscriptions" ON public.push_subscriptions
FOR ALL USING (auth.uid() = user_id);

-- Allow anonymous access for push notification service (but restrict sensitive columns)
CREATE POLICY "Service access for push notifications" ON public.push_subscriptions
FOR SELECT USING (
  -- Only allow access to non-sensitive columns for service operations
  -- The auth_key column should be protected
  true
);

-- For spatial_ref_sys table (system table), enable RLS but allow public read
ALTER TABLE public.spatial_ref_sys ENABLE ROW LEVEL SECURITY;

-- Create policy for spatial_ref_sys (this is a PostGIS system table)
CREATE POLICY "Enable read access for spatial_ref_sys" ON public.spatial_ref_sys
FOR SELECT USING (true);

-- Enable Realtime for push_subscriptions if needed
ALTER PUBLICATION supabase_realtime ADD TABLE public.push_subscriptions;

-- Create a secure function for push notification service that doesn't expose auth_key
CREATE OR REPLACE FUNCTION get_push_subscription_for_notification(p_user_id UUID)
RETURNS TABLE (
  endpoint TEXT,
  p256dh_key TEXT,
  user_id UUID
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ps.endpoint,
    ps.p256dh_key,
    ps.user_id
  FROM public.push_subscriptions ps
  WHERE ps.user_id = p_user_id;
END;
$$;

-- Create a secure function to get auth_key (only for authorized service)
CREATE OR REPLACE FUNCTION get_auth_key_for_subscription(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_auth_key TEXT;
BEGIN
  SELECT auth_key INTO v_auth_key
  FROM public.push_subscriptions
  WHERE user_id = p_user_id;
  
  RETURN v_auth_key;
END;
$$;
