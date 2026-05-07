-- Add stripe_price_id to creator_plans so /api/creator/subscribe-plan can mint
-- a real Stripe checkout session per plan instead of returning external_payment_link.
ALTER TABLE public.creator_plans ADD COLUMN IF NOT EXISTS stripe_price_id text;

-- After migration: populate price IDs manually via SQL (one row per paid plan):
--   UPDATE public.creator_plans SET stripe_price_id = 'price_xxx' WHERE id = 'free';
--   UPDATE public.creator_plans SET stripe_price_id = 'price_yyy' WHERE id = 'starter';
--   UPDATE public.creator_plans SET stripe_price_id = 'price_zzz' WHERE id = 'pro';
-- 'elite' (Master) stays NULL — contact_only.
