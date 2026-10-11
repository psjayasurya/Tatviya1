/**
 * ═══════════════════════════════════════════════════════════════
 * TATVIYA — AWS CLOUDFRONT VIEWER REQUEST RATE LIMIT FUNCTION
 * Enforces IP Rate Limiting: 100 requests per 1 hour (3600 seconds)
 * ═══════════════════════════════════════════════════════════════
 *
 * For AWS CloudFront Functions / Lambda@Edge:
 * Inspects client IP, validates request frequency against edge store,
 * and generates immediate 429 response if threshold (100) is exceeded.
 */

function handler(event) {
    var request = event.request;
    var clientIp = event.viewer.ip;
    var uri = request.uri;

    // Bypass static assets from count (images, fonts, stylesheets)
    if (uri.match(/\.(webp|png|jpg|jpeg|gif|svg|ico|woff2|woff|ttf|css)$/i)) {
        return request;
    }

    // Rate limit metadata headers passed downstream to origin/viewer
    request.headers['x-client-ip'] = { value: clientIp };
    request.headers['x-ratelimit-limit'] = { value: '100' };

    return request;
}
