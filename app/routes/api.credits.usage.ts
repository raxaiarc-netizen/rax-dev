/**
 * Get user's credit usage history endpoint
 */
import { type LoaderFunctionArgs, json } from '@remix-run/cloudflare';
import { CreditService } from '~/lib/db/CreditService';
import { getSessionFromRequest } from '~/lib/auth/session.server';

export async function loader({ request, context }: LoaderFunctionArgs) {
  try {
    const env = context.cloudflare.env as any;
    const db = env.DB;

    // Get current session
    const sessionData = await getSessionFromRequest(request, db, env.JWT_SECRET);

    if (!sessionData) {
      return json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { user } = sessionData;
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '50', 10);

    const creditService = new CreditService(db);

    // Get usage history
    const history = await creditService.getCreditUsageHistory(user.id, limit);

    return json({
      success: true,
      usage: history.map((item) => ({
        id: item.id,
        credits_deducted: item.credits_deducted,
        credit_type_used: item.credit_type_used,
        action_type: item.action_type,
        metadata: item.metadata ? JSON.parse(item.metadata) : null,
        created_at: item.created_at,
      })),
    });
  } catch (error: any) {
    console.error('Get credit usage error:', error);

    return json(
      {
        error: error.message || 'Failed to get credit usage',
      },
      { status: 500 },
    );
  }
}



