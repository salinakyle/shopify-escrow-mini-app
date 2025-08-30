// ───────────────────────────────────────────────────────────────
payer_customer: buyer_email,
beneficiary_customer: seller
}
]
}
]
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
const trx = await trxRes.json();
if (!trxRes.ok) {
return res.status(trxRes.status).json({ error: 'Escrow transaction create failed', details: trx });
}


// 2) Get landing page link if not returned inline
let landing_page = trx.landing_page;
if (!landing_page) {
const linkRes = await fetch(`${base}/transaction/${trx.id}/web_link/pay`, {
headers: { 'Authorization': `Basic ${auth}` }
});
const linkData = await linkRes.json();
if (!linkRes.ok) {
return res.status(linkRes.status).json({ error: 'Escrow link fetch failed', details: linkData });
}
landing_page = linkData.landing_page;
}


return res.status(200).json({ escrow_id: trx.id, landing_page });
} catch (err) {
console.error('Escrow create error:', err);
return res.status(500).json({ error: 'Failed to create Escrow transaction', details: err?.message || String(err) });
}
}
