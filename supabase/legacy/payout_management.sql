-- =====================================================================
-- Tokaro.fans — Payout management: refund + payout_method + admin RLS
-- =====================================================================

-- Refund payout tokens back to creator wallet (called on rejection)
create or replace function public.wallet_refund_payout(
  p_creator_id uuid,
  p_token_amount integer
)
returns void language plpgsql security definer as $$
begin
  update public.token_wallets
    set balance = balance + p_token_amount,
        total_spent = total_spent - p_token_amount,
        updated_at = now()
    where user_id = p_creator_id and wallet_type = 'creator';

  insert into public.token_transactions (user_id, wallet_type, type, amount, description)
    values (p_creator_id, 'creator', 'refund', p_token_amount, 'Rimborso payout rifiutato');
end;
$$;

-- Add payout_method JSONB to profiles (stores IBAN, holder name, etc.)
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'payout_method'
  ) then
    alter table public.profiles add column payout_method jsonb default null;
  end if;
end $$;

-- Add updated_at to payout_requests if not exists
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'payout_requests' and column_name = 'updated_at'
  ) then
    alter table public.payout_requests add column updated_at timestamptz default now();
  end if;
end $$;

-- Allow service_role to update payout_requests (for admin actions via server)
-- The server uses service_role key which bypasses RLS, so no policy needed.
-- But ensure the table accepts the update operation.
