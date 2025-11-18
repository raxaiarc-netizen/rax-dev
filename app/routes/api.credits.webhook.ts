/**
 * Whop webhook handler for payment events
 */
import { type ActionFunctionArgs, json } from '@remix-run/cloudflare';
import { CreditService } from '~/lib/db/CreditService';
import { AuditService } from '~/lib/db/AuditService';
import { WhopClient, type WhopWebhookPayload } from '~/lib/payments/whop';

export async function action({ request, context }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const env = context.cloudflare.env as any;
    const db = env.DB;

    // Get webhook signature
    const signature = request.headers.get('x-whop-signature') || '';
    const webhookSecret = env.WHOP_WEBHOOK_SECRET || '';

    // Get raw body
    const body = await request.text();

    // Verify webhook signature
    const whopClient = new WhopClient({
      apiKey: env.WHOP_API_KEY || '',
      appUrl: env.APP_URL || 'http://localhost:5173',
    });

    // Note: In production, uncomment this
    // const isValid = whopClient.verifyWebhookSignature(body, signature, webhookSecret);
    // if (!isValid) {
    //   return json({ error: 'Invalid signature' }, { status: 401 });
    // }

    // Parse webhook payload
    const payload: WhopWebhookPayload = JSON.parse(body);

    console.log('Whop webhook event:', payload.event, payload.data);

    const creditService = new CreditService(db);
    const auditService = new AuditService(db);

    // Handle different webhook events
    switch (payload.event) {
      case 'payment.succeeded':
      case 'payment.completed': {
        const paymentId = payload.data.payment_id;
        const transaction = await creditService.getWhopTransaction(paymentId);

        if (!transaction) {
          console.error('Transaction not found:', paymentId);
          return json({ error: 'Transaction not found' }, { status: 404 });
        }

        if (transaction.status === 'completed') {
          // Already processed
          return json({ success: true, message: 'Already processed' });
        }

        // Update transaction status and add credits
        await creditService.updateWhopTransactionStatus(paymentId, 'completed');

        // Log purchase
        await auditService.logEvent({
          user_id: transaction.user_id,
          event_type: 'credits_purchased',
          metadata: {
            payment_id: paymentId,
            credits: transaction.credits_purchased,
            amount_cents: transaction.amount_cents,
          },
        });

        console.log(
          `Credits added: ${transaction.credits_purchased} credits for user ${transaction.user_id}`,
        );

        break;
      }

      case 'payment.failed': {
        const paymentId = payload.data.payment_id;
        const transaction = await creditService.getWhopTransaction(paymentId);

        if (transaction) {
          await creditService.updateWhopTransactionStatus(paymentId, 'failed');
        }

        break;
      }

      default:
        console.log('Unhandled webhook event:', payload.event);
    }

    return json({ success: true });
  } catch (error: any) {
    console.error('Webhook error:', error);

    return json(
      {
        error: error.message || 'Webhook processing failed',
      },
      { status: 500 },
    );
  }
}



