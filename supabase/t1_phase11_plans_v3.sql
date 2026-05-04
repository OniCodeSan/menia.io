-- =====================================================================
-- Phase 11 — Plans v3: 3 standard tiers + Master "contact us"
--   Base   — €4.99    1 corso   1 live/mese          (id: free)
--   Starter — €19      5 corsi   3 live/mese          (id: starter)
--   Grow    — €39     15 corsi  10 live/mese          (id: pro)
--   Master  — contact  illimitato                     (id: elite)
--
-- Schema: aggiunge `contact_only` per render UI ("contattaci" invece del prezzo).
-- Gli id originali (free/starter/pro/elite) restano per compat FK; il display
-- viene fatto con il `name` aggiornato.
-- =====================================================================

ALTER TABLE public.creator_plans
  ADD COLUMN IF NOT EXISTS contact_only boolean NOT NULL DEFAULT false;

-- Base — non più gratis
UPDATE public.creator_plans SET
  name = 'Base',
  price_monthly = 4.99,
  max_courses = 1,
  max_live_per_month = 1,
  analytics_level = 'none',
  analytics_tier = 0,
  features = 'basic',
  priority_visibility = 0,
  support_level = 'community',
  contact_only = false,
  position = 1
WHERE id = 'free';

-- Starter invariato
UPDATE public.creator_plans SET
  name = 'Starter',
  price_monthly = 19.00,
  max_courses = 5,
  max_live_per_month = 3,
  analytics_level = 'basic',
  analytics_tier = 1,
  features = 'growth',
  priority_visibility = 10,
  support_level = 'email',
  contact_only = false,
  position = 2
WHERE id = 'starter';

-- Grow (ex Pro): 15 corsi, resto invariato
UPDATE public.creator_plans SET
  name = 'Grow',
  price_monthly = 39.00,
  max_courses = 15,
  max_live_per_month = 10,
  analytics_level = 'advanced',
  analytics_tier = 2,
  features = 'advanced',
  priority_visibility = 25,
  support_level = 'priority',
  contact_only = false,
  position = 3
WHERE id = 'pro';

-- Master (ex Elite): contact-only, illimitato
UPDATE public.creator_plans SET
  name = 'Master',
  price_monthly = 0,
  max_courses = NULL,
  max_live_per_month = NULL,
  analytics_level = 'full',
  analytics_tier = 3,
  features = 'full',
  priority_visibility = 50,
  support_level = 'priority',
  contact_only = true,
  position = 4
WHERE id = 'elite';
