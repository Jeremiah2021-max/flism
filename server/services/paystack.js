const https = require('https');

function paystackRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'api.paystack.co',
      path,
      method,
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    };
    const req = https.request(options, (res) => {
      let raw = '';
      res.on('data', (chunk) => (raw += chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(raw));
        } catch (e) {
          reject(new Error('Failed to parse Paystack response'));
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function initializePayment(amount, email, reference, metadata = {}) {
  try {
    const response = await paystackRequest('POST', '/transaction/initialize', {
      amount: Math.round(amount * 100),
      email,
      reference,
      metadata,
      callback_url: `${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000'}/api/transactions/verify/${reference}`,
    });
    return response;
  } catch (error) {
    console.error('Paystack payment initialization error:', error);
    throw new Error('Failed to initialize payment');
  }
}

async function verifyPayment(reference) {
  try {
    const response = await paystackRequest('GET', `/transaction/verify/${encodeURIComponent(reference)}`);
    return response;
  } catch (error) {
    console.error('Paystack payment verification error:', error);
    throw new Error('Failed to verify payment');
  }
}

async function initiateTransfer(transferData) {
  try {
    const response = await paystackRequest('POST', '/transfer', {
      source: 'balance',
      amount: Math.round(transferData.amount * 100),
      recipient: transferData.recipient_code,
      reference: transferData.reference,
      reason: transferData.reason || 'Loan disbursement',
    });
    return response;
  } catch (error) {
    console.error('Paystack transfer initiation error:', error);
    throw new Error('Failed to initiate transfer');
  }
}

async function createRecipient(recipientData) {
  try {
    const response = await paystackRequest('POST', '/transferrecipient', recipientData);
    return response;
  } catch (error) {
    console.error('Paystack recipient creation error:', error);
    throw new Error('Failed to create transfer recipient');
  }
}

async function getBanks() {
  try {
    const response = await paystackRequest('GET', '/bank?country=ghana&perPage=100');
    return response;
  } catch (error) {
    console.error('Paystack banks list error:', error);
    throw new Error('Failed to fetch banks list');
  }
}

async function resolveAccount(accountNumber, bankCode) {
  try {
    const response = await paystackRequest(
      'GET',
      `/bank/resolve?account_number=${encodeURIComponent(accountNumber)}&bank_code=${encodeURIComponent(bankCode)}`
    );
    return response;
  } catch (error) {
    console.error('Paystack account resolution error:', error);
    throw new Error('Failed to resolve account');
  }
}

/* Ghana MoMo provider codes — Charge API (collection) vs Transfer API (disbursement) */
const MOMO_TRANSFER_BANK_CODES = {
  'MTN MoMo':         'MTN',
  'mtn':              'MTN',
  'Vodafone Cash':    'VOD',
  'vod':              'VOD',
  'AirtelTigo Money': 'ATL',
  'tgo':              'ATL',
};

/**
 * Create a Paystack Mobile Money transfer recipient (Ghana).
 * Required before initiating a MoMo disbursement transfer.
 */
async function createMoMoRecipient({ name, phone, provider, currency = 'GHS' }) {
  const bankCode = MOMO_TRANSFER_BANK_CODES[provider] || 'MTN';
  const response = await paystackRequest('POST', '/transferrecipient', {
    type: 'mobile_money',
    name,
    account_number: phone,
    bank_code: bankCode,
    currency,
  });
  return response;
}

const MOMO_PROVIDERS = {
  'MTN MoMo':        'mtn',
  'mtn':             'mtn',
  'Vodafone Cash':   'vod',
  'vod':             'vod',
  'AirtelTigo Money':'tgo',
  'tgo':             'tgo',
};

/**
 * Initiate a Paystack Mobile Money charge (Ghana).
 * Paystack sends a USSD/push prompt to the user's phone.
 */
async function chargeMobileMoney({ amount, email, phone, provider, reference, metadata = {} }) {
  const providerCode = MOMO_PROVIDERS[provider] || 'mtn';
  const response = await paystackRequest('POST', '/charge', {
    amount: Math.round(amount * 100),
    email,
    currency: 'GHS',
    reference,
    mobile_money: { phone, provider: providerCode },
    metadata,
  });
  return response;
}

/**
 * Check the status of a Paystack charge by reference.
 * Statuses: 'pending', 'pay_offline', 'success', 'failed'
 */
async function checkCharge(reference) {
  try {
    const response = await paystackRequest('GET', `/charge/${encodeURIComponent(reference)}`);
    return response;
  } catch (error) {
    console.error('Paystack charge check error:', error);
    throw new Error('Failed to check charge status');
  }
}

module.exports = {
  initializePayment,
  verifyPayment,
  initiateTransfer,
  createRecipient,
  createMoMoRecipient,
  getBanks,
  resolveAccount,
  chargeMobileMoney,
  checkCharge,
  MOMO_PROVIDERS,
  MOMO_TRANSFER_BANK_CODES,
};
