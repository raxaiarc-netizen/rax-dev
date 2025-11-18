import type { MetaFunction } from '@remix-run/cloudflare';
import { useState } from 'react';
import { Button } from '~/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/Card';
import { PRICING_PLANS } from '~/lib/pricing/plans';

export const meta: MetaFunction = () => {
  return [{ title: 'Pricing - RAX.AI' }, { name: 'description', content: 'Get more credits for RAX.AI' }];
};

export default function PricingPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [processingPlanId, setProcessingPlanId] = useState<string | null>(null);

  const handleBuyCredits = async (productId?: string) => {
    if (!productId) {
      return;
    }

    try {
      setIsLoading(true);
      setProcessingPlanId(productId);
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
    <div className="min-h-screen bg-rax-elements-background p-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
          <p className="text-lg text-rax-elements-textSecondary">
            Get more AI message credits to power your projects
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {PRICING_PLANS.map((plan) => {
            const isProcessing = processingPlanId === plan.productId;
            const isFree = plan.id === 'free';
            
            return (
              <Card
                key={plan.id}
                className={plan.popular ? 'relative border-2 border-accent' : 'relative'}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-accent text-white px-4 py-1 rounded-full text-sm font-medium">
                    Most Popular
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-rax-elements-textSecondary">
                      /{plan.period === 'forever' ? 'day' : plan.period.replace('per ', '')}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <div className="i-ph:check-circle-fill text-green-500 mt-0.5" />
                        <span className={index === 0 && !isFree ? 'font-medium' : ''}>
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {isFree ? (
                    <Button variant="outline" className="w-full" disabled>
                      Current Plan
                    </Button>
                  ) : (
                    <Button
                      className="w-full"
                      onClick={() => handleBuyCredits(plan.productId)}
                      disabled={isLoading}
                    >
                      {isProcessing ? (
                        <>
                          <div className="i-ph:spinner animate-spin mr-2" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <div className="i-ph:lightning-fill mr-2" />
                          {plan.cta}
                        </>
                      )}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* FAQ */}
        <div className="mt-16 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h2>
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold mb-2">What are credits?</h3>
              <p className="text-rax-elements-textSecondary">
                Each credit equals one AI message. When you send a message to the AI, 1 credit is deducted from your
                balance.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Do unused credits roll over?</h3>
              <p className="text-rax-elements-textSecondary">
                Daily free credits (5 per day) reset at midnight UTC and don't roll over. Pro subscription credits
                remain in your account until used.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Can I cancel my subscription?</h3>
              <p className="text-rax-elements-textSecondary">
                Yes, you can cancel anytime through your Whop dashboard. You'll keep your purchased credits even after
                canceling.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">What payment methods do you accept?</h3>
              <p className="text-rax-elements-textSecondary">
                We accept all major credit cards, PayPal, and cryptocurrency through our payment processor Whop.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


