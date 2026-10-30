ALTER TYPE public.profile_role ADD VALUE IF NOT EXISTS 'super_admin' BEFORE 'admin';

DROP POLICY IF EXISTS "employee_option_settings_admin_insert" ON public.employee_option_settings;
CREATE POLICY "employee_option_settings_admin_insert"
ON public.employee_option_settings
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role::text IN ('super_admin', 'admin')
  )
);

DROP POLICY IF EXISTS "employee_option_settings_admin_update" ON public.employee_option_settings;
CREATE POLICY "employee_option_settings_admin_update"
ON public.employee_option_settings
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role::text IN ('super_admin', 'admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role::text IN ('super_admin', 'admin')
  )
);

DROP POLICY IF EXISTS "employee_option_settings_admin_delete" ON public.employee_option_settings;
CREATE POLICY "employee_option_settings_admin_delete"
ON public.employee_option_settings
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role::text IN ('super_admin', 'admin')
  )
);

DROP POLICY IF EXISTS cnc_items_delete_manage ON public.cnc_items;
CREATE POLICY cnc_items_delete_manage
ON public.cnc_items
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND coalesce(p.activate, true) = true
      AND (
        p.role::text IN ('super_admin', 'admin', '관리자')
        OR coalesce(p.department, '') ILIKE '%설계%'
      )
  )
);

CREATE OR REPLACE FUNCTION public.can_manage_cnc_items(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = user_id
      AND coalesce(activate, true) = true
      AND (
        role::text IN ('super_admin', 'admin', '관리자')
        OR replace(coalesce(department, ''), ' ', '') LIKE '%설계%'
      )
  );
$function$;

CREATE OR REPLACE FUNCTION public.can_manage_welding_schedule(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  select exists (
    select 1
    from public.profiles p
    where p.id = user_id
      and (
        p.role::text in ('super_admin', 'admin')
        or trim(coalesce(p.name, '')) in ('안상기', '김호연')
      )
  );
$function$;

CREATE OR REPLACE FUNCTION public.is_push_settings_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role::text IN ('super_admin', 'admin', '관리자')
  );
$function$;

DROP POLICY IF EXISTS chatbot_notes_admin_select ON public.chatbot_notes;
CREATE POLICY chatbot_notes_admin_select
  ON public.chatbot_notes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role::text = 'super_admin'
    )
  );

DROP POLICY IF EXISTS chatbot_notes_admin_delete ON public.chatbot_notes;
CREATE POLICY chatbot_notes_admin_delete
  ON public.chatbot_notes
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role::text = 'super_admin'
    )
  );
