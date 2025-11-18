/**
 * Get user's credit balance endpoint
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
    const creditService = new CreditService(db);

    // Check and reset daily credits if needed
    await creditService.checkAndResetDailyCredits(user.id);

    // Get credit balance
    const balance = await creditService.getCreditBalance(user.id);

    return json({
      success: true,
      balance,
    });
  } catch (error: any) {
    console.error('Get credit balance error:', error);

    return json(
      {
        error: error.message || 'Failed to get credit balance',
      },
      { status: 500 },
    );
  }
}



