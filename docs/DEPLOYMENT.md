# Deployment Guide - open-wegram-bot

Detailed step-by-step guide for deploying open-wegram-bot on Cloudflare Workers.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Detailed Setup Steps](#detailed-setup-steps)
3. [Environment Variables](#environment-variables)
4. [Webhook Configuration](#webhook-configuration)
5. [Verification & Testing](#verification--testing)
6. [Troubleshooting](#troubleshooting)

## Prerequisites

### Accounts Required

- **GitHub Account**
  - For forking and managing the repository
  - [Sign up here](https://github.com/signup)

- **Cloudflare Account**
  - For Workers deployment
  - Free tier is sufficient
  - [Sign up here](https://dash.cloudflare.com/sign-up)

- **Telegram Account**
  - For bot creation and testing
  - Download from [telegram.org](https://telegram.org)

### Information to Gather

Before starting, you'll need:

```
☐ GitHub username
☐ Cloudflare email and password
☐ Telegram account active
☐ A secure string for SECRET_TOKEN (16+ characters)
```

## Detailed Setup Steps

### Step 1: Create Telegram Bot

1. **Open Telegram** and search for `@BotFather`

2. **Start conversation:**
   - Send `/start`
   - You'll see available commands

3. **Create a new bot:**
   - Send `/newbot`
   - Answer the prompts:
     - Give your bot a name (e.g., "MyWegram Bot")
     - Give your bot a username (must be unique, ending with "bot", e.g., "my_wegram_bot")

4. **Save the token:**
   ```
   Here is your bot token:
   123456789:ABCDefghIjklmnopqrstuvwxyzABCDEFGHI
   ```
   - 📌 **COPY THIS TOKEN - You'll need it later**
   - Keep it secret!

### Step 2: Get Your User ID

1. **Open Telegram** and search for `@userinfobot`

2. **Start conversation:**
   - Send any message
   - You'll receive your user ID

3. **Save your user ID:**
   ```
   User ID: 123456789
   ```
   - 📌 **COPY THIS ID - You may need it for admin functions**

### Step 3: Fork the Repository

1. **Go to GitHub:**
   - Visit [open-wegram-bot](https://github.com/xxmao2006-lab/open-wegram-bot)

2. **Click Fork button:**
   - Top-right corner of the page
   - Select "Create a new fork"

3. **Configure fork:**
   - Owner: Your GitHub account (selected by default)
   - Repository name: `open-wegram-bot`
   - Description: (optional)
   - Click **Create fork**

4. **Confirm:**
   - You're now on your fork at `https://github.com/YOUR_USERNAME/open-wegram-bot`

### Step 4: Connect to Cloudflare Workers

1. **Log in to Cloudflare:**
   - Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
   - Sign in with your account

2. **Navigate to Workers & Pages:**
   - Left sidebar → "Workers & Pages"
   - Or direct: Account Home → Workers & Pages

3. **Create new project:**
   - Click **Create application**
   - Select **Pages** tab
   - Click **Connect to Git**

4. **Authorize Cloudflare:**
   - You'll be redirected to GitHub
   - Click **Authorize cloudflare**
   - Grant necessary permissions

5. **Select repository:**
   - You'll return to Cloudflare
   - Select your forked repository: `open-wegram-bot`
   - Click **Begin setup**

### Step 5: Configure Deployment Settings

1. **Project name:**
   - Use a memorable name (e.g., `wegram-bot`)
   - This becomes part of your webhook URL

2. **Production branch:**
   - Keep as `main`

3. **Build settings:**
   - Framework preset: None (or as configured)
   - Leave as defaults unless you know what to change

4. **Environment variables:**
   - Click **Add environment variable**
   - Add each variable for Production:

   | Variable | Value | Notes |
   |----------|-------|-------|
   | `PREFIX` | `/` | Or use `!`, `$`, etc. |
   | `SECRET_TOKEN` | (see below) | Must be 16+ characters |

### Generating SECRET_TOKEN

**Recommended method - use a strong random string:**

Option A - Online tool:
- Visit [1password.com/password-generator](https://1password.com/password-generator/)
- Generate 20+ characters with uppercase, lowercase, numbers, symbols
- Copy the result

Option B - Command line:
```bash
# On Linux/Mac:
head -c 32 /dev/urandom | base64

# On Windows (PowerShell):
[System.Convert]::ToBase64String([System.Security.Cryptography.RNGCryptoServiceProvider]::new().GetBytes(32))
```

Option C - Manual:
```
Ab3$mK9@xL2!pQ7wR4&zH8*vN6.fG5eDc
```

### Step 6: Deploy

1. **Complete setup:**
   - Review all settings
   - Click **Save and Deploy**

2. **Wait for deployment:**
   - Cloudflare will build and deploy
   - Watch the deployment progress
   - Should complete within 2-5 minutes

3. **Successful deployment:**
   - You'll see a checkmark ✓
   - Your domain will be: `https://<project-name>.<username>.workers.dev`
   - 📌 **SAVE THIS URL - This is your webhook URL**

## Environment Variables

### Required Variables

```bash
PREFIX=/              # Command prefix for your bot commands
SECRET_TOKEN=your_secure_token_here  # Webhook security token
```

### Optional Variables

Depending on your setup:

```bash
ADMIN_USER_ID=123456789        # Your Telegram user ID for admin functions
DEBUG=false                    # Enable debug logging
```

### Security Best Practices

1. **Never share SECRET_TOKEN**
2. **Keep tokens out of version control**
3. **Rotate tokens periodically**
4. **Use strong, random values**
5. **Use Cloudflare's secure variable storage** (not in code)

## Webhook Configuration

### Activating the Webhook

Once deployment is complete:

1. **Construct the webhook URL:**
   ```
   https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=<YOUR_WEBHOOK_URL>&secret_token=<YOUR_SECRET_TOKEN>
   ```

2. **Replace placeholders:**
   - `<YOUR_BOT_TOKEN>`: Token from @BotFather
   - `<YOUR_WEBHOOK_URL>`: Your Cloudflare domain
   - `<YOUR_SECRET_TOKEN>`: The SECRET_TOKEN from Step 5

3. **Example (sanitized):**
   ```
   https://api.telegram.org/bot123456789:ABCDefghIjkl/setWebhook?url=https://wegram-bot.myusername.workers.dev&secret_token=Ab3$mK9@xL2!pQ7wR4&zH8*vN6
   ```

4. **Send the request:**
   - Option A: Paste in browser address bar
   - Option B: Use curl:
   ```bash
   curl "https://api.telegram.org/bot123456789:ABCDefghIjkl/setWebhook?url=https://wegram-bot.myusername.workers.dev&secret_token=YOUR_TOKEN"
   ```

5. **Verify response:**
   - Success response: `{"ok":true,"result":true,...}`
   - This means webhook is activated

### Webhook URL Format

Your Cloudflare Workers domain:
```
https://<project-name>.<username>.workers.dev
```

**Example breakdown:**
```
Project name: wegram-bot
Cloudflare username: myusername
Resulting URL: https://wegram-bot.myusername.workers.dev
```

## Verification & Testing

### Quick Test

1. **Send a test message:**
   - Open your bot in Telegram
   - Send the message: `Hello`

2. **Check for response:**
   - ✅ If you get a response → Webhook is working!
   - ❌ If no response → See troubleshooting below

### Detailed Testing

1. **Check Cloudflare logs:**
   - Cloudflare Dashboard → Workers & Pages
   - Click your project → Logs
   - Look for recent requests

2. **Test webhook status:**
   ```bash
   curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo"
   ```
   - Verify URL matches your domain
   - Check for error messages

3. **Monitor bot responses:**
   - Send various messages
   - Test different commands
   - Verify forwarding works

## Troubleshooting

### Issue: "No response from bot"

**Possible causes:**

1. **Webhook not activated:**
   - Re-run the `/setWebhook` command
   - Verify the response includes `"ok":true`

2. **Incorrect webhook URL:**
   - Check spelling exactly
   - Ensure https:// (not http://)
   - Verify domain from Cloudflare dashboard

3. **SECRET_TOKEN mismatch:**
   - Token in Cloudflare must match token in setWebhook command
   - No spaces or extra characters

4. **Cloudflare deployment failed:**
   - Go to Deployments tab
   - Check for error messages
   - Try redeploying

### Issue: "401 Unauthorized" errors

**Causes:**
- Bot token is incorrect
- Bot token has been regenerated (need to get new one from BotFather)
- Token is invalid or expired

**Solution:**
- Go back to @BotFather
- Use `/mybots` → select your bot → API Token
- Get a fresh token and retry

### Issue: "Webhook was set successfully but is not working"

**Steps to diagnose:**

1. **Verify webhook info:**
   ```bash
   curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"
   ```

2. **Check for errors in response:**
   - `last_error_message`
   - `last_error_date`

3. **Common webhook errors:**
   - `Connect timeout` → Cloudflare domain unreachable
   - `TLS handshake failed` → SSL certificate issue
   - `DNS resolution failed` → Domain name not resolving

4. **Reset webhook:**
   ```bash
   curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url="
   ```
   - Then re-set with fresh parameters

### Issue: "Cloudflare deployment failed"

**Check:**

1. **Deployments tab:**
   - Click on failed deployment
   - Read error messages
   - Check build logs

2. **Common failures:**
   - Git sync issues → Try manually deploying
   - Build timeout → Check if wrangler.toml is correct
   - Missing dependencies → Check package.json

3. **Recovery:**
   - Make a small change to repository
   - Push to trigger new deployment
   - Or manually trigger redeploy from Cloudflare dashboard

### Issue: "Variable not found" errors

**Solution:**

1. **Verify in Cloudflare:**
   - Workers & Pages → Project Settings
   - Environment section
   - Check Production environment
   - Verify exact variable names

2. **Redeploy after changes:**
   - Changes to environment variables require redeploy
   - Go to Deployments
   - Click "Trigger Redeploy"

3. **Variable name checklist:**
   - No extra spaces
   - Case-sensitive
   - Match exactly: `PREFIX`, `SECRET_TOKEN`

### Still Not Working?

1. **Check GitHub Issues:**
   - [open-wegram-bot Issues](https://github.com/xxmao2006-lab/open-wegram-bot/issues)

2. **Create a detailed issue:**
   - Include screenshots of Cloudflare settings
   - Bot token (sanitized)
   - Webhook URL (sanitized)
   - Error messages received
   - Cloudflare logs excerpt

3. **Verify basic setup:**
   - [ ] Bot created with @BotFather
   - [ ] Repository forked
   - [ ] Cloudflare deployment successful
   - [ ] Environment variables set
   - [ ] Webhook URL activated
   - [ ] Test message sent

## Next Steps

Once working:
- Customize bot commands and responses
- Set up message forwarding rules
- Configure admin commands
- Test with various scenarios
- Monitor bot performance

---

**Last Updated:** 2026-05-24
