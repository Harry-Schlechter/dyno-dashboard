-- The pairing-code lookup has a chicken-and-egg problem: the extension must read the row
-- BEFORE it's authenticated, but RLS requires auth.uid() = user_id. A SECURITY DEFINER
-- function bypasses RLS for this single, narrow path: lookup by code only.
--
-- Safety: only returns the payload if the code matches exactly, isn't consumed, and isn't
-- expired. Also marks consumed_at in the same call, so a code is single-use.

CREATE OR REPLACE FUNCTION public.redeem_pairing_code(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row extension_pairing%ROWTYPE;
BEGIN
  SELECT * INTO v_row
  FROM extension_pairing
  WHERE code = upper(trim(p_code))
    AND consumed_at IS NULL
    AND expires_at > now()
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  UPDATE extension_pairing
    SET consumed_at = now()
    WHERE id = v_row.id;

  RETURN v_row.payload;
END;
$$;

-- Grant invocation to anon (the extension calls this with the anon key before it has a session).
GRANT EXECUTE ON FUNCTION public.redeem_pairing_code(text) TO anon, authenticated;
