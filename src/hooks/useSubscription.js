import { useQuery, useQueryClient } from "@tanstack/react-query";
import { billingApi } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";

function computeAccess(sub) {
  if (!sub) return { isActive: false, trialDaysLeft: null, daysToRenewal: null };
  const now = Date.now();
  const trialEnd  = sub.trial_end ? new Date(sub.trial_end).getTime() : null;
  const periodEnd = sub.current_period_end ? new Date(sub.current_period_end).getTime() : null;
  const trialActive = sub.status === "trial"  && trialEnd  && trialEnd  > now;
  const paidActive  = sub.status === "active" && periodEnd && periodEnd > now;
  const isActive = trialActive || paidActive;
  const trialDaysLeft = trialActive ? Math.max(0, Math.ceil((trialEnd - now) / 86400000)) : null;
  const daysToRenewal = paidActive  ? Math.max(0, Math.ceil((periodEnd - now) / 86400000)) : null;
  return { isActive, trialDaysLeft, daysToRenewal };
}

// Shared cache key so all consumers (TrialBanner, FanDashboard, Pricing,
// Billing) hit the same cached subscription response within staleTime.
export const SUBSCRIPTION_QUERY_KEY = ["billing", "me", "subscription"];

export default function useSubscription() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [...SUBSCRIPTION_QUERY_KEY, user?.id || "anon"],
    queryFn: () => billingApi.getMine(),
    enabled: !!user,
    staleTime: 60_000,        // 1 min: la subscription cambia raramente
    gcTime: 5 * 60_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const sub = data?.subscription || null;

  return {
    sub,
    loading: isLoading,
    error: error?.message || null,
    refresh: () => {
      queryClient.invalidateQueries({ queryKey: SUBSCRIPTION_QUERY_KEY });
      return refetch();
    },
    ...computeAccess(sub),
  };
}
