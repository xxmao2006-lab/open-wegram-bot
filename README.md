# open-wegram-bot

A Telegram bot with stable bidirectional forwarding capabilities, deployed on Cloudflare Workers.

## Features

✨ **Key Features:**
- 🔄 Stable bidirectional message forwarding
- ☁️ Serverless deployment on Cloudflare Workers
- 🚀 One-click deployment workflow
- 🔐 Secure webhook configuration
- 📱 Telegram integration via BotFather
- ✅ Easy setup and configuration

## Prerequisites

Before you begin, ensure you have:

- [GitHub Account](https://github.com) - For repository access
- [Cloudflare Account](https://cloudflare.com) - For Workers deployment
- [Telegram Account](https://telegram.org) - For bot setup
- Basic knowledge of Telegram bots

## Quick Start

### Step 1: Preparation

1. **Register Accounts:**
   - Create a [Cloudflare account](https://dash.cloudflare.com/sign-up)
   - Ensure you have a [GitHub account](https://github.com/signup)

2. **Create Telegram Bot:**
   - Find [@BotFather](https://t.me/BotFather) on Telegram
   - Send `/start` and follow the prompts to create a new bot
   - 📌 **Save your bot token** (you'll need this later)

3. **Get Your User ID:**
   - Find [@userinfobot](https://t.me/userinfobot) on Telegram
   - Send any message to receive your user ID
   - 📌 **Save your user ID**

### Step 2: One-Click Deployment

1. **Fork the Repository:**
   - Go to [open-wegram-bot](https://github.com/xxmao2006-lab/open-wegram-bot)
   - Click the **Fork** button in the top-right corner
   - Select your account as the destination

2. **Connect to Cloudflare:**
   - Log in to [Cloudflare Dashboard](https://dash.cloudflare.com)
   - Navigate to **Workers & Pages**
   - Click **Connect Git**
   - Authorize Cloudflare to access your GitHub repositories
   - Select your forked `open-wegram-bot` repository

### Step 3: Configure Environment Variables

1. **In the Cloudflare deployment interface, add these variables:**

| Variable | Description | Example |
|----------|-------------|----------|
| `PREFIX` | Command prefix for your bot | `/` or `!` |
| `SECRET_TOKEN` | Webhook security token (minimum 16 characters) | `MySecureToken1234567890` |

2. **Security Note:**
   - Make `SECRET_TOKEN` complex and random
   - Minimum 16 characters recommended
   - Use a combination of uppercase, lowercase, numbers, and symbols

3. **Deploy:**
   - Cloudflare will automatically build and deploy your bot
   - ✅ Wait for the deployment to complete
   - Cloudflare will assign a free domain: `https://<project-name>.<username>.workers.dev`
   - 📌 **Save this webhook URL**

### Step 4: Activate Webhook

1. **Get Your Webhook URL:**
   - Format: `https://<project-name>.<username>.workers.dev`
   - This URL is assigned after successful Cloudflare deployment

2. **Activate the Webhook:**
   - Send a request to activate:
   ```
   https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=<YOUR_WEBHOOK_URL>&secret_token=<YOUR_SECRET_TOKEN>
   ```
   - Replace:
     - `<YOUR_BOT_TOKEN>` with the token from BotFather
     - `<YOUR_WEBHOOK_URL>` with your Cloudflare domain
     - `<YOUR_SECRET_TOKEN>` with the SECRET_TOKEN you set in Step 3

3. **Test Your Bot:**
   - Send "Hello" to your bot on Telegram
   - ✅ If you receive a response, the webhook is working!
   - 🎉 Your bot is now live!

## Configuration

### Environment Variables Reference

```bash
# Telegram bot token (obtained from @BotFather)
TELEGRAM_BOT_TOKEN=<your_bot_token>

# Your Telegram user ID (for admin commands)
ADMIN_USER_ID=<your_user_id>

# Webhook prefix for commands
PREFIX=/

# Webhook security token (minimum 16 characters)
SECRET_TOKEN=<secure_random_string>
```

## Features & Capabilities

The bot provides stable bidirectional forwarding, making it suitable for:

- ↔️ Connecting Telegram with other messaging platforms
- 🔀 Message relay and forwarding
- 💬 Two-way communication bridges
- 🛡️ Secure webhook-based architecture

## Troubleshooting

### Webhook Not Connecting
- Verify the webhook URL format is correct
- Ensure `SECRET_TOKEN` matches in both Cloudflare and Telegram
- Check that the Cloudflare Workers deployment is successful

### Bot Not Responding
- Confirm your bot token is correct
- Test the webhook with: `/setWebhook` endpoint
- Check Cloudflare Workers logs for errors

### Environment Variables Not Loading
- Double-check variable names are exact matches
- Re-deploy after adding/modifying variables
- Clear your browser cache

## Support

For issues or questions:
1. Check this README first
2. Review [GitHub Issues](../../issues)
3. Create a new issue with detailed information

## License

MIT License - See [LICENSE](LICENSE) file for details

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

**Last Updated:** 2026-05-24
