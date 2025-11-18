/**
 * Whop payment integration
 */

export interface WhopConfig {
  apiKey: string;
  appUrl: string;
}

export interface WhopCheckoutSession {
  checkout_url: string;
  payment_id: string;
}

export interface WhopWebhookPayload {
  event: string;
  data: {
    payment_id: string;
    user_id?: string;
    amount: number;
    currency: string;
    status: string;
    metadata?: Record<string, any>;
  };
}

export class WhopClient {
  private config: WhopConfig;

  constructor(config: WhopConfig) {
    this.config = config;
  }

  /**
   * Create a checkout session for credit purchase
   * For monthly subscription, redirects to Whop product page
   */
  async createCheckoutSession(params: {
    userId: string;
    creditsPack: number;
    amountCents: number;
    successUrl?: string;
    cancelUrl?: string;
  }): Promise<WhopCheckoutSession> {
    // For monthly subscription, redirect to Whop product page
    // with user metadata attached
    const product = WHOP_PRODUCTS.pro_subscription;
    
    // Add user_id as query parameter for tracking
    // Whop will use this in webhook payload to identify the user
    const checkoutUrl = `${product.whop_url}?metadata=${encodeURIComponent(
      JSON.stringify({ 
        user_id: params.userId,
        app_url: this.config.appUrl 
      })
    )}`;

    return {
      checkout_url: checkoutUrl,
      payment_id: `temp_${Date.now()}`, // Actual payment_id comes from webhook
    };
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
    // Note: Implement signature verification based on Whop's documentation
    // This is a placeholder - use actual Whop webhook verification
    
    // Example using HMAC SHA256:
    // const encoder = new TextEncoder();
    // const key = await crypto.subtle.importKey(
    //   'raw',
    //   encoder.encode(secret),
    //   { name: 'HMAC', hash: 'SHA-256' },
    //   false,
    //   ['sign']
    // );
    // const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
    // const computedSignature = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)));
    // return computedSignature === signature;

    return true; // Placeholder
  }

  /**
   * Get payment details
   */
  async getPayment(paymentId: string): Promise<any> {
    const response = await fetch(`https://api.whop.com/v1/payments/${paymentId}`, {
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Whop API error: ${error}`);
    }

    return await response.json();
  }
}

/**
 * Whop product configurations
 */
export const WHOP_PRODUCTS = {
  pro_subscription: {
    id: 'prod_oids0A9Ps9IKT',
    whop_url: 'https://whop.com/arcccc/rax-ai-pro-credits',
    name: 'RAX.AI Pro Credits',
    credits: 100,
    price_cents: 1999, // $19.99/month
    billing_period: 'monthly',
    description: 'Get 100 AI message credits every month',
  },
};

/**
 * Get Whop product by ID
 */
export function getWhopProduct(productId: string) {
  return WHOP_PRODUCTS[productId as keyof typeof WHOP_PRODUCTS];
}


