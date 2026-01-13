-- Final security fixes for Supabase

-- 1. Fix search_path for functions (security best practice)
ALTER FUNCTION public.mark_messages_read(p_chat_id uuid) SET search_path = public;
ALTER FUNCTION public.get_push_subscription_for_notification(p_user_id uuid) SET search_path = public;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;

-- 2. Fix overly permissive users INSERT policy
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
CREATE POLICY "Users can insert own profile" ON public.users
FOR INSERT WITH CHECK (auth.uid() = id);

-- 3. spatial_ref_sys - this is a PostGIS system table, we'll ignore this warning
-- as it's managed by Supabase/PostGIS and should remain publicly readable

-- 4. PostGIS extension - this is a system-level change that requires admin access
-- This warning can be ignored for most use cases

-- Note: HaveIBeenPwned protection must be enabled in Supabase Dashboard settings
-- Go to Authentication -> Settings -> Security -> Enable leaked password protection
