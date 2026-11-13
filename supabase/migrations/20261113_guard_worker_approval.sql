CREATE OR REPLACE FUNCTION public.guard_worker_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  role_claim text;
BEGIN
  IF OLD.activate IS NOT FALSE OR NEW.activate IS NOT TRUE THEN
    RETURN NEW;
  END IF;
  IF COALESCE(NEW.role::text, '') <> '작업자' THEN
    RETURN NEW;
  END IF;

  IF session_user IN ('postgres', 'supabase_admin') THEN
    RETURN NEW;
  END IF;

  role_claim := COALESCE(
    NULLIF(current_setting('request.jwt.claim.role', true), ''),
    NULLIF(current_setting('request.jwt.claims', true), '')::json->>'role',
    ''
  );

  IF role_claim = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role::text IN ('super_admin', 'admin', '관리자')
  ) THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'approval_forbidden';
END;
$$;

DROP TRIGGER IF EXISTS profiles_guard_worker_approval ON public.profiles;
CREATE TRIGGER profiles_guard_worker_approval
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_worker_approval();
