import { supabase } from '@/integrations/supabase/client';

export type SubscriptionPlan = 'starter' | 'standard' | 'full';
export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'cancelled' | 'expired';
export type BillingCycle = 'monthly' | 'annual';

export interface CompanySubscription {
  id: string;
  company_id: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  billing_cycle: BillingCycle;
  currency: string;
  amount: number;
  trial_start_at: string | null;
  trial_end_at: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  cancelled_at: string | null;
  provider: string | null;
  provider_customer_id: string | null;
  provider_subscription_id: string | null;
}

export const SUBSCRIPTION_PLANS = {
  starter: {
    name: 'Starter',
    description: 'Simple invoicing, expenses, customers, suppliers and basic reports.',
  },
  standard: {
    name: 'Standard',
    description: 'Core accounting plus inventory, banking, reconciliation and management reports.',
  },
  full: {
    name: 'Full',
    description: 'Complete SifoBooks accounting with ledgers, journals, controls, compliance and advanced reporting.',
  },
} as const;

export async function getCompanySubscription(companyId: string): Promise<CompanySubscription | null> {
  const { data, error } = await supabase
    .from('company_subscriptions')
    .select('*')
    .eq('company_id', companyId)
    .maybeSingle();

  if (error) throw error;
  return data as CompanySubscription | null;
}

export function subscriptionIsUsable(subscription: CompanySubscription | null): boolean {
  if (!subscription) return false;
  if (subscription.status === 'active') return true;
  if (subscription.status === 'trialing') {
    return !subscription.trial_end_at || new Date(subscription.trial_end_at).getTime() > Date.now();
  }
  return false;
}

export function subscriptionPlanToAccountingLevel(plan: SubscriptionPlan) {
  return plan;
}
