export default async function handler(req, res) {
  // CORS so the Shopify Thank-You page can call this
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { order_number, currency, total_amount, buyer_email, description } = req.body || {};

    if (!order_number || !currency || !total_amount || !buyer_email) {
      return res.status(400).json({
        error: 'Missing fields',
        need: ['order_number', 'currency (usd/eur)', 'total_amount', 'buyer_email']
      });
    }

    const base   = process.env.ESCROW_API_BASE || 'https://api.escrow.com/2017-09-01';
    const user   = process.env.ESCROW_API_USER;   // <- your Escrow login email
    const apiKey = process.env.ESCROW_API_KEY;    // <- your Escrow API key
    const seller = process.env.SELLER_EMAIL;

    if (!user || !apiKey || !seller) {
      return res.status(500).json({
        error: 'Server missing env vars',
        need: ['ESCROW_API_USER', 'ESCROW_API_KEY', 'SELLER_EMAIL']
      });
    }

    // HTTP Basic Auth: username=email, password=apiKey
    const auth = Buffer.from(`${user}:${apiKey}`).toString('base64');

    const payload = {
      currency: String(currency).toLowerCase(),
      description: description || `Order #${order_number}`,
      parties: [
        { role: 'buyer',  customer: buyer_email },
        { role: 'seller', customer: seller }
      ],
      items: [{
        description: description || `Order #${order_number}`,
        quantity: 1,
        inspection_period: 3 * 24 * 3600, // 3 days
        schedule: [{
          amount: Number(total_amount),
          payer_customer: buyer_email,
          beneficiary_customer: seller
        }]
      }]
    };

    // 1) Create transaction
    const trxRes = await fetch(`${base}/transaction`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`
      },
      body: JSON.stringify(payload)
    });

    const trx = await trxRes.json().catch(() => ({}));
    if (!trxRes.ok) {
      return res.status(trxRes.status || 500).json({
        error: 'Escrow transaction create failed',
        details: trx
      });
    }

    // 2) Get landing page if not present
    let landing_page = trx.landing_page;
    if (!landing_page) {
      const linkRes = await fetch(`${base}/transaction/${trx.id}/web_link/pay`, {
        headers: { 'Authorization': `Basic ${auth}` }
      });
      const linkData = await linkRes.json().catch(() => ({}));
      if (!linkRes.ok) {
        return res.status(linkRes.status || 500).json({
          error: 'Escrow link fetch failed',
          details: linkData
        });
      }
      landing_page = linkData.landing_page;
    }

    return res.status(200).json({ escrow_id: trx.id, landing_page });
  } catch (err) {
    console.error('Escrow create error:', err);
    return res.status(500).json({ error: 'Failed to create Escrow transaction', details: String(err) });
  }
}
