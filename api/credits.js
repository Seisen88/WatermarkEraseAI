const CREDIT_COST_IMAGE = 3;
const CREDIT_COST_VIDEO = 6;
const MAX_CREDITS_GUEST = 12;
const MAX_CREDITS_USER = 80;
const TTL_SECONDS = 90000; // ~25 hours — ensures reset by next day

function getTodayKey() {
  return new Date().toISOString().split('T')[0];
}

function getCreditKey(ip, userId) {
  const day = getTodayKey();
  return userId ? `wm:cr:u:${userId}:${day}` : `wm:cr:ip:${ip}:${day}`;
}

function getIP(req) {
  const forwarded = req.headers['x-forwarded-for'] || '';
  return forwarded.split(',')[0].trim() || req.socket?.remoteAddress || 'unknown';
}

async function kvGet(key) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  const res = await fetch(`${url}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!data.result) return null;
  try { return JSON.parse(data.result); } catch { return null; }
}

async function kvSet(key, value, exSeconds) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return;
  await fetch(`${url}/set/${encodeURIComponent(key)}/${encodeURIComponent(JSON.stringify(value))}/ex/${exSeconds}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-user-id');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const ip = getIP(req);
  const userId = req.headers['x-user-id'] || null;
  const max = userId ? MAX_CREDITS_USER : MAX_CREDITS_GUEST;
  const key = getCreditKey(ip, userId);

  // GET — return current credits
  if (req.method === 'GET') {
    const stored = await kvGet(key);
    return res.status(200).json(stored || { remaining: max, used: 0 });
  }

  // POST — deduct or refund
  if (req.method === 'POST') {
    const { action, cost } = req.body || {};

    if (!action || typeof cost !== 'number' || cost <= 0) {
      return res.status(400).json({ error: 'Invalid request' });
    }

    const stored = (await kvGet(key)) || { remaining: max, used: 0 };

    if (action === 'deduct') {
      if (cost > stored.remaining) {
        return res.status(402).json({
          error: stored.remaining === 0
            ? 'You have used all your credits for today. They reset at midnight.'
            : `Not enough credits — need ${cost}, you have ${stored.remaining} remaining.`,
          remaining: stored.remaining,
        });
      }
      const next = { remaining: stored.remaining - cost, used: stored.used + cost };
      await kvSet(key, next, TTL_SECONDS);
      return res.status(200).json(next);
    }

    if (action === 'refund') {
      const next = {
        remaining: Math.min(stored.remaining + cost, max),
        used: Math.max(stored.used - cost, 0),
      };
      await kvSet(key, next, TTL_SECONDS);
      return res.status(200).json(next);
    }

    return res.status(400).json({ error: 'Unknown action' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
