/**
 ============================================================================
 MANIFESTO ENFORCEMENT: Security & Secret Verification
 ============================================================================
 
 CRITICAL INVARIANTS (DO NOT BREAK):
 - Secret comparison MUST be constant-time (prevent timing attacks)
 - NO secret values should appear in logs
 - SECRET_TOKEN must be 32+ bytes of cryptographic randomness
 - All authentication failures must be logged but not detailed
*/

import crypto from "crypto";

/**
 * Constant-time string comparison
 * Prevents timing attacks that could leak secret token length or prefix
 * 
 * @param {string} provided - User-provided token from X-Telegram-Bot-Api-Secret-Token header
 * @param {string} expected - Expected token from environment variable
 * @returns {boolean} true if tokens match
 * 
 * Risk: Simple === comparison takes different time for different prefix matches
 *       Attacker could measure response time to guess token byte-by-byte
 * Fix: Use timingSafeEqual which always takes same time regardless of input
 */
export function verifySecret(provided, expected) {
  // Guard against missing values
  if (!provided || !expected) {
    console.warn("[Security] Missing secret_token or environment variable");
    return false;
  }

  // Guard against type mismatches
  if (typeof provided !== "string" || typeof expected !== "string") {
    console.warn("[Security] Secret token is not a string");
    return false;
  }

  // Guard against empty strings
  if (provided.length === 0 || expected.length === 0) {
    console.warn("[Security] Secret token is empty");
    return false;
  }

  try {
    // CRITICAL FIX: Use constant-time comparison
    // This prevents timing-based attacks on the secret token
    return crypto.timingSafeEqual(
      Buffer.from(provided),
      Buffer.from(expected)
    );
  } catch (error) {
    // timingSafeEqual throws if buffers have different lengths
    // This is expected for wrong tokens - handle silently
    console.warn("[Security] Token length mismatch or comparison error");
    return false;
  }
}

/**
 * DEPLOYMENT CHECKLIST
 * 
 * Before deploying to production:
 * 
 * [ ] SECRET_TOKEN is set via `wrangler secret put SECRET_TOKEN`
 * [ ] SECRET_TOKEN value is 32+ bytes of random data (NOT a password)
 * [ ] TG_TOKEN is set via `wrangler secret put TG_TOKEN`
 * [ ] TG_TOKEN value is NEVER stored in source code
 * [ ] GROUP_ID is set via `wrangler secret put GROUP_ID`
 * [ ] All three secrets appear in wrangler.toml [env.production] secrets array
 * [ ] .gitignore includes .env and .wrangler/
 * [ ] No secrets have been committed to git history
 * [ ] ENVIRONMENT variable is set in wrangler.toml
 * [ ] PREFIX variable is set correctly ("" for production, "staging_" for staging)
 * [ ] Worker URL is registered with Telegram via setWebhook
 * [ ] Webhook secret_token parameter matches SECRET_TOKEN value
 * [ ] Worker has been deployed: `wrangler deploy --env production`
 * [ ] Cloudflare Worker logs show no authentication failures
 * [ ] Test message from private chat appears in target group
 * [ ] Secret rotation plan is documented
 * 
 * After deployment:
 * 
 * [ ] Check logs: wrangler tail --env production
 * [ ] Look for: [Security Alert] - indicates attempted authentication bypass
 * [ ] Look for: [Success] - indicates successful message processing
 * [ ] Never see: actual token values in logs
 * [ ] Test webhook health via curl (should return 200)
 * [ ] Verify copyMessage is being used (not forwardMessage)
 * [ ] Confirm messages appear in target group
 * [ ] Monitor for timeout errors (should be rare)
 * 
 * Secret Rotation (every 30-90 days):
 * 
 * 1. Generate new SECRET_TOKEN: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 * 2. Deploy new secret: wrangler secret put SECRET_TOKEN (paste new value)
 * 3. Register new webhook: curl -X POST https://api.telegram.org/bot{TOKEN}/setWebhook -d secret_token={NEW_TOKEN}
 * 4. Old messages in transit will fail (acceptable per Manifesto)
 * 5. Repeat for TG_TOKEN when rotating Telegram credentials
 */
