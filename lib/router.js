/**
 ============================================================================
 MANIFESTO ENFORCEMENT: Message Router (Business Logic)
 ============================================================================
 
 CRITICAL INVARIANTS (DO NOT BREAK):
 - Only process private chats (physical isolation)
 - Commands are intercepted at entry point
 - Content is extracted exactly once
 - Messages are forwarded anonymously via copyMessage
 - NO state mutation
 - NO side effects except API calls
*/

import { sendToGroup, sendReply } from "./telegram.js";

export async function handleUpdate(update, env, requestId) {
  // CONSTRAINT: Physical isolation - only process private messages
  // This ensures confessions are separated from group discussions
  if (!update.message) {
    return; // Not a message update (e.g., callback_query, edited_message)
  }

  const msg = update.message;

  // CONSTRAINT: Reject group/channel messages
  // Risk: If this check is removed, group messages could be forwarded
  //       creating an infinite loop or violating isolation principles
  if (msg.chat.type !== "private") {
    console.log(
      `[${requestId}] [Isolation] Rejected non-private message from ${msg.chat.type}`
    );
    return; // Silently discard
  }

  // Command Layer: Pre-intercept /start command
  if (msg.text && msg.text.trim() === "/start") {
    const welcomeText =
      "默认匿名。\n\n这里通过机器人转发。\n发布不会展示身份信息。\n\n不想说完整。\n也没关系。\n\n一句话。\n一段话。\n\n都可以。\n\n放这就行。";

    try {
      await sendReply(env.TG_TOKEN, msg.chat.id, welcomeText, requestId);
    } catch (error) {
      console.error(
        `[${requestId}] [Router] Failed to send welcome message: ${error.message}`
      );
      // Do not retry - user will see nothing, but that's acceptable
    }
    return;
  }

  // Content Layer: Extract text or caption
  // CONSTRAINT: Accept either text messages or media with captions
  const text = msg.text || msg.caption;

  if (!text) {
    console.log(`[${requestId}] [Content] No text or caption in message`);
    return; // Silently discard empty messages
  }

  // Semantic Layer: Send acknowledgment
  // This confirms receipt to the sender
  try {
    await sendReply(env.TG_TOKEN, msg.chat.id, "放这了。", requestId);
  } catch (error) {
    console.error(
      `[${requestId}] [Router] Failed to send acknowledgment: ${error.message}`
    );
    // Continue anyway - the message will still be forwarded
  }

  // Transport Layer: Forward to group anonymously
  // CONSTRAINT: Use copyMessage to strip author information
  // This is the core anonymity mechanism
  try {
    await sendToGroup(env.TG_TOKEN, env.GROUP_ID, msg, requestId);
  } catch (error) {
    console.error(
      `[${requestId}] [Router] Failed to forward to group: ${error.message}`
    );
    // Message is lost - this is acceptable per Manifesto
    // No retry, no dead letter queue, no recovery
  }
}
