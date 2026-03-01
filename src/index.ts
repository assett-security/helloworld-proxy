/**
 * Cloudflare Worker HTTP/HTTPS Proxy for Playwright (Free & Open)
 *
 * This worker acts as a transparent proxy to protect your origin IP
 * when running browser automation with Playwright. All requests from
 * your Playwright browser will appear to come from Cloudflare's edge network.
 *
 * Features:
 * - IP Protection: Your real IP is hidden behind Cloudflare's network
 * - No Authentication: Free and open proxy (use with caution!)
 * - Rate Limiting: Optional per-IP rate limiting
 * - Logging: Comprehensive request logging for debugging
 * - CORS Support: Handles CORS preflight requests
 * - Error Handling: Graceful error responses
 *
 * WARNING: This is an OPEN proxy without authentication.
 * Only use this for personal projects or behind a firewall.
 * Anyone with the URL can use your proxy!
 */

interface Env {
  // Optional: KV namespace for rate limiting
  RATE_LIMIT?: KVNamespace;

  // Environment (production, staging, development)
  ENVIRONMENT?: string;
}

interface RateLimitConfig {
  maxRequests: number;
  windowSeconds: number;
}

// Configuration
const CONFIG = {
  // Rate limiting: 10000 requests per minute per IP (generous for personal use)
  rateLimit: {
    maxRequests: 10000,
    windowSeconds: 60,
  } as RateLimitConfig,

  // Request timeout (Cloudflare Workers have 50s wall time limit on free tier)
  timeoutMs: 30000,

  // Maximum request body size (10MB)
  maxBodySize: 10 * 1024 * 1024,

  // Headers to exclude from proxying
  excludeHeaders: [
    'host',
    'cf-connecting-ip',
    'cf-ray',
    'cf-visitor',
    'cf-ipcountry',
    'true-client-ip',
    'x-real-ip',
    'x-forwarded-for',
    'x-forwarded-proto',
  ],

  // Allowed origins for CORS (empty = allow all)
  allowedOrigins: [] as string[],
};

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const startTime = Date.now();
    const requestId = crypto.randomUUID();

    try {
      // Log request
      console.log(`[${requestId}] ${request.method} ${request.url}`);

      // Handle CORS preflight
      if (request.method === 'OPTIONS') {
        return handleCORS(request);
      }

      // Check rate limit (optional, only if KV is configured)
      if (env.RATE_LIMIT) {
        const rateLimitResult = await checkRateLimit(request, env);
        if (!rateLimitResult.success) {
          return createErrorResponse(
            `Rate limit exceeded. Try again in ${rateLimitResult.retryAfter}s`,
            429,
            requestId,
            { 'Retry-After': rateLimitResult.retryAfter!.toString() }
          );
        }
      }

      // Get target URL from request
      const targetUrl = extractTargetUrl(request);
      if (!targetUrl) {
        return createErrorResponse(
          'Missing target URL. Use X-Proxy-Target header or CONNECT method',
          400,
          requestId
        );
      }

      // Validate target URL
      const validation = validateTargetUrl(targetUrl);
      if (!validation.valid) {
        return createErrorResponse(validation.error || 'Invalid URL', 400, requestId);
      }

      // Check request body size
      const contentLength = request.headers.get('content-length');
      if (contentLength && parseInt(contentLength) > CONFIG.maxBodySize) {
        return createErrorResponse(
          `Request body too large (max ${CONFIG.maxBodySize / 1024 / 1024}MB)`,
          413,
          requestId
        );
      }

      // Forward request
      const proxyResponse = await forwardRequest(request, targetUrl, requestId);

      // Add proxy metadata headers
      const response = new Response(proxyResponse.body, proxyResponse);
      addProxyHeaders(response, request, requestId, startTime);
      addCORSHeaders(response, request);

      const duration = Date.now() - startTime;
      console.log(`[${requestId}] ${response.status} ${targetUrl} (${duration}ms)`);

      return response;

    } catch (error) {
      console.error(`[${requestId}] Error:`, error);

      if (error instanceof Error) {
        return createErrorResponse(
          error.message,
          500,
          requestId
        );
      }

      return createErrorResponse('Internal server error', 500, requestId);
    }
  },
};

/**
 * Check rate limit for client IP (optional)
 */
async function checkRateLimit(
  request: Request,
  env: Env
): Promise<{ success: boolean; retryAfter?: number }> {
  if (!env.RATE_LIMIT) {
    return { success: true };
  }

  const clientIp = request.headers.get('CF-Connecting-IP') || 'unknown';
  const rateLimitKey = `ratelimit:${clientIp}`;

  try {
    // Get current count
    const currentCount = await env.RATE_LIMIT.get(rateLimitKey);
    const count = currentCount ? parseInt(currentCount) : 0;

    if (count >= CONFIG.rateLimit.maxRequests) {
      // Get TTL to calculate retry-after
      const metadata = await env.RATE_LIMIT.getWithMetadata(rateLimitKey);
      const retryAfter = metadata.metadata?.expiresAt
        ? Math.ceil((metadata.metadata.expiresAt as number - Date.now()) / 1000)
        : CONFIG.rateLimit.windowSeconds;

      return { success: false, retryAfter };
    }

    // Increment counter
    const expiresAt = Date.now() + CONFIG.rateLimit.windowSeconds * 1000;
    await env.RATE_LIMIT.put(
      rateLimitKey,
      (count + 1).toString(),
      {
        expirationTtl: CONFIG.rateLimit.windowSeconds,
        metadata: { expiresAt },
      }
    );

    return { success: true };
  } catch (error) {
    console.error('Rate limit check failed:', error);
    // Allow request on rate limit check failure
    return { success: true };
  }
}

/**
 * Extract target URL from request
 */
function extractTargetUrl(request: Request): string | null {
  // Check X-Proxy-Target header (preferred)
  const headerUrl = request.headers.get('X-Proxy-Target');
  if (headerUrl) {
    return headerUrl;
  }

  // For CONNECT method, target is in the request URL path
  if (request.method === 'CONNECT') {
    const url = new URL(request.url);
    return url.pathname.substring(1); // Remove leading /
  }

  // Check if target is in query parameter
  const url = new URL(request.url);
  const queryUrl = url.searchParams.get('target') || url.searchParams.get('url');
  if (queryUrl) {
    return queryUrl;
  }

  return null;
}

/**
 * Validate target URL
 */
function validateTargetUrl(targetUrl: string): { valid: boolean; error?: string } {
  try {
    const parsed = new URL(targetUrl);

    // Only allow HTTP and HTTPS
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { valid: false, error: 'Only HTTP and HTTPS protocols are supported' };
    }

    // Block localhost and private IPs (basic check)
    const hostname = parsed.hostname.toLowerCase();
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0' ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      hostname.startsWith('172.16.') ||
      hostname.endsWith('.local')
    ) {
      return { valid: false, error: 'Cannot proxy to private/local addresses' };
    }

    return { valid: true };
  } catch (error) {
    return { valid: false, error: 'Invalid URL format' };
  }
}

/**
 * Forward request to target URL
 */
async function forwardRequest(
  originalRequest: Request,
  targetUrl: string,
  requestId: string
): Promise<Response> {
  // Filter headers
  const headers = new Headers();
  for (const [key, value] of originalRequest.headers.entries()) {
    if (!CONFIG.excludeHeaders.includes(key.toLowerCase())) {
      headers.set(key, value);
    }
  }

  // Create proxied request
  const proxyRequest = new Request(targetUrl, {
    method: originalRequest.method,
    headers,
    body: originalRequest.method !== 'GET' && originalRequest.method !== 'HEAD'
      ? originalRequest.body
      : null,
    redirect: 'follow',
  });

  // Forward with timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CONFIG.timeoutMs);

  try {
    const response = await fetch(proxyRequest, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error(`Request timeout after ${CONFIG.timeoutMs}ms`);
      }
      throw error;
    }
    throw new Error('Request failed');
  }
}

/**
 * Add proxy metadata headers
 */
function addProxyHeaders(
  response: Response,
  request: Request,
  requestId: string,
  startTime: number
): void {
  response.headers.set('X-Proxy-By', 'Cloudflare-Worker');
  response.headers.set('X-Proxy-Request-ID', requestId);
  response.headers.set('X-Proxy-Duration', `${Date.now() - startTime}ms`);

  // Add Cloudflare edge location
  const colo = (request as any).cf?.colo;
  if (colo) {
    response.headers.set('X-Proxy-Edge', colo);
  }
}

/**
 * Add CORS headers
 */
function addCORSHeaders(response: Response, request: Request): void {
  const origin = request.headers.get('Origin');

  if (CONFIG.allowedOrigins.length === 0 || !origin) {
    // Allow all origins
    response.headers.set('Access-Control-Allow-Origin', '*');
  } else if (CONFIG.allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Vary', 'Origin');
  }

  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', '*');
  response.headers.set('Access-Control-Expose-Headers', '*');
  response.headers.set('Access-Control-Max-Age', '86400');
}

/**
 * Handle CORS preflight request
 */
function handleCORS(request: Request): Response {
  const response = new Response(null, { status: 204 });
  addCORSHeaders(response, request);
  return response;
}

/**
 * Create error response
 */
function createErrorResponse(
  message: string,
  status: number,
  requestId: string,
  additionalHeaders?: Record<string, string>
): Response {
  const response = new Response(
    JSON.stringify({
      error: message,
      requestId,
      timestamp: new Date().toISOString(),
    }),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
        'X-Proxy-Request-ID': requestId,
        ...additionalHeaders,
      },
    }
  );

  return response;
}
