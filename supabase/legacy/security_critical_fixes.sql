-- =====================================================================
-- Tokaro.fans — CRITICAL + HIGH security fixes
-- =====================================================================

-- C1: Fix role escalation — hardcode 'fan', ignore raw_user_meta_data role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, onboarding_complete)
  VALUES (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)),
    'fan',
    true
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.token_wallets (user_id, wallet_type, balance, total_earned, total_spent)
  VALUES (new.id, 'user', 0, 0, 0)
  ON CONFLICT (user_id, wallet_type) DO NOTHING;

  RETURN new;
END;
$$;

-- C2: Restrict wallet_topup — only service_role can call it
-- (revoke from authenticated, grant only to service_role)
REVOKE EXECUTE ON FUNCTION public.wallet_topup(integer, text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.wallet_topup(integer, text) FROM anon;

-- C3: Drop the overly permissive wallets_owner_all policy
DROP POLICY IF EXISTS "wallets_owner_all" ON public.token_wallets;

-- Also drop the overly permissive tx_owner_all policy (replaced by wallet_security.sql)
DROP POLICY IF EXISTS "tx_owner_all" ON public.token_transactions;

-- H1: Fix subscription expiry — recreate posts_select_gated with expires_at check
DROP POLICY IF EXISTS "posts_select_gated" ON public.posts;
CREATE POLICY "posts_select_gated" ON public.posts
  FOR SELECT USING (
    CASE access
      WHEN 'public' THEN true
      WHEN 'subscribers' THEN (
        creator_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.subscriptions s
          WHERE s.fan_id = auth.uid()
            AND s.creator_id = posts.creator_id
            AND s.status = 'active'
            AND (s.expires_at IS NULL OR s.expires_at > now())
        )
      )
      WHEN 'premium' THEN (
        creator_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.subscriptions s
          WHERE s.fan_id = auth.uid()
            AND s.creator_id = posts.creator_id
            AND s.tier = 'premium'
            AND s.status = 'active'
            AND (s.expires_at IS NULL OR s.expires_at > now())
        )
      )
      ELSE creator_id = auth.uid()
    END
  );

-- H2: Restrict subscription UPDATE — only allow fan to cancel (status → cancelled)
DROP POLICY IF EXISTS "subs_update_own" ON public.subscriptions;
CREATE POLICY "subs_update_fan_cancel" ON public.subscriptions
  FOR UPDATE USING (auth.uid() = fan_id)
  WITH CHECK (
    auth.uid() = fan_id
    AND status = 'cancelled'
  );

-- wallet_spend and wallet_request_payout are now defined in monetization_system.sql
-- with the correct signature (p_ref_type param) and payout rate (0.10).
-- DO NOT redefine them here — monetization_system.sql is the source of truth.

-- Add empty comment check
ALTER TABLE public.post_comments DROP CONSTRAINT IF EXISTS comments_body_not_empty;
ALTER TABLE public.post_comments ADD CONSTRAINT comments_body_not_empty CHECK (length(trim(body)) > 0);
