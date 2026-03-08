/**
 * WhatsApp notification service
 * Uses wa.me URL scheme for MVP — opens WhatsApp with pre-filled message
 */

const OWNER_WHATSAPP = import.meta.env.VITE_OWNER_WHATSAPP || '+491234567890';

export const formatOrderMessage = (order) => {
    const items = order.items?.map(item =>
        `• ${item.name} (x${item.quantity}) - €${(item.price * item.quantity).toFixed(2)}`
    ).join('\n') || 'No items';

    const address = order.shippingAddress || {};

    return `🛒 *NEW ORDER - Second Thrift*
━━━━━━━━━━━━━━━━━
📋 *Order ID:* ${order.id || 'N/A'}
📧 *Customer:* ${order.userEmail || 'N/A'}

📦 *Items:*
${items}

💰 *Subtotal:* €${(order.subtotal || 0).toFixed(2)}
🚚 *Shipping:* €${(order.shipping || 0).toFixed(2)}
📊 *Tax:* €${(order.tax || 0).toFixed(2)}
━━━━━━━━━━━━━━━━━
💵 *Total:* €${(order.total || 0).toFixed(2)}

📍 *Shipping Address:*
${address.name || ''}
${address.street || ''}
${address.city || ''}, ${address.postalCode || ''}
${address.country || ''}
📱 ${address.phone || 'N/A'}

⏰ *Order Time:* ${new Date().toLocaleString('en-GB')}
━━━━━━━━━━━━━━━━━
💳 Payment: Pending (Wise)`;
};

export const sendWhatsAppNotification = (order) => {
    const message = formatOrderMessage(order);
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${OWNER_WHATSAPP.replace('+', '')}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
};

export const getWhatsAppLink = (phone, message) => {
    const encodedMessage = encodeURIComponent(message);
    return `https://wa.me/${phone.replace('+', '')}?text=${encodedMessage}`;
};
