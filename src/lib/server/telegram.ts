import 'server-only';

import { getSupabaseAdmin } from './supabaseAdmin';

interface TelegramMessageInput {
  orderId?: string;
  ticketId?: string;
  chatId?: string;
  message: string;
}

const escapeHtml = (value: unknown, maxLength = 500) => String(value ?? '')
  .slice(0, maxLength)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;');

const writeTelegramLog = async (entry: Record<string, unknown>) => {
  await getSupabaseAdmin().from('telegram_logs').insert(entry);
};

export const sendTelegramMessage = async ({ orderId, ticketId, chatId, message }: TelegramMessageInput) => {
  const targetChatId = chatId || process.env.TELEGRAM_ADMIN_CHAT_ID;
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token || !targetChatId) {
    await writeTelegramLog({
      order_id: orderId,
      ticket_id: ticketId,
      chat_id: targetChatId,
      message,
      status: 'skipped',
      error: 'TELEGRAM_BOT_TOKEN or TELEGRAM_ADMIN_CHAT_ID is not configured.',
    });
    return { ok: false, skipped: true };
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: targetChatId,
        text: message,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
      signal: AbortSignal.timeout(8_000),
    });

    if (!response.ok) {
      const responseText = await response.text();
      let error = responseText;
      try {
        const payload = JSON.parse(responseText) as { description?: string };
        error = payload.description || responseText;
      } catch {
        // Keep the raw response when Telegram does not return JSON.
      }
      await writeTelegramLog({
        order_id: orderId,
        ticket_id: ticketId,
        chat_id: targetChatId,
        message,
        status: 'failed',
        error: error.slice(0, 1000),
      });
      return { ok: false, error };
    }

    await writeTelegramLog({
      order_id: orderId,
      ticket_id: ticketId,
      chat_id: targetChatId,
      message,
      status: 'sent',
    });

    return { ok: true };
  } catch (error) {
    const messageText = error instanceof Error ? error.message : 'Telegram request failed.';
    await writeTelegramLog({
      order_id: orderId,
      ticket_id: ticketId,
      chat_id: targetChatId,
      message,
      status: 'failed',
      error: messageText.slice(0, 1000),
    });
    return { ok: false, error: messageText };
  }
};

export const buildPaymentNotification = (order: {
  id: string;
  serviceTitle: string;
  serviceCategory: string;
  serviceDescription?: string;
  customerName: string;
  customerTelegram: string;
  customerWhatsapp?: string;
  contactMethod: string;
  pricePaid: number;
  originalPrice: number;
  resellerPrice: number;
  userRole: string;
  secretKey: string;
  utrNumber?: string;
}) => {
  return [
    '<b>Payment verification requested</b>',
    `Order: <code>${escapeHtml(order.id, 80)}</code>`,
    '',
    '<b>Service details</b>',
    `Name: ${escapeHtml(order.serviceTitle, 200)}`,
    `Category: ${escapeHtml(order.serviceCategory, 100)}`,
    order.serviceDescription ? `Description: ${escapeHtml(order.serviceDescription, 500)}` : '',
    '',
    '<b>Customer details</b>',
    `Name: ${escapeHtml(order.customerName, 120)}`,
    `Telegram: ${escapeHtml(order.customerTelegram, 64)}`,
    `WhatsApp: ${escapeHtml(order.customerWhatsapp || 'not provided', 32)}`,
    `Preferred contact: ${escapeHtml(order.contactMethod, 20)}`,
    `Role: ${escapeHtml(order.userRole, 20)}`,
    '',
    '<b>Payment details</b>',
    `Amount paid: ₹${order.pricePaid}`,
    `Original price: ₹${order.originalPrice}`,
    `Reseller price: ₹${order.resellerPrice}`,
    `UTR: <code>${escapeHtml(order.utrNumber || 'not provided', 32)}</code>`,
    `Status: verification_pending`,
    `Secret: <code>${escapeHtml(order.secretKey, 80)}</code>`,
  ].filter(Boolean).join('\n');
};

export const buildTicketNotification = (ticket: {
  id: string;
  orderId: string;
  serviceTitle: string;
  customerTelegram: string;
  issueCategory: string;
  description: string;
}) => {
  return [
    '<b>New support ticket</b>',
    `Ticket: <code>${escapeHtml(ticket.id, 80)}</code>`,
    `Order: <code>${escapeHtml(ticket.orderId, 80)}</code>`,
    `Service: ${escapeHtml(ticket.serviceTitle, 200)}`,
    `Telegram: ${escapeHtml(ticket.customerTelegram, 64)}`,
    `Issue: ${escapeHtml(ticket.issueCategory, 100)}`,
    `Details: ${escapeHtml(ticket.description, 1500)}`,
  ].join('\n');
};
