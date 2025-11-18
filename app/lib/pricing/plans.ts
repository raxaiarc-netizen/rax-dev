/**
 * Shared pricing configuration used across the app
 * This ensures consistency between the pricing page and settings dialog
 */

export interface PricingPlan {
  id: string;
  name: string;
  price: string;
  priceAmount: number;
  period: string;
  description: string;
  credits: {
    monthly?: number;
    daily: number;
    description: string;
  };
  features: string[];
  popular?: boolean;
  cta: string;
  productId?: string;
}

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    priceAmount: 0,
    period: 'forever',
    description: 'Perfect for trying out RAX.AI',
    credits: {
      daily: 5,
      description: '5 AI message credits per day',
    },
    features: [
      '5 AI message credits per day',
      'Credits reset daily at midnight UTC',
      'Access to all AI models',
      'Basic support',
    ],
    cta: 'Current Plan',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$19.99',
    priceAmount: 19.99,
    period: 'per month',
    description: 'For power users and professionals',
    credits: {
      monthly: 100,
      daily: 5,
      description: '100 AI message credits every month + 5 free daily credits',
    },
    features: [
      '100 AI message credits every month',
      'Plus 5 free daily credits (resets daily)',
      'Access to all AI models',
      'Priority support',
      'Early access to new features',
    ],
    popular: true,
    cta: 'Subscribe Now',
    productId: 'pro_subscription',
  },
];

/**
 * Get plan by ID
 */
export function getPlanById(planId: string): PricingPlan | undefined {
  return PRICING_PLANS.find((plan) => plan.id === planId);
}

/**
 * Get the display name for a plan
 */
export function getPlanName(planId?: string): string {
  if (!planId) {
    return 'Free';
  }
  return getPlanById(planId)?.name || 'Free';
}

/**
 * Check if a plan is the current plan
 */
export function isCurrentPlan(planId: string, userPlan?: string): boolean {
  const currentPlan = userPlan || 'free';
  return planId === currentPlan;
}

