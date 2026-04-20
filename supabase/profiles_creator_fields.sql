-- Add creator-specific fields to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tags text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS monthly_price numeric;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS yearly_price numeric;
