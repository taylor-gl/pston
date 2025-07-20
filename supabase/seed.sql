-- Seed file for test data
-- This file populates the database with test data for development
-- Uses CTEs and gen_random_uuid() for cleaner UUID management

WITH 
-- Generate specific user and figure IDs
user_figure_data AS (
  SELECT 
    gen_random_uuid() as alice_id,
    gen_random_uuid() as bob_id,
    gen_random_uuid() as whitney_id,
    gen_random_uuid() as adam_id,
    gen_random_uuid() as whitney_example_id,
    gen_random_uuid() as adam_example_id
),
-- Create test users
inserted_users AS (
  INSERT INTO auth.users (
    id, 
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_user_meta_data,
    role
  )
  SELECT 
    alice_id,
    'testuser@example.com',
    crypt('password123', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"full_name": "Alice Johnson"}'::jsonb,
    'authenticated'
  FROM user_figure_data
  UNION ALL
  SELECT 
    bob_id,
    'admin@example.com',
    crypt('password123', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"full_name": "Bob Administrator"}'::jsonb,
    'authenticated'
  FROM user_figure_data
  RETURNING id, raw_user_meta_data->>'full_name' as full_name
),
-- Assign roles to users
-- Note: Profiles are created automatically by the handle_new_user() trigger
role_assignments AS (
  INSERT INTO public.user_roles (user_id, role_id)
  SELECT 
    d.alice_id, 
    r.id
  FROM user_figure_data d, public.roles r 
  WHERE r.name = 'user'
  UNION ALL
  SELECT 
    d.bob_id,
    r.id
  FROM user_figure_data d, public.roles r 
  WHERE r.name = 'admin'
  RETURNING user_id
),
-- Create public figures with specific user assignments
inserted_figures AS (
  INSERT INTO public.public_figures (
    id,
    name,
    slug,
    description,
    image_filename,
    created_by,
    created_by_profile_id,
    created_at,
    updated_at
  )
  SELECT 
    d.whitney_id,
    'Whitney Cummings',
    'whitney-cummings',
    'stand-up comedian',
    'whitney-cummings.png',
    d.alice_id,
    d.alice_id,
    now() - interval '7 days',
    now() - interval '7 days'
  FROM user_figure_data d
  UNION ALL
  SELECT 
    d.adam_id,
    'Adam Savage',
    'adam-savage',
    'YouTuber and host of Mythbusters',
    'adam-savage.jpg',
    d.bob_id,
    d.bob_id,
    now() - interval '3 days',
    now() - interval '3 days'
  FROM user_figure_data d
  RETURNING id, name
),
-- Create pronunciation examples
inserted_examples AS (
  INSERT INTO public.pronunciation_examples (
    id,
    public_figure_id,
    youtube_video_id,
    start_timestamp,
    end_timestamp,
    description,
    upvotes,
    downvotes,
    wilson_score,
    created_by,
    created_by_profile_id,
    created_at,
    updated_at
  )
  SELECT 
    d.whitney_example_id,
    d.whitney_id,
    'GRGPX_iNfQE', -- Whitney Cummings interview
    513.549,
    514.966,
    'From her interview with adult film star Angela White on episode 191 of the Good For You podcast, hosted by Whitney Cummings.',
    5,
    1,
    0.7,
    d.bob_id,
    d.bob_id,
    now() - interval '2 days',
    now() - interval '2 days'
  FROM user_figure_data d
  UNION ALL
  SELECT 
    d.adam_example_id,
    d.adam_id,
    's4ru0dfBN2Q', -- Adam Savage interview
    0.171,
    2.025,
    'The audio is a bit unclear due to the overlapping sound effect.',
    3,
    0,
    0.8,
    d.alice_id,
    d.alice_id,
    now() - interval '1 day',
    now() - interval '1 day'
  FROM user_figure_data d
  RETURNING id
)
-- Create test votes
INSERT INTO public.pronunciation_example_votes (
  id,
  pronunciation_example_id,
  user_id,
  vote_type,
  created_at,
  updated_at
)
SELECT 
  gen_random_uuid(),
  d.whitney_example_id,
  d.alice_id,
  'upvote',
  now() - interval '1 day',
  now() - interval '1 day'
FROM user_figure_data d
UNION ALL
SELECT 
  gen_random_uuid(),
  d.adam_example_id,
  d.bob_id,
  'upvote',
  now() - interval '12 hours',
  now() - interval '12 hours'
FROM user_figure_data d;

-- Update the created_by_profile_id fields since the trigger sets them to NULL
-- during seeding (no auth context)
UPDATE public.public_figures 
SET created_by_profile_id = created_by 
WHERE created_by_profile_id IS NULL;

UPDATE public.pronunciation_examples 
SET created_by_profile_id = created_by 
WHERE created_by_profile_id IS NULL;
