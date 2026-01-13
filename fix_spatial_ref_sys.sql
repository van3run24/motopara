-- Fix RLS for spatial_ref_sys table (PostGIS system table)

-- Enable RLS on spatial_ref_sys table
ALTER TABLE public.spatial_ref_sys ENABLE ROW LEVEL SECURITY;

-- Create policy for spatial_ref_sys (this is a PostGIS system table that should be publicly readable)
CREATE POLICY "Enable read access for spatial_ref_sys" ON public.spatial_ref_sys
FOR SELECT USING (true);
