const paystack = require('paystack')(process.env.PAYSTACK_SECRET_KEY);

/**
 * Initialize a Paystack transaction for loan repayment
 * @param {number} amount - Amount in GHS (will be converted to kobo)
 * @param {string} email - User's email
 * @param {string} reference - Unique reference for the transaction
 * @param {object} metadata - Additional metadata (loan_id, user_id, etc.)
 * @returns {Promise<object>} Paystack transaction initialization response
 */
async function initializePayment(amount, email, reference, metadata = {}) {
  try {
    const response = await paystack.transaction.initialize({
      amount: amount * 100, // Convert to kobo
      email,
      reference,
      metadata,
      callback_url: `${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000'}/api/payments/verify`,
    });
    return response;
  } catch (error) {
    console.error('Paystack payment initialization error:', error);
    throw new Error('Failed to initialize payment');
  }
}

/**
 * Verify a Paystack transaction
 * @param {string} reference - Transaction reference
 * @returns {Promise<object>} Verification response
 */
async function verifyPayment(reference) {
  try {
    const response = await paystack.transaction.verify(reference);
    return response;
  } catch (error) {
    console.error('Paystack payment verification error:', error);
    throw new Error('Failed to verify payment');
  }
}

/**
 * Initiate a transfer to a user's bank account (for loan disbursement)
 * @param {object} transferData - Transfer details
 * @param {number} transferData.amount - Amount in GHS (will be converted to kobo)
 * @param {string} transferData.recipient_code - Paystack recipient code
 * @param {string} transferData.reference - Unique reference for the transfer
 * @param {string} transferData.reason - Reason for transfer
 * @returns {Promise<object>} Transfer initiation response
 */
async function initiateTransfer(transferData) {
  try {
    const response = await paystack.transfer.create({
      source: 'balance',
      amount: transferData.amount * 100, // Convert to kobo
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

/**
 * Create a transfer recipient (bank account)
 * @param {object} recipientData - Recipient details
 * @param {string} recipientData.type - Type (nuban for Nigeria)
 * @param {string} recipientData.name - Account holder's name
 * @param {string} recipientData.account_number - Bank account number
 * @param {string} recipientData.bank_code - Bank code
 * @returns {Promise<object>} Recipient creation response
 */
async function createRecipient(recipientData) {
  try {
    const response = await paystack.transfer.createRecipient(recipientData);
    return response;
  } catch (error) {
    console.error('Paystack recipient creation error:', error);
    throw new Error('Failed to create transfer recipient');
  }
}

/**
 * Get list of Nigerian banks
 * @returns {Promise<object>} Banks list response
 */
async function getBanks() {
  try {
    const response = await paystack.misc.list_banks({
      country: 'nigeria',
    });
    return response;
  } catch (error) {
    console.error('Paystack banks list error:', error);
    throw new Error('Failed to fetch banks list');
  }
}

/**
 * Resolve bank account to get account name
 * @param {string} accountNumber - Bank account number
 * @param {string} bankCode - Bank code
 * @returns {Promise<object>} Account resolution response
 */
async function resolveAccount(accountNumber, bankCode) {
  try {
    const response = await paystack.misc.resolve_account({
      account_number: accountNumber,
      bank_code: bankCode,
    });
    return response;
  } catch (error) {
    console.error('Paystack account resolution error:', error);
    throw new Error('Failed to resolve account');
  }
}

module.exports = {
  initializePayment,
  verifyPayment,
  initiateTransfer,
  createRecipient,
  getBanks,
  resolveAccount,
};
