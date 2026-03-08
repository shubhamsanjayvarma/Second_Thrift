/**
 * Payment Service
 * Customers pay via direct bank transfer to admin's Wise EUR account
 * No Wise account needed — any bank can send to the IBAN
 */

const BANK_ACCOUNT = {
    accountHolder: 'KETANBHAI SURESHBHAI GORASAVA',
    iban: 'BE94 9057 3609 4914',
    bic: 'TRWIBEB1XXX',
    bankName: 'Wise',
    bankAddress: 'Rue du Trône 100, 3rd floor, Brussels, 1050, Belgium',
    email: 'secondthriftt.1@gmail.com',
    currency: 'EUR',
};

/**
 * Generate a unique payment reference for an order
 */
export const generatePaymentReference = (orderId) => {
    const timestamp = Date.now().toString(36).toUpperCase();
    const shortId = String(orderId).substring(0, 6).toUpperCase();
    return `ST-${shortId}-${timestamp}`;
};

/**
 * Get payment details for the customer
 * Shows direct bank transfer info — no Wise login needed
 */
export const getPaymentDetails = (orderId, total) => {
    const reference = generatePaymentReference(orderId);

    return {
        accountHolder: BANK_ACCOUNT.accountHolder,
        iban: BANK_ACCOUNT.iban,
        bic: BANK_ACCOUNT.bic,
        bankName: BANK_ACCOUNT.bankName,
        bankAddress: BANK_ACCOUNT.bankAddress,
        email: BANK_ACCOUNT.email,
        currency: BANK_ACCOUNT.currency,
        amount: total,
        reference,
        instructions: [
            `Transfer exactly €${total.toFixed(2)} to the bank account below.`,
            `Use reference: ${reference} in the payment description.`,
            `Works from any bank — SEPA or international SWIFT transfer.`,
            `Your order will be processed once payment is confirmed (1-2 business days).`,
        ],
    };
};

/**
 * Check if payment is configured
 */
export const isWiseConfigured = () => true;
