/**
 * ═══════════════════════════════════════════════════════════════
 * TATVIYA — SITE-WIDE IP RATE LIMITER MIDDLEWARE (NODE.JS / EXPRESS)
 * Enforces IP Rate Limiting: 100 requests per 1 hour (3600 seconds)
 * ═══════════════════════════════════════════════════════════════
 *
 * Implements an in-memory sliding window counter per client IP.
 * Can be used as middleware in Express, Fastify, Next.js, or Vercel serverless.
 */

'use strict';

const WINDOW_MS = 60 * 60 * 1000; // 1 hour (3,600,000 ms)
const MAX_REQUESTS = 100;          // 100 requests per hour

// Map stores: ip -> Array of timestamps within the current sliding window
const accessHistory = new Map();

// Periodic cleanup of expired IPs every 10 minutes
setInterval(() => {
    const now = Date.now();
    for (const [ip, timestamps] of accessHistory.entries()) {
        const active = timestamps.filter(ts => (now - ts) < WINDOW_MS);
        if (active.length === 0) {
            accessHistory.delete(ip);
        } else {
            accessHistory.set(ip, active);
        }
    }
}, 10 * 60 * 1000).unref();

/**
 * Extract client IP from standard proxy headers or socket
 * @param {object} req HTTP Request
 * @returns {string} Client IP address
 */
function getClientIp(req) {
    const forwarded = req.headers && req.headers['x-forwarded-for'];
    if (forwarded) {
        return forwarded.split(',')[0].trim();
    }
    return req.headers?.['x-real-ip'] ||
           req.connection?.remoteAddress ||
           req.socket?.remoteAddress ||
           req.ip ||
           '127.0.0.1';
}

/**
 * Rate Limiter Middleware
 * @param {object} req 
 * @param {object} res 
 * @param {function} [next] 
 * @returns {boolean} true if allowed, false if blocked
 */
function siteRateLimiter(req, res, next) {
    const clientIp = getClientIp(req);
    const now = Date.now();

    let timestamps = accessHistory.get(clientIp) || [];
    // Retain only requests within the last hour
    timestamps = timestamps.filter(ts => (now - ts) < WINDOW_MS);

    const count = timestamps.length;
    const remaining = Math.max(0, MAX_REQUESTS - (count + 1));
    const oldestTimestamp = timestamps.length > 0 ? timestamps[0] : now;
    const resetSeconds = Math.ceil(Math.max(1, (oldestTimestamp + WINDOW_MS - now) / 1000));

    // Set standard rate limit headers
    res.setHeader('X-RateLimit-Limit', String(MAX_REQUESTS));
    res.setHeader('X-RateLimit-Remaining', String(remaining));
    res.setHeader('X-RateLimit-Reset', String(Math.floor((oldestTimestamp + WINDOW_MS) / 1000)));

    if (count >= MAX_REQUESTS) {
        res.statusCode = 429;
        res.setHeader('Retry-After', String(resetSeconds));
        res.setHeader('Content-Type', 'application/json; charset=utf-8');

        const errorPayload = JSON.stringify({
            status: 429,
            error: 'Too Many Requests',
            message: 'You have exceeded the maximum limit of 100 requests per hour from this IP address.',
            limit: MAX_REQUESTS,
            remaining: 0,
            retryAfterSeconds: resetSeconds,
            support: 'contact@tatviya.com'
        });

        res.end(errorPayload);
        return false;
    }

    // Record this request
    timestamps.push(now);
    accessHistory.set(clientIp, timestamps);

    if (typeof next === 'function') {
        next();
    }
    return true;
}

module.exports = {
    siteRateLimiter,
    getClientIp,
    MAX_REQUESTS,
    WINDOW_MS
};
