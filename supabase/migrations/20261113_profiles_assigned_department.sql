ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS assigned_department text;
