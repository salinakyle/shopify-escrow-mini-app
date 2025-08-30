// ───────────────────────────────────────────────────────────────
// FILE: api/escrow/webhook.js
// ───────────────────────────────────────────────────────────────
export default async function handler(req, res) {
res.setHeader('Access-Control-Allow-Origin', '*');
res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
if (req.method === 'OPTIONS') return res.status(200).end();


if (req.method !== 'POST') {
return res.status(200).json({ status: 'ok' }); // harmless for GET
}


try {
console.log('Escrow webhook event:', JSON.stringify(req.body, null, 2));
// TODO: Update your DB / send notification / tag Shopify order via Admin API if desired.
return res.status(200).json({ received: true });
} catch (e) {
console.error('Webhook error:', e);
return res.status(500).json({ error: 'Webhook processing failed' });
}
}


export const config = {
api: {
bodyParser: { sizeLimit: '1mb' }
}
};
