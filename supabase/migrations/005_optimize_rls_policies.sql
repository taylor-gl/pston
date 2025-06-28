-- Migration to optimize RLS policies for better performance
-- This wraps auth functions in subqueries to prevent re-evaluation per row

-- First, drop existing policies that need optimization

-- Drop profiles policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

-- Drop public_figures policies  
DROP POLICY IF EXISTS "Authenticated users can insert public figures" ON public.public_figures;
DROP POLICY IF EXISTS "Users can update their own public figures" ON public.public_figures;

-- Drop storage policies
DROP POLICY IF EXISTS "Authenticated users can upload public figure images" ON storage.objects;

-- Recreate policies with optimized auth function calls

-- Optimized profiles policies
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING ((select auth.uid()) = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING ((select auth.uid()) = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK ((select auth.uid()) = id);

-- Optimized public_figures policies
CREATE POLICY "Authenticated users can insert public figures" ON public.public_figures
  FOR INSERT WITH CHECK ((select auth.role()) = 'authenticated');

CREATE POLICY "Users can update their own public figures" ON public.public_figures
  FOR UPDATE USING ((select auth.uid()) = created_by);

-- Optimized storage policies
CREATE POLICY "Authenticated users can upload public figure images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'public-figure-images' AND (select auth.role()) = 'authenticated'); 