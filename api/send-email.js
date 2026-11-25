/**
 * Serverless Proxy Handler: Reads APPS_SCRIPT_URL from Vercel Environment Variables
 * and forwards form submissions securely to Google Apps Script.
 */

const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL;
const OWNER_EMAIL = process.env.OWNER_EMAIL || 'contact.pulakchakma@gmail.com';

async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Quick health check when visiting /api/send-email in browser
    if (req.method === 'GET') {
        return res.status(200).json({
            status: 'online',
            hasAppsScriptUrl: Boolean(APPS_SCRIPT_URL),
            owner: OWNER_EMAIL
        });
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
    }

    if (!APPS_SCRIPT_URL) {
        return res.status(500).json({
            error: 'APPS_SCRIPT_URL is missing in Vercel Environment Variables. Please add it and Redeploy.'
        });
    }

    try {
        let body = req.body;
        if (!body) {
            const chunks = [];
            for await (const chunk of req) chunks.push(chunk);
            body = Buffer.concat(chunks).toString('utf8');
        }
        if (typeof body === 'string') {
            body = JSON.parse(body || '{}');
        }

        const response = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(body)
        });

        const text = await response.text();
        let data = {};
        try {
            data = JSON.parse(text);
        } catch (_) {
            throw new Error('Unexpected response from Google Apps Script. Ensure Web App access is set to "Anyone".');
        }

        if (!response.ok || data.success === false) {
            return res.status(400).json({ success: false, error: data.error || 'Apps Script error.' });
        }

        return res.status(200).json(data);
    } catch (error) {
        console.error('Apps Script proxy failure:', error);
        return res.status(500).json({ success: false, error: error.message || 'Failed to reach Apps Script.' });
    }
}

export default handler;
