/**
 * Initialize credit purchase with Whop endpoint
 */
import { type ActionFunctionArgs, json } from '@remix-run/cloudflare';
import { CreditService } from '~/lib/db/CreditService';
import { getSessionFromRequest } from '~/lib/auth/session.server';
import { WhopClient, getWhopProduct } from '~/lib/payments/whop';

export async function action({ request, context }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const env = context.cloudflare.env as any;
    const db = env.DB;

    // Get current session
    const sessionData = await getSessionFromRequest(request, db, env.JWT_SECRET);

    if (!sessionData) {
      return json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { user } = sessionData;
    const body = (await request.json()) as { product_id?: string };
    const { product_id } = body;

    if (!product_id || product_id !== 'pro_subscription') {
      return json({ error: 'Invalid product_id. Use "pro_subscription"' }, { status: 400 });
    }

    // Get Whop product
    const product = getWhopProduct(product_id);

    if (!product) {
      return json({ error: 'Product not found' }, { status: 400 });
    }

    // Create Whop client
    const whopClient = new WhopClient({
      apiKey: env.WHOP_API_KEY || '',
      appUrl: env.APP_URL || 'http://localhost:5173',
    });

    // Create checkout session
    const checkoutSession = await whopClient.createCheckoutSession({
      userId: user.id,
      creditsPack: product.credits,
      amountCents: product.price_cents,
    });

    // Note: Transaction will be created by webhook after successful payment
    // For subscription, credits are added monthly via webhook

    return json({
      success: true,
      checkout_url: checkoutSession.checkout_url,
      product_id,
      credits: product.credits,
      price: `$${(product.price_cents / 100).toFixed(2)}`,
      billing_period: product.billing_period,
    });
  } catch (error: any) {
    console.error('Purchase credits error:', error);

    return json(
      {
        error: error.message || 'Failed to initialize credit purchase',
      },
      { status: 500 },
    );
  }
}


