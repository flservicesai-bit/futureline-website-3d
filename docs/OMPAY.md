# Card payments with OMPay

Paid courses are paid by card through OMPay's **bank-hosted payment page**.
It is the only payment method: bank transfer was retired when this went in.
The card details are entered on OMPay's own page, never on ours, so this site
stays out of PCI card-data scope.

Bank-transfer requests made before the switch keep working: they still show
as awaiting approval for the learner and still have Approve / Reject in
Admin → Orders. The bank details under Admin → Brand are no longer shown
anywhere.

## How a payment flows

1. The learner clicks **Pay by Card** on a course page. `POST /api/checkout`
   with `paymentMethod: "OMPAY"` creates a `PENDING` order with a fresh
   `gatewayReference` (`FL-…`) and registers it with OMPay
   (`POST /transactions/bank-hosted`).
2. The browser goes to OMPay's `redirect_url`. The learner pays there
   (3-D Secure happens on OMPay's side).
3. OMPay sends the learner to `/api/payments/ompay/return`. That URL carries
   no trustworthy status, so the route asks OMPay itself
   (`POST /transactions/inquiry`, using the transaction id we stored).
   - `SUCCESSFUL`: the order becomes `COMPLETED`, the learner is enrolled, the
     enrolment email goes out, and the learner lands on the course.
   - A failure status: the order becomes `FAILED` and the course page says so.
   - Anything else: the order stays `PENDING` and the course page says
     "still confirming".
4. OMPay sends **no webhooks**. Orders whose learner never came back are
   settled by:
   - the course page, the next time that learner opens it,
   - a new card attempt for the same course (so nobody pays twice), and
   - the hourly reconcile job (below).

   Card orders still unresolved after 7 days are closed as `FAILED` /
   `EXPIRED`.

Code: `src/lib/ompay.ts` (API client), `src/lib/ompay-orders.ts` (settling),
`src/app/api/checkout/route.ts`, `src/app/api/payments/ompay/*`.

In **Admin → Orders**, card orders show as "Card (OMPay)" with their
reference. They have **Check status** instead of Approve/Reject, because only
OMPay decides whether a card payment went through.

## Server setup (once)

Steps 1, 2 and 4 were done on 25 November 2026 for the futureline.ai VPS
(38.54.116.46). The `.env` from before is kept as
`/opt/futureline/.env.bak-20261125-pre-ompay`.

1. **Whitelist the server's IP in OMPay.** Merchant portal → Developer →
   IP Whitelisting → add the VPS's public IP. Production keys refuse every
   other address with `403 IP_NOT_ALLOWED`.
2. **Add the secrets to `/opt/futureline/.env`** (never to git):

   ```bash
   OMPAY_API_KEY="…"
   OMPAY_API_SECRET="…"
   OMPAY_ENV="production"
   OMPAY_RECONCILE_SECRET="…"   # openssl rand -hex 32
   ```

3. **Deploy.** `deploy.sh` runs `prisma db push`, which adds the four new
   nullable `Order` columns (`gatewayReference`, `gatewayTxnId`,
   `gatewayStatus`, `paidAt`). It's additive, so existing orders are untouched.
4. **The hourly reconcile job.** The VPS has no `cron`, so a systemd timer
   runs it: `futureline-ompay-reconcile.timer` (hourly) starts
   `futureline-ompay-reconcile.service`, which runs
   `/usr/local/bin/futureline-ompay-reconcile`. That script reads
   `OMPAY_RECONCILE_SECRET` from `/opt/futureline/.env` and POSTs to
   `http://127.0.0.1:5000/api/payments/ompay/reconcile`. Check it with:

   ```bash
   systemctl list-timers futureline-ompay-reconcile.timer
   ```

   ```bash
   journalctl -u futureline-ompay-reconcile -n 20
   ```

   Each run logs one line, e.g. `HTTP 200 {"checked":0,"paid":0,...}`.
   Before this code is deployed the endpoint doesn't exist yet, so runs log
   `HTTP 404` and show as failed; that stops at the first deploy.

5. **Make one small real payment** on a cheap course and check that it lands
   on the course and shows `COMPLETED` in Admin → Orders. Refund it from the
   OMPay merchant portal.

## Errors you may see in the logs

| OMPay error | Meaning | Fix |
|---|---|---|
| `IP_NOT_ALLOWED` (403) | Request came from an IP that isn't whitelisted | Whitelist the server IP (step 1) |
| `INVALID_CREDENTIALS` (401) | Wrong key pair, or sandbox keys used against production | Check `OMPAY_ENV` matches the keys |
| `MERCHANT_CAPABILITY_DISABLED` (402) | The bank-hosted flow isn't enabled on the account | Ask OMPay to enable it |
| `DUPLICATE_ENTRY` (409) | A reference was reused | Shouldn't happen: every attempt gets a new one |

When a call fails, the learner sees "Card payment is unavailable right now"
and the order is closed as `FAILED`; they can try again. With no keys set at
all, the course page shows the same message and a disabled Pay by Card button.

## Testing locally without real money

The production keys only work from the whitelisted server, so local testing
uses a stand-in for OMPay's API with a fake payment page (Pay / Decline):

```bash
node scripts/ompay-mock.mjs
```

```bash
OMPAY_BASE_URL=http://127.0.0.1:5199/api/v1 OMPAY_API_KEY=mock-key OMPAY_API_SECRET=mock-secret npx next dev -p 3456
```

`POST http://127.0.0.1:5199/pay/<transaction id>/approve-silent` marks a
payment paid without sending the browser back, to simulate a closed tab.
`GET http://127.0.0.1:5199/__log` shows every call the site made.

## Not built yet

- Refunds from Admin (OMPay supports `POST /transactions/{id}/refund`); refund
  in the OMPay portal for now.
- Sandbox testing: these keys are production keys. For a sandbox run, get a
  sandbox key pair from OMPay and set `OMPAY_ENV="sandbox"`. In sandbox,
  amounts ending in `00` are declined on purpose.
