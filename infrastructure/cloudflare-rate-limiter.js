/**
 * ═══════════════════════════════════════════════════════════════
 * TATVIYA — CLOUDFLARE EDGE WORKER RATE LIMITER
 * Enforces IP Rate Limiting: 100 requests per 1 hour (3600 seconds)
 * ═══════════════════════════════════════════════════════════════
 *
 * Deployable directly via Cloudflare Dashboard or Wrangler CLI.
 * Compatible with Cloudflare Workers KV or Cache API for zero-cost operation.
 */

'use strict';

const RATE_LIMIT_MAX = 100;         // Max 100 requests
const RATE_LIMIT_WINDOW = 3600;     // 1 hour window in seconds (3600s)

export default {
    async fetch(request, env, ctx) {
        // 1. Extract Client IP
        const clientIp = request.headers.get('cf-connecting-ip') ||
                         request.headers.get('x-real-ip') ||
                         '127.0.0.1';

        // Bypass static images and fonts to allow smooth page rendering
        const url = new URL(request.url);
        const isStaticAsset = /\.(webp|png|jpg|jpeg|gif|svg|ico|woff2|woff|ttf|css)$/i.test(url.pathname);

        if (isStaticAsset) {
            return fetch(request);
        }

        // 2. Sliding Window Rate Limiting Cache Key
        const cache = caches.default;
        const cacheKey = new URL(`https://rate-limit.internal/ip/${encodeURIComponent(clientIp)}`);
        
        let rateResponse = await cache.match(cacheKey);
        let rateData = { count: 0, resetAt: Math.floor(Date.now() / 1000) + RATE_LIMIT_WINDOW };

        if (rateResponse) {
            try {
                rateData = await rateResponse.json();
            } catch {
                rateData = { count: 0, resetAt: Math.floor(Date.now() / 1000) + RATE_LIMIT_WINDOW };
            }
        }

        const nowSec = Math.floor(Date.now() / 1000);

        // Reset if window has elapsed
        if (nowSec >= rateData.resetAt) {
            rateData.count = 1;
            rateData.resetAt = nowSec + RATE_LIMIT_WINDOW;
        } else {
            rateData.count += 1;
        }

        const remaining = Math.max(0, RATE_LIMIT_MAX - rateData.count);
        const retryAfter = Math.max(1, rateData.resetAt - nowSec);

        // 3. Store updated counter back in Edge Cache
        const updatedResponse = new Response(JSON.stringify(rateData), {
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': `public, max-age=${retryAfter}`
            }
        });
        ctx.waitUntil(cache.put(cacheKey, updatedResponse));

        // 4. If rate limit exceeded (> 100 hits in 1 hour)
        if (rateData.count > RATE_LIMIT_MAX) {
            // Check if client expects JSON (e.g. API endpoint)
            const isJsonRequest = request.headers.get('accept')?.includes('application/json') ||
                                  url.pathname.startsWith('/api/');

            if (isJsonRequest) {
                return new Response(JSON.stringify({
                    error: 'Too Many Requests',
                    statusCode: 429,
                    message: 'IP rate limit exceeded: maximum 100 requests per hour allowed.',
                    limit: RATE_LIMIT_MAX,
                    remaining: 0,
                    retryAfterSeconds: retryAfter,
                    support: 'contact@tatviya.com'
                }), {
                    status: 429,
                    headers: {
                        'Content-Type': 'application/json; charset=utf-8',
                        'Retry-After': String(retryAfter),
                        'X-RateLimit-Limit': String(RATE_LIMIT_MAX),
                        'X-RateLimit-Remaining': '0',
                        'X-RateLimit-Reset': String(rateData.resetAt),
                        'Cache-Control': 'no-store, no-cache, must-revalidate'
                    }
                });
            }

            // Return Branded HTML 429 Error Page
            const html429 = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>429 — Rate Limit Exceeded | Tatviya</title>
    <style>
        :root { --primary: #e2211c; --navy: #101a33; --bg: #0a1022; --text: #ffffff; --muted: #94a3b8; }
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
        body { background: var(--bg); color: var(--text); min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; text-align: center; }
        .card { max-width: 560px; background: rgba(16, 26, 51, 0.85); border: 1px solid rgba(226, 33, 28, 0.3); border-radius: 20px; padding: 48px 32px; box-shadow: 0 25px 50px rgba(0,0,0,0.5); backdrop-filter: blur(12px); }
        .badge { display: inline-flex; align-items: center; gap: 8px; background: rgba(226, 33, 28, 0.15); border: 1px solid rgba(226, 33, 28, 0.4); color: #ff5733; padding: 6px 16px; border-radius: 9999px; font-size: 0.85rem; font-weight: 700; margin-bottom: 20px; }
        h1 { font-size: 2rem; font-weight: 800; margin-bottom: 12px; }
        p { color: var(--muted); font-size: 1rem; line-height: 1.6; margin-bottom: 24px; }
        .timer-box { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 18px; margin-bottom: 28px; }
        .timer-label { font-size: 0.82rem; color: var(--muted); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; }
        .timer-val { font-size: 1.8rem; font-weight: 800; color: #ff5733; font-variant-numeric: tabular-nums; }
        .btn { display: inline-block; background: var(--primary); color: #fff; padding: 12px 28px; border-radius: 10px; font-weight: 700; text-decoration: none; transition: opacity 0.2s; }
        .btn:hover { opacity: 0.9; }
        .footer-note { margin-top: 24px; font-size: 0.82rem; color: #64748b; }
    </style>
</head>
<body>
    <div class="card">
        <div class="badge">SECURITY PROTECTION · HTTP 429</div>
        <h1>Rate Limit Exceeded</h1>
        <p>Your IP address has exceeded the maximum rate limit of <strong>100 requests per hour</strong>. This safeguard protects Tatviya against automated scraping and service disruption.</p>
        <div class="timer-box">
            <div class="timer-label">Access Restriction Resets In</div>
            <div class="timer-val" id="countdown">${Math.ceil(retryAfter / 60)} minutes</div>
        </div>
        <a href="mailto:contact@tatviya.com?subject=Rate%20Limit%20Inquiry" class="btn">Contact Emergency Support</a>
        <p class="footer-note">Client IP: ${clientIp} · Quota: 100 requests / 1 hour</p>
    </div>
</body>
</html>`;

            return new Response(html429, {
                status: 429,
                headers: {
                    'Content-Type': 'text/html; charset=utf-8',
                    'Retry-After': String(retryAfter),
                    'X-RateLimit-Limit': String(RATE_LIMIT_MAX),
                    'X-RateLimit-Remaining': '0',
                    'X-RateLimit-Reset': String(rateData.resetAt),
                    'Cache-Control': 'no-store, no-cache, must-revalidate'
                }
            });
        }

        // 5. Pass request to origin and attach rate limit headers
        const originResponse = await fetch(request);
        const newHeaders = new Headers(originResponse.headers);
        newHeaders.set('X-RateLimit-Limit', String(RATE_LIMIT_MAX));
        newHeaders.set('X-RateLimit-Remaining', String(remaining));
        newHeaders.set('X-RateLimit-Reset', String(rateData.resetAt));

        return new Response(originResponse.body, {
            status: originResponse.status,
            statusText: originResponse.statusText,
            headers: newHeaders
        });
    }
};
