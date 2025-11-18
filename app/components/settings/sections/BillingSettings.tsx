import { useState } from 'react';
import { classNames } from '~/utils/classNames';
import { PRICING_PLANS, getPlanName, isCurrentPlan } from '~/lib/pricing/plans';

interface User {
  id: string;
  credits_daily: number;
  credits_purchased: number;
  credits_total: number;
  subscription_tier?: string;
}

interface BillingSettingsProps {
  user: User;
}

export function BillingSettings({ user }: BillingSettingsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [processingPlanId, setProcessingPlanId] = useState<string | null>(null);
  const currentPlan = user.subscription_tier || 'free';
  const creditsLeft = user.credits_total;
  const creditsMax = user.credits_daily + user.credits_purchased;
  const creditPercentage = creditsMax > 0 ? (creditsLeft / creditsMax) * 100 : 0;

  // Calculate reset date (next day at midnight UTC)
  const resetDate = new Date();
  resetDate.setUTCDate(resetDate.getUTCDate() + 1);
  resetDate.setUTCHours(0, 0, 0, 0);
  const resetDateStr = resetDate.toLocaleDateString('en-US', { day: 'numeric', month: 'long' });

  const handleUpgrade = async (planId: string, productId?: string) => {
    if (planId === 'free' || !productId) {
      return;
    }

    try {
      setIsLoading(true);
      setProcessingPlanId(planId);
      const token = localStorage.getItem('accessToken');

      if (!token) {
        window.location.href = '/login';
        return;
      }

      const response = await fetch('/api/credits/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          product_id: productId,
        }),
      });

      const data = (await response.json()) as { checkout_url?: string; error?: string };

      if (response.ok && data.checkout_url) {
        // Redirect to Whop checkout
        window.location.href = data.checkout_url;
      } else {
        alert(data.error || 'Failed to create checkout session');
      }
    } catch (error) {
      console.error('Purchase error:', error);
      alert('Failed to initiate purchase');
    } finally {
      setIsLoading(false);
      setProcessingPlanId(null);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl pb-8">
      {/* Current Plan Overview */}
      <div className="bg-[#0f0f0f] border border-gray-700 rounded-lg p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-white mb-1">
              Current Plan: {getPlanName(currentPlan)}
            </h3>
            <p className="text-sm text-gray-400">Manage your subscription and billing information</p>
          </div>
          <span className="px-3 py-1 text-sm font-medium bg-blue-500/20 text-blue-400 rounded-full border border-blue-500/30">
            Active
          </span>
        </div>

        {/* Credits Container */}
        <div className="bg-[#1a1a1a] border border-gray-800 rounded-lg p-5">
          {/* Credits Header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-white font-medium text-base">Credits remaining</span>
              <span 
                className="i-ph:info w-4 h-4 text-gray-500 cursor-help" 
                title="Credits reset daily at midnight UTC"
              />
            </div>
            <div className="text-gray-400">
              {creditsLeft} / {creditsMax}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="flex items-center gap-4 mb-2">
            <div className="flex-1 h-2.5 bg-[#0f0f0f] rounded-full overflow-hidden relative">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all duration-300"
                style={{ width: `${creditPercentage}%` }}
              />
            </div>
            <span className="text-white font-medium">{creditsLeft} left</span>
          </div>

          {/* Reset Date */}
          <div className="text-sm text-gray-400">
            Your {user.credits_daily} daily credits will reset on {resetDateStr}
          </div>
        </div>
      </div>

      {/* Available Plans */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Available Plans</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {PRICING_PLANS.map((plan) => {
            const isCurrent = isCurrentPlan(plan.id, currentPlan);
            const isProcessing = processingPlanId === plan.id;
            return (
              <div
                key={plan.id}
                className={classNames(
                  'bg-[#0f0f0f] rounded-lg p-6 border relative',
                  isCurrent ? 'border-blue-500 ring-2 ring-blue-500/30' : 'border-gray-700',
                  plan.popular && !isCurrent && 'border-blue-500/50',
                )}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                    Most Popular
                  </div>
                )}
                <div className="mb-4">
                  <h4 className="text-xl font-bold text-white mb-1">{plan.name}</h4>
                  <p className="text-sm text-gray-400">{plan.description}</p>
                </div>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-white">{plan.price}</span>
                  <span className="text-sm text-gray-400 ml-2">/ {plan.period}</span>
                </div>
                <div className="mb-6 p-3 bg-[#1a1a1a] rounded-lg border border-gray-800">
                  <div className="text-sm font-medium text-blue-400 mb-1">
                    {plan.credits.monthly ? `${plan.credits.monthly} monthly credits` : 'Daily credits'}
                  </div>
                  <div className="text-xs text-gray-400">{plan.credits.description}</div>
                </div>
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-gray-300">
                      <span className="i-ph:check-circle-fill w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                {isCurrent ? (
                  <button
                    disabled
                    className="w-full py-2.5 text-sm font-medium text-gray-400 bg-gray-800 rounded-lg cursor-not-allowed"
                  >
                    <span className="i-ph:check-circle-fill w-4 h-4 inline-block mr-2" />
                    Current Plan
                  </button>
                ) : (
                  <button
                    onClick={() => handleUpgrade(plan.id, plan.productId)}
                    disabled={isLoading}
                    className={classNames(
                      'w-full py-2.5 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
                      plan.popular
                        ? 'bg-blue-500 text-white hover:bg-blue-600'
                        : 'bg-[#1a1a1a] text-white border border-gray-700 hover:bg-gray-800',
                    )}
                  >
                    {isProcessing ? (
                      <>
                        <span className="i-ph:spinner animate-spin w-4 h-4 inline-block mr-2" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <span className="i-ph:lightning-fill w-4 h-4 inline-block mr-2" />
                        {plan.cta}
                      </>
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Billing History */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Billing History</h3>
        <div className="bg-[#0f0f0f] border border-gray-700 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-[#1a1a1a]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-sm text-gray-400">
                  No billing history available
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Method */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Payment Method</h3>
        <div className="bg-[#0f0f0f] border border-gray-700 rounded-lg p-6">
          <p className="text-sm text-gray-400 mb-4">No payment method on file</p>
          <button className="px-4 py-2 text-sm font-medium text-blue-400 bg-blue-500/10 border border-blue-500/30 rounded-lg hover:bg-blue-500/20 transition-colors">
            Add Payment Method
          </button>
        </div>
      </div>
    </div>
  );
}

