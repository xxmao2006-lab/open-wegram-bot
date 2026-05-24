/**
 ============================================================================
 MANIFESTO ENFORCEMENT: Telegram API I/O Layer
 ============================================================================
 
 CRITICAL INVARIANTS (DO NOT BREAK):
 - 5-second hard timeout on all API calls
 - NO retries on failure
 - NO caching of responses
 - Failures are logged but not propagated
 - API endpoint MUST use format: https://api.telegram.org/bot<TOKEN>/
 
 CRITICAL FIX: Previous code had URL format errors:
   ❌ https://telegram.org{token}/copyMessage  (WRONG - missing api.)
   ✅ https://api.telegram.org/bot${token}/copyMessage  (CORRECT)
*/

/**
 * Fetch with absolute timeout guarantee
 * @param {string} url - API endpoint
 * @param {object} options - Fetch options
 * @param {string} requestId - Trace ID
 * @returns {Promise<Response>}
 * @throws {Error} on timeout or network error
 */
async function fetchWithTimeout(url, options, requestId) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error.name === "AbortError") {
      console.error(
        `[${requestId}] [Timeout] Telegram API exceeded 5000ms - request aborted`
      );
      throw new Error("Telegram API timeout");
    }

    console.error(
      `[${requestId}] [Network Error] Fetch failed: ${error.message}`
    );
    throw error;
  }
}

/**
 * Forward message to group anonymously via copyMessage
 * @param {string} token - Telegram bot token
 * @param {string|number} groupId - Target group/channel ID
 * @param {object} message - Telegram message object
 * @param {string} requestId - Trace ID
 */
export async function sendToGroup(token, groupId, message, requestId) {
  // CRITICAL FIX: Input validation
  if (!token || !groupId || !message) {
    throw new Error(
      "sendToGroup: missing required parameters (token, groupId, message)"
    );
  }

  if (!message.message_id || !message.chat?.id) {
    throw new Error("sendToGroup: invalid message structure");
  }

  // CRITICAL FIX: Correct API endpoint format
  // Format: https://api.telegram.org/bot<TOKEN>/<METHOD>
  const url = `https://api.telegram.org/bot${token}/copyMessage`;

  const payload = {
    chat_id: groupId,
    from_chat_id: message.chat.id,
    message_id: message.message_id,
  };

  try {
    const res = await fetchWithTimeout(
      url,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
      requestId
    );

    if (!res.ok) {
      const errorText = await res.text();
      console.error(
        `[${requestId}] [Telegram API] copyMessage failed: HTTP ${res.status} - ${errorText.substring(0, 100)}`
      );
      throw new Error(`Telegram API error: ${res.status}`);
    }

    console.log(
      `[${requestId}] [Telegram API] Message copied to group successfully`
    );
  } catch (error) {
    // CONSTRAINT: Failure is final - no retry, no recovery
    console.error(
      `[${requestId}] [sendToGroup] ${error.message} - message will be discarded`
    );
    throw error;
  }
}

/**
 * Send text reply to user
 * @param {string} token - Telegram bot token
 * @param {number} chatId - User's chat ID
 * @param {string} text - Reply text
 * @param {string} requestId - Trace ID
 */
export async function sendReply(token, chatId, text, requestId) {
  // CRITICAL FIX: Input validation
  if (!token || !chatId || !text) {
    throw new Error(
      "sendReply: missing required parameters (token, chatId, text)"
    );
  }

  // CRITICAL FIX: Correct API endpoint format
  const url = `https://api.telegram.org/bot${token}/sendMessage`;

  const payload = {
    chat_id: chatId,
    text: text,
  };

  try {
    const res = await fetchWithTimeout(
      url,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
      requestId
    );

    if (!res.ok) {
      const errorText = await res.text();
      console.error(
        `[${requestId}] [Telegram API] sendMessage failed: HTTP ${res.status} - ${errorText.substring(0, 100)}`
      );
      throw new Error(`Telegram API error: ${res.status}`);
    }

    console.log(`[${requestId}] [Telegram API] Reply sent successfully`);
  } catch (error) {
    // CONSTRAINT: Failure is final - user won't see acknowledgment, but message may still be forwarded
    console.error(
      `[${requestId}] [sendReply] ${error.message} - continuing anyway`
    );
    throw error;
  }
}
