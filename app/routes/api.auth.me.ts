/**
 * Get current authenticated user endpoint
 * OPTIMIZED: Reduced DB queries, added caching headers
 */
import { type LoaderFunctionArgs, json } from '@remix-run/cloudflare';
import { UserService } from '~/lib/db/UserService';
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

    // Check and reset daily credits if needed (only DB write, no extra read)
    await creditService.checkAndResetDailyCredits(user.id);

    // User data already has credit info from optimized query, so only fetch if needed for reset date
    const creditBalance = await creditService.getCreditBalance(user.id);

    const responseData = {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar_url: user.avatar_url,
        email_verified: user.email_verified === 1,
        created_at: user.created_at,
        credits_daily: user.daily_credits,
        credits_purchased: user.purchased_credits,
        credits_total: user.total_credits,
      },
      credits: creditBalance,
    };

    // Add HTTP cache headers to reduce repeated requests
    // Cache for 60 seconds with stale-while-revalidate for 300 seconds
    return json(responseData, {
      headers: {
        'Cache-Control': 'private, max-age=60, stale-while-revalidate=300',
        'CDN-Cache-Control': 'private, max-age=60',
      },
    });
  } catch (error: any) {
    console.error('Get user error:', error);

    return json(
      {
        error: error.message || 'Failed to get user',
      },
      { status: 500 },
    );
  }
}



