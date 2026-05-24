/**
 ============================================================================
 MANIFESTO ENFORCEMENT: Core Entry Point (Webhook Receiver)
 ============================================================================
 
 CRITICAL INVARIANTS (DO NOT BREAK):
 - NO retry logic
 - NO persistence
 - NO recovery semantics
 - NO ordering guarantees
 - All errors return 200 to prevent Telegram webhook deadlock
 
 CONSTRAINT: This is the ONLY entry point. Every request passes through here.
 Risk: If X-Telegram-Bot-Api-Secret-Token validation is bypassed, 
       unauthorized actors can inject messages into the group.
*/

import { handleUpdate } from "../lib/router.js";
import { verifySecret } from "../lib/security.js";

export default {
  async fetch(request, env) {
    // Only accept POST (Telegram webhook format)
    if (request.method !== "POST") {
      return new Response("OK", { status: 200 });
    }

    const requestId = crypto.randomUUID();
    const startTime = Date.now();

    try {
      // CONSTRAINT: Hardened webhook secret verification
      // Using Telegram's recommended X-Telegram-Bot-Api-Secret-Token header
      // This prevents URL leakage attacks
      const secretTokenHeader = request.headers.get(
        "X-Telegram-Bot-Api-Secret-Token"
      );

      if (!verifySecret(secretTokenHeader, env.SECRET_TOKEN)) {
        const duration = Date.now() - startTime;
        console.warn(
          `[${requestId}] [Security Alert] Unauthorized webhook payload blocked (${duration}ms)`
        );
        // Still return 200 to prevent webhook retry storms
        return new Response("OK", { status: 200 });
      }

      // CONSTRAINT: Parse webhook body exactly once
      // Risk: request.json() can only be called once per request
      let update;
      try {
        update = await request.json();
      } catch (parseError) {
        const duration = Date.now() - startTime;
        console.error(
          `[${requestId}] [Parse Error] Invalid JSON in webhook payload (${duration}ms)`
        );
        // Malformed JSON is not recoverable - discard silently
        return new Response("OK", { status: 200 });
      }

      // Process the update (may fail, but that's acceptable)
      await handleUpdate(update, env, requestId);

      const duration = Date.now() - startTime;
      console.log(
        `[${requestId}] [Success] Webhook processed in ${duration}ms`
      );

      return new Response("OK", { status: 200 });
    } catch (error) {
      const duration = Date.now() - startTime;
      // CONSTRAINT: Never output sensitive values in logs
      console.error(
        `[${requestId}] [Fatal Exception] ${error.message} (${duration}ms)`
      );

      // CRITICAL FIX: Degradation protection - always return 200
      // This prevents Telegram from treating this Worker as permanently dead
      // and keeps the webhook channel open for future messages
      return new Response("OK", { status: 200 });
    }
  },
};