/**
 * Serverless Backend Handler for Resend Email Dispatch
 * Compatible with Vercel Functions (/api/send-email), Netlify Functions, or Node.js Express.
 * Calling Resend from the server bypasses browser CORS restrictions and protects your API key.
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const SENDER_EMAIL = 'Pulak Chakma Maintenance <no_reply@pulakchakma.dev.cv>';
const OWNER_EMAIL = 'contact@pulakchakma.dev.cv';

function escapeHtml(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

async function dispatchToResend({ to, subject, html, replyTo }) {
    if (!RESEND_API_KEY) {
        throw new Error('Server configuration error: RESEND_API_KEY environment variable is missing.');
    }

    const payload = {
        from: SENDER_EMAIL,
        to: Array.isArray(to) ? to : [to],
        subject,
        html
    };

    if (replyTo) {
        payload.reply_to = replyTo;
    }

    const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.message || `Resend API error (${response.status})`);
    }
    return data;
}

export default async function handler(req, res) {
    // Enable CORS headers for local or cross-origin testing
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
    }

    try {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        const { type, email, message } = body || {};

        if (!email || !email.includes('@')) {
            return res.status(400).json({ error: 'A valid visitor email address is required.' });
        }

        const safeEmail = escapeHtml(email.trim());
        const timestamp = new Date().toUTCString();

        if (type === 'notify') {
            // 1. Send confirmation email to the visitor from no_reply@pulakchakma.dev.cv
            const userReceipt = await dispatchToResend({
                to: email.trim(),
                subject: 'Maintenance Express — Arrival Alert Confirmed',
                html: `
                    <div style="font-family: 'Times New Roman', Times, serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #f8fafc; color: #0f172a;">
                        <h2 style="margin-top: 0; color: #b45309;">Maintenance Express — Ticket Confirmed</h2>
                        <p>Hello,</p>
                        <p>Thank you for checking in while our platform undergoes scheduled maintenance. Your email (<strong>${safeEmail}</strong>) is registered on our dispatch list.</p>
                        <p>We will notify you immediately once our express train reaches the station and full service resumes.</p>
                        <hr style="border: none; border-top: 1px solid #cbd5e1; margin: 20px 0;" />
                        <p style="font-size: 13px; color: #475569;">Sent automatically from <strong>no_reply@pulakchakma.dev.cv</strong> &bull; Need direct assistance? Contact <strong>contact@pulakchakma.dev.cv</strong></p>
                    </div>
                `
            });

            // 2. Notify site owner (contact@pulakchakma.dev.cv)
            const ownerAlert = await dispatchToResend({
                to: OWNER_EMAIL,
                replyTo: email.trim(),
                subject: `[Maintenance Alert Signup] ${email.trim()}`,
                html: `
                    <div style="font-family: 'Times New Roman', Times, serif; padding: 20px;">
                        <h3>New Maintenance Arrival Notification Request</h3>
                        <p><strong>Visitor Email:</strong> ${safeEmail}</p>
                        <p><strong>Time:</strong> ${timestamp}</p>
                    </div>
                `
            });

            return res.status(200).json({ success: true, userReceipt, ownerAlert });
        }

        if (type === 'ask_developer') {
            if (!message || !message.trim()) {
                return res.status(400).json({ error: 'Please include a message for the developer.' });
            }

            const safeMessage = escapeHtml(message.trim());

            // 1. Send visitor's inquiry directly to contact@pulakchakma.dev.cv
            const ownerDelivery = await dispatchToResend({
                to: OWNER_EMAIL,
                replyTo: email.trim(),
                subject: `[Maintenance Inquiry] New Message from ${email.trim()}`,
                html: `
                    <div style="font-family: 'Times New Roman', Times, serif; max-width: 580px; margin: 0 auto; padding: 24px; border: 1px solid #cbd5e1; border-radius: 12px; background-color: #ffffff; color: #0f172a;">
                        <h2 style="margin-top: 0; color: #047857;">New Developer Inquiry (Maintenance Page)</h2>
                        <p><strong>From:</strong> ${safeEmail}</p>
                        <p><strong>Received:</strong> ${timestamp}</p>
                        <div style="margin-top: 16px; padding: 16px; background-color: #f1f5f9; border-left: 4px solid #10b981; border-radius: 6px; white-space: pre-wrap;">${safeMessage}</div>
                    </div>
                `
            });

            // 2. Send automated confirmation receipt to the visitor from no_reply@pulakchakma.dev.cv
            const userConfirmation = await dispatchToResend({
                to: email.trim(),
                subject: 'Confirmation: We received your message — Pulak Chakma',
                html: `
                    <div style="font-family: 'Times New Roman', Times, serif; max-width: 580px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #f8fafc; color: #0f172a;">
                        <h2 style="margin-top: 0; color: #047857;">Message Received — Confirmation Receipt</h2>
                        <p>Hello,</p>
                        <p>Thank you for reaching out while our site is under scheduled maintenance. Your message has been delivered to <strong>contact@pulakchakma.dev.cv</strong>, and we will get back to you as soon as possible.</p>
                        <p style="margin-bottom: 6px;"><strong>Copy of your message:</strong></p>
                        <div style="padding: 14px; background-color: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; color: #334155; white-space: pre-wrap;">${safeMessage}</div>
                        <hr style="border: none; border-top: 1px solid #cbd5e1; margin: 20px 0;" />
                        <p style="font-size: 13px; color: #475569;">This is an automated confirmation from <strong>no_reply@pulakchakma.dev.cv</strong>.</p>
                    </div>
                `
            });

            return res.status(200).json({ success: true, ownerDelivery, userConfirmation });
        }

        return res.status(400).json({ error: 'Invalid request type. Expected "notify" or "ask_developer".' });
    } catch (error) {
        console.error('Resend handler failure:', error);
        return res.status(500).json({ error: error.message || 'Failed to send email via Resend.' });
    }
}
