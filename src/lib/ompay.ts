/**
 * OMPay (TruePay API) client: the bank-hosted payment page and the status
 * inquiry. Server only: it reads the API key and secret from the environment.
 *
 * How a card payment works:
 *  1. createHostedPayment() registers the payment and returns OMPay's
 *     `redirect_url`; the customer pays on OMPay's own page (3-D Secure there).
 *  2. OMPay sends the customer back to our return URL. That redirect carries
 *     no trustworthy status, and OMPay sends no webhooks, so every outcome is
 *     confirmed server to server with inquire(). See lib/ompay-orders.ts.
 *
 * Environment:
 *   OMPAY_API_KEY, OMPAY_API_SECRET  merchant portal → Developer (required)
 *   OMPAY_ENV                        "production" (default) or "sandbox"
 *   OMPAY_BASE_URL                   optional override, e.g. a local mock in tests
 *
 * Production keys only work from whitelisted server IPs (merchant portal →
 * Developer → IP Whitelisting). Anything else gets 403 IP_NOT_ALLOWED.
 */

const BASE_URLS = {
  production: 'https://api.truepay.ompay.om/api/v1',
  sandbox: 'https://api.sandbox.truepay.ompay.om/api/v1',
} as const;

const TIMEOUT_MS = 45_000;

export class OmpayError extends Error {
  constructor(
    message: string,
    /** OMPay's error code, e.g. IP_NOT_ALLOWED, DUPLICATE_ENTRY, MERCHANT_CAPABILITY_DISABLED. */
    readonly code?: string,
    readonly httpStatus?: number,
  ) {
    super(message);
    this.name = 'OmpayError';
  }
}

/** True when both credentials are set, so the card button can be offered. */
export function ompayConfigured(): boolean {
  return !!process.env.OMPAY_API_KEY?.trim() && !!process.env.OMPAY_API_SECRET?.trim();
}

function settings() {
  const apiKey = process.env.OMPAY_API_KEY?.trim();
  const apiSecret = process.env.OMPAY_API_SECRET?.trim();
  if (!apiKey || !apiSecret) {
    throw new OmpayError('OMPay credentials are not configured', 'NOT_CONFIGURED');
  }
  const env = process.env.OMPAY_ENV === 'sandbox' ? 'sandbox' : 'production';
  const baseUrl = (process.env.OMPAY_BASE_URL?.trim() || BASE_URLS[env]).replace(/\/+$/, '');
  return { apiKey, apiSecret, baseUrl };
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const { apiKey, apiSecret, baseUrl } = settings();
  let res: Response;
  try {
    res = await fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'OMPAY-API-Key': apiKey,
        'OMPAY-API-Secret': apiSecret,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
      cache: 'no-store',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    throw new OmpayError(`OMPay unreachable: ${(err as Error).message}`, 'NETWORK');
  }

  let json: { success?: boolean; data?: T; error?: string; message?: string } | null = null;
  try {
    json = await res.json();
  } catch {
    // Non-JSON body (proxy error page and the like): handled below.
  }
  if (!res.ok || !json?.success) {
    throw new OmpayError(
      json?.message || `OMPay request failed with HTTP ${res.status}`,
      json?.error,
      res.status,
    );
  }
  return (json.data ?? {}) as T;
}

/** OMR has three decimals (baisa). OMPay takes the amount as a decimal number. */
export function toOmpayAmount(amount: number): number {
  return Math.round(amount * 1000) / 1000;
}

export type OmpayOutcome = 'paid' | 'failed' | 'pending';

/**
 * Only SUCCESSFUL counts as paid. A few explicit failure words count as
 * failed. Anything else (PENDING, PROCESSING, an unknown word) stays pending
 * and is asked about again later, so an unexpected status never enrols
 * someone who did not pay, and never fails someone who did.
 */
const FAILED_STATUSES = new Set(['FAILED', 'DECLINED', 'REJECTED', 'CANCELLED', 'CANCELED', 'EXPIRED']);

export function outcomeOf(status: string | undefined | null): OmpayOutcome {
  const s = (status || '').toUpperCase();
  if (s === 'SUCCESSFUL') return 'paid';
  if (FAILED_STATUSES.has(s)) return 'failed';
  return 'pending';
}

export async function createHostedPayment(input: {
  amount: number;
  currency: 'OMR';
  reference: string;
  returnUrl: string;
}): Promise<{ transactionId: string; status: string; redirectUrl: string | null }> {
  const data = await post<{ transaction_id?: string; status?: string; redirect_url?: string }>(
    '/transactions/bank-hosted',
    {
      amount: toOmpayAmount(input.amount),
      currency: input.currency,
      reference_number: input.reference,
      return_url: input.returnUrl,
    },
  );
  if (!data.transaction_id) {
    throw new OmpayError('OMPay did not return a transaction_id', 'BAD_RESPONSE');
  }
  return {
    transactionId: String(data.transaction_id),
    status: (data.status || '').toUpperCase(),
    redirectUrl: data.redirect_url || null,
  };
}

export async function inquire(
  by: { transactionId: string } | { reference: string },
): Promise<{ status: string; transactionId: string | null; rrn: string | null; errorMessage: string | null }> {
  const body =
    'transactionId' in by ? { transaction_id: by.transactionId } : { reference_number: by.reference };
  const data = await post<{
    status?: string;
    transaction_id?: string;
    rrn?: string;
    error_message?: string;
  }>('/transactions/inquiry', body);
  return {
    status: (data.status || '').toUpperCase(),
    transactionId: data.transaction_id ? String(data.transaction_id) : null,
    rrn: data.rrn || null,
    errorMessage: data.error_message || null,
  };
}
