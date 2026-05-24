/**
 * Environment Configuration & Setup Guide
 * 
 * This file documents all environment variables and secrets required
 * to deploy the bot safely to production.
 */

// ============================================================================
// ENVIRONMENT VARIABLES (non-sensitive, safe in source code)
// ============================================================================

interface EnvVars {
  // Deployment environment identifier
  ENVIRONMENT: "production" | "staging";
  // Log prefix for filtering ("" = production, "staging_" = staging)
  PREFIX: string;
}

// ============================================================================
// SECRETS (sensitive, stored in Cloudflare Workers Secrets only)
// ============================================================================

interface EnvSecrets {
  // Webhook verification token from setWebhook call
  // Must be 32+ bytes of cryptographic randomness
  // Generate via: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  // Format: hexadecimal string (64 characters)
  // Risk: If leaked, attacker can forge webhook messages
  SECRET_TOKEN: string;

  // Telegram Bot API token
  // Format: "<BOT_ID>:<API_KEY>" (e.g., "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11")
  // Source: @BotFather /start -> /mybots -> select bot -> "API Token"
  // Risk: If leaked, attacker can impersonate the bot
  // Rotation: Revoke via BotFather /start -> /mybots -> select bot -> /revoke
  TG_TOKEN: string;

  // Target group/channel ID where messages are forwarded
  // Format: number (positive for groups, negative for channels)
  // Source: Send message to group, then:
  //   curl "https://api.telegram.org/bot<TOKEN>/getUpdates" | grep chat_id
  // Or use @userinfobot in the group to get the ID
  // Format: "-1001234567890" for channels, "123456789" for groups
  GROUP_ID: string;
}

// ============================================================================
// COMPLETE SETUP GUIDE (7 STEPS)
// ============================================================================

/*
STEP 1: Create Cloudflare Worker
  - Go to https://dash.cloudflare.com/workers
  - Click "Create application" -> "Create Worker"
  - Name: "open-wegram-bot"
  - Copy Worker URL (e.g., https://open-wegram-bot.yourname.workers.dev)

STEP 2: Install wrangler CLI locally
  npm install -g wrangler
  wrangler login

STEP 3: Generate SECRET_TOKEN (32 bytes random)
  
  Node.js:
    node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  
  Python:
    python3 -c "import secrets; print(secrets.token_hex(32))"
  
  Bash:
    openssl rand -hex 32

STEP 4: Get TG_TOKEN from @BotFather
  - Open Telegram and search for @BotFather
  - Send /start
  - Send /mybots
  - Select your bot
  - Click "API Token"
  - Copy the token (format: 123456:ABC-DEF...)

STEP 5: Get GROUP_ID
  - Add bot to your target group/channel
  - Send /start or any message
  - In terminal, run:
    curl "https://api.telegram.org/bot<TG_TOKEN>/getUpdates" | grep chat_id
  - Copy the chat_id (negative number for channels, positive for groups)

STEP 6: Deploy secrets to Cloudflare
  wrangler secret put SECRET_TOKEN
  (paste the 64-character hex string from Step 3)
  
  wrangler secret put TG_TOKEN
  (paste the token from Step 4)
  
  wrangler secret put GROUP_ID
  (paste the ID from Step 5)

STEP 7: Register Telegram webhook
  curl -X POST \
    https://api.telegram.org/bot<TG_TOKEN>/setWebhook \
    -H "Content-Type: application/json" \
    -d '{
      "url": "https://open-wegram-bot.yourname.workers.dev/",
      "secret_token": "<SECRET_TOKEN>"
    }'
  
  Replace:
    <TG_TOKEN> = token from Step 4
    https://open-wegram-bot.yourname.workers.dev = Worker URL from Step 1
    <SECRET_TOKEN> = 64-character hex string from Step 3
*/

// ============================================================================
// VALIDATION FUNCTION (run this after setup)
// ============================================================================

export function validateEnvironment(
  secrets: EnvSecrets,
  vars: EnvVars
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check SECRET_TOKEN
  if (!secrets.SECRET_TOKEN) {
    errors.push("SECRET_TOKEN not set in Cloudflare Worker secrets");
  } else if (secrets.SECRET_TOKEN.length < 32) {
    errors.push(
      "SECRET_TOKEN must be at least 32 characters (16 bytes) long"
    );
  } else if (!/^[0-9a-f]{64}$/.test(secrets.SECRET_TOKEN)) {
    errors.push(
      "SECRET_TOKEN must be 64 hexadecimal characters (32 bytes random)"
    );
  }

  // Check TG_TOKEN
  if (!secrets.TG_TOKEN) {
    errors.push("TG_TOKEN not set in Cloudflare Worker secrets");
  } else if (!/:/.test(secrets.TG_TOKEN)) {
    errors.push("TG_TOKEN format invalid - should be 'BOT_ID:API_KEY'");
  }

  // Check GROUP_ID
  if (!secrets.GROUP_ID) {
    errors.push("GROUP_ID not set in Cloudflare Worker secrets");
  } else if (!/^-?\d+$/.test(secrets.GROUP_ID.toString())) {
    errors.push("GROUP_ID must be a numeric value");
  }

  // Check environment
  if (!vars.ENVIRONMENT) {
    errors.push('ENVIRONMENT not set - should be "production" or "staging"');
  } else if (!["production", "staging"].includes(vars.ENVIRONMENT)) {
    errors.push(
      `ENVIRONMENT value '${vars.ENVIRONMENT}' invalid - must be 'production' or 'staging'`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// SECURITY BEST PRACTICES
// ============================================================================

/*
DO:
✅ Store all secrets in Cloudflare Workers Secrets (never in source code)
✅ Rotate SECRET_TOKEN every 30-90 days
✅ Rotate TG_TOKEN (via @BotFather /revoke) quarterly
✅ Use different SECRET_TOKEN for staging vs production
✅ Log when authentication fails (with timestamp and request ID)
✅ Monitor Cloudflare Worker logs for security alerts
✅ Use HTTPS only (Cloudflare Workers enforce this automatically)
✅ Keep wrangler CLI updated

DO NOT:
❌ Commit secrets to git (use .gitignore)
❌ Log secret values or tokens
❌ Share SECRET_TOKEN or TG_TOKEN in emails/chat
❌ Use weak secrets (less than 32 bytes)
❌ Reuse secrets across environments
❌ Leave old secrets in git history (even if deleted from files)
❌ Use the same SECRET_TOKEN for multiple environments
❌ Trust browser cookies or local storage for secrets

IF COMPROMISED:
1. Revoke TG_TOKEN immediately via @BotFather
2. Generate new SECRET_TOKEN and redeploy
3. Review webhook access logs in Cloudflare
4. Check for suspicious messages forwarded to the group
5. Consider rotating user credentials if they were exposed
*/
