-- Add is_dislike column to likes table for tracking dislikes
ALTER TABLE public.likes ADD COLUMN IF NOT EXISTS is_dislike BOOLEAN DEFAULT FALSE;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_likes_is_dislike ON public.likes(is_dislike);

-- Update existing policies to handle dislikes
DROP POLICY IF EXISTS "Users can insert likes" ON public.likes;
CREATE POLICY "Users can insert likes" ON public.likes
FOR INSERT WITH CHECK (
  auth.uid() = from_user_id AND 
  (is_dislike IS NULL OR is_dislike = FALSE)
);

DROP POLICY IF EXISTS "Users can insert dislikes" ON public.likes;
CREATE POLICY "Users can insert dislikes" ON public.likes
FOR INSERT WITH CHECK (
  auth.uid() = from_user_id AND 
  is_dislike = TRUE
);

-- Combined policy for all inserts
DROP POLICY IF EXISTS "Users can manage own likes" ON public.likes;
CREATE POLICY "Users can manage own likes" ON public.likes
FOR ALL USING (auth.uid() = from_user_id);
