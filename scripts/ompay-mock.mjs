// Local stand-in for OMPay's TruePay API, for testing checkout without real
// money. Implements the calls lib/ompay.ts makes, with the same envelope
// ({ success, data } / { success:false, error, message }), plus a fake hosted
// payment page with Pay / Decline buttons. Test-only: never deployed or imported.
//   node scripts/ompay-mock.mjs   (listens on 127.0.0.1:5199; see docs/OMPAY.md)
import http from 'node:http';
import { randomUUID } from 'node:crypto';

const PORT = Number(process.env.MOCK_PORT || 5199);
const KEY = 'mock-key';
const SECRET = 'mock-secret';
const txns = new Map(); // id -> txn
const log = [];

const json = (res, code, body) => {
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
};
const readBody = (req) =>
  new Promise((resolve) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => resolve(raw));
  });

http
  .createServer(async (req, res) => {
    const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
    const raw = await readBody(req);
    let body = {};
    try { body = raw ? JSON.parse(raw) : {}; } catch { body = { _raw: raw }; }

    if (url.pathname.startsWith('/api/v1/')) {
      const authOk = req.headers['ompay-api-key'] === KEY && req.headers['ompay-api-secret'] === SECRET;
      log.push({ at: new Date().toISOString(), method: req.method, path: url.pathname, authOk, body });
      if (!authOk) return json(res, 401, { success: false, error: 'INVALID_CREDENTIALS', message: 'The supplied API key or secret is not valid.' });

      if (req.method === 'POST' && url.pathname === '/api/v1/transactions/bank-hosted') {
        const { amount, currency, reference_number, return_url } = body;
        const details = [];
        if (typeof amount !== 'number' || !(amount > 0)) details.push({ field: 'amount', message: 'must be a positive number' });
        if (currency !== 'OMR') details.push({ field: 'currency', message: 'must be OMR' });
        if (!reference_number) details.push({ field: 'reference_number', message: 'required' });
        if (!return_url) details.push({ field: 'return_url', message: 'required' });
        if (details.length) return json(res, 422, { success: false, error: 'VALIDATION_ERROR', message: 'Invalid request', details });
        if ([...txns.values()].some((t) => t.reference_number === reference_number)) {
          return json(res, 409, { success: false, error: 'DUPLICATE_ENTRY', message: 'reference_number already used' });
        }
        const id = `TX${randomUUID().replace(/-/g, '').slice(0, 14).toUpperCase()}`;
        txns.set(id, { id, amount, currency, reference_number, return_url, status: 'PENDING' });
        return json(res, 201, { success: true, data: { transaction_id: id, status: 'PENDING', redirect_url: `http://127.0.0.1:${PORT}/pay/${id}` } });
      }

      if (req.method === 'POST' && url.pathname === '/api/v1/transactions/inquiry') {
        const t = body.transaction_id
          ? txns.get(body.transaction_id)
          : [...txns.values()].find((x) => x.reference_number === body.reference_number);
        if (!t) return json(res, 404, { success: false, error: 'NOT_FOUND', message: 'Transaction not found' });
        return json(res, 200, { success: true, data: { status: t.status, transaction_id: t.id, rrn: t.status === 'SUCCESSFUL' ? '123456789012' : null, error_message: t.status === 'FAILED' ? 'Do not honour' : null } });
      }
      return json(res, 404, { success: false, error: 'NOT_FOUND', message: 'No such endpoint' });
    }

    // Fake hosted payment page.
    const m = url.pathname.match(/^\/pay\/([A-Z0-9]+)(?:\/(approve|decline|approve-silent))?$/);
    if (m) {
      const t = txns.get(m[1]);
      if (!t) { res.writeHead(404); return res.end('unknown transaction'); }
      if (req.method === 'POST' && m[2]) {
        t.status = m[2] === 'decline' ? 'FAILED' : 'SUCCESSFUL';
        if (m[2] === 'approve-silent') return json(res, 200, { ok: true, status: t.status });
        const back = new URL(t.return_url);
        back.searchParams.set('transaction_id', t.id);
        back.searchParams.set('reference_number', t.reference_number);
        res.writeHead(302, { Location: back.toString() });
        return res.end();
      }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(`<!doctype html><title>Mock OMPay</title>
<body style="font-family:system-ui;max-width:420px;margin:60px auto">
<h1>Mock OMPay payment page</h1>
<p>Reference <b id="ref">${t.reference_number}</b></p>
<p>Amount <b id="amount">${t.amount.toFixed(3)} ${t.currency}</b></p>
<form method="post" action="/pay/${t.id}/approve"><button id="pay">Pay</button></form>
<form method="post" action="/pay/${t.id}/decline"><button id="decline">Decline</button></form>
</body>`);
    }

    if (url.pathname === '/__log') return json(res, 200, { log, txns: [...txns.values()] });
    res.writeHead(404);
    res.end('not found');
  })
  .listen(PORT, '127.0.0.1', () => console.log(`mock OMPay listening on http://127.0.0.1:${PORT}`));
