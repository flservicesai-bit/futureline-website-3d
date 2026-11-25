import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { reconcileOmpayOrders } from '@/lib/ompay-orders';

/**
 * Hourly sweep for card payments whose customer never came back to the site
 * (closed the tab, lost signal). OMPay sends no webhooks, so without this a
 * paid order would wait until the learner next opened the course page.
 *
 * Called by cron on the server, authorised with OMPAY_RECONCILE_SECRET:
 *   curl -fsS -X POST -H "Authorization: Bearer $OMPAY_RECONCILE_SECRET" \
 *     http://127.0.0.1:5000/api/payments/ompay/reconcile
 */
function authorised(req: Request) {
  const secret = process.env.OMPAY_RECONCILE_SECRET?.trim();
  if (!secret) return false;
  const given = Buffer.from(req.headers.get('authorization') || '');
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export async function POST(req: Request) {
  if (!authorised(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const tally = await reconcileOmpayOrders();
  console.log('[OMPay] Reconciliation', tally);
  return NextResponse.json(tally);
}
