# 完整部署指南 - open-wegram-bot

## 📋 目录
1. [自动化部署（推荐）](#自动化部署推荐)
2. [手动部署步骤](#手动部署步骤)
3. [验证部署](#验证部署)
4. [故障排查](#故障排查)
5. [秘密轮换](#秘密轮换)
6. [多环境部署](#多环境部署)

---

## 自动化部署（推荐）

### 前置要求
```bash
npm install -g wrangler
wrangler login
```

### 一键部署
```bash
bash deploy-setup.sh production
```

脚本会自动：
1. ✅ 检查 wrangler 是否安装
2. ✅ 验证 Cloudflare 认证状态
3. ✅ 生成 32 字节随机 SECRET_TOKEN
4. ✅ 提示输入 TG_TOKEN（从 @BotFather）
5. ✅ 提示输入 GROUP_ID（目标群组 ID）
6. ✅ 部署所有秘密到 Cloudflare Workers
7. ✅ 部署 Worker 代码
8. ✅ 显示 Worker URL
9. ✅ 提示注册 Telegram webhook

---

## 手动部署步骤

### 第 1 步：安装工具
```bash
npm install -g wrangler
wrangler login  # 按提示打开浏览器认证
```

### 第 2 步：获取 Telegram Bot Token

1. 打开 Telegram，搜索 `@BotFather`
2. 发送 `/start`
3. 发送 `/mybots`
4. 选择您的机器人
5. 点击「API Token」
6. 复制 token（格式：`123456:ABC-DEF...`）

**保存为**：`TG_TOKEN`

### 第 3 步：生成 SECRET_TOKEN

选择以下任一方法生成 32 字节随机数据：

**方法 A - Node.js**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**方法 B - Python**
```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

**方法 C - Bash (macOS/Linux)**
```bash
openssl rand -hex 32
```

**方法 D - PowerShell (Windows)**
```powershell
[Convert]::ToHexString((1..32 | ForEach-Object {[byte]$((Get-Random -Minimum 0 -Maximum 256))})).ToLower()
```

**保存为**：`SECRET_TOKEN`（64 个十六进制字符）

### 第 4 步：获取 GROUP_ID

1. 添加您的机器人到目标群组或频道
2. 在群组中发送任意消息
3. 在终端运行：
```bash
curl "https://api.telegram.org/bot<TG_TOKEN>/getUpdates" | grep chat_id
```
（替换 `<TG_TOKEN>` 为您的实际 token）

4. 查看输出中的 `chat_id` 值（通常是负数）

**保存为**：`GROUP_ID`

### 第 5 步：部署秘密到 Cloudflare

```bash
# 部署 SECRET_TOKEN
wrangler secret put SECRET_TOKEN --env production
# 粘贴第 3 步生成的 64 个十六进制字符

# 部署 TG_TOKEN
wrangler secret put TG_TOKEN --env production
# 粘贴第 2 步复制的 token

# 部署 GROUP_ID
wrangler secret put GROUP_ID --env production
# 粘贴第 4 步获取的群组 ID
```

### 第 6 步：部署 Worker 代码

```bash
wrangler deploy --env production
```

记下输出中的 Worker URL（格式：`https://open-wegram-bot.yourname.workers.dev`）

### 第 7 步：注册 Telegram Webhook

```bash
curl -X POST \
  https://api.telegram.org/bot<TG_TOKEN>/setWebhook \
  -H "Content-Type: application/json" \
  -d '{
    "url": "<WORKER_URL>/",
    "secret_token": "<SECRET_TOKEN>"
  }'
```

**替换**：
- `<TG_TOKEN>` → 第 2 步的 token
- `<WORKER_URL>` → 第 6 步的 Worker URL
- `<SECRET_TOKEN>` → 第 3 步生成的密钥

**成功响应**：
```json
{"ok":true,"result":true,"description":"Webhook was set"}
```

---

## 验证部署

### 检查 1：查看实时日志
```bash
wrangler tail --env production
```

应该看到类似输出：
```
[timestamp] [requestId] [Success] Webhook processed in 123ms
```

### 检查 2：测试消息转发

1. 打开 Telegram 机器人的私聊窗口
2. 发送任意消息（例如：「测试」）
3. 应该收到回复：「放这了。」
4. 检查目标群组，消息应该出现在那里

### 检查 3：验证认证

```bash
# 测试无效秘密令牌（应该返回 200 但被拒绝）
curl -X POST \
  https://<WORKER_URL>/ \
  -H "X-Telegram-Bot-Api-Secret-Token: invalid" \
  -H "Content-Type: application/json" \
  -d '{"message":{"text":"test"}}'
```

查看日志应该显示：
```
[Security Alert] Unauthorized webhook payload blocked
```

---

## 故障排查

### 问题 1: "Secret not found"

**原因**：环境变量未正确部署

**解决方案**：
```bash
# 重新部署
wrangler secret put SECRET_TOKEN --env production
wrangler secret put TG_TOKEN --env production
wrangler secret put GROUP_ID --env production

# 验证
wrangler secret list --env production
```

### 问题 2: "Webhook URL is unreachable"

**原因**：Worker 未部署或 URL 不正确

**解决方案**：
```bash
# 检查 Worker URL
wrangler deployments list --env production

# 重新部署
wrangler deploy --env production

# 重新注册 webhook
curl -X POST https://api.telegram.org/bot<TOKEN>/setWebhook -d url=<CORRECT_URL>
```

### 问题 3: "copyMessage: CHAT_NOT_FOUND"

**原因**：GROUP_ID 不正确或机器人不在群组中

**解决方案**：
1. 验证 GROUP_ID 是否正确
2. 确保机器人是群组管理员
3. 重新添加机器人到群组
4. 重新部署 GROUP_ID

### 问题 4: 消息没有出现

**原因**：可能是多个原因

**诊断步骤**：
```bash
# 1. 查看实时日志
wrangler tail --env production

# 2. 查看完整日志
wrangler tail --env production --follow

# 3. 检查 Telegram 机器人状态
curl https://api.telegram.org/bot<TOKEN>/getMe

# 4. 检查 webhook 状态
curl https://api.telegram.org/bot<TOKEN>/getWebhookInfo
```

### 问题 5: "Timeout Emergency"

**原因**：Telegram API 响应超过 5 秒

**解决方案**：
1. 检查网络连接
2. 等待 Telegram 服务恢复
3. 重试消息转发

（此错误是暂时性的，会自动恢复）

---

## 秘密轮换

### 轮换 SECRET_TOKEN（每 30-90 天）

```bash
# 1. 生成新密钥
new_token=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
echo "New token: $new_token"

# 2. 部署新密钥
echo $new_token | wrangler secret put SECRET_TOKEN --env production

# 3. 更新 Telegram webhook
curl -X POST \
  https://api.telegram.org/bot<TG_TOKEN>/setWebhook \
  -d secret_token=$new_token \
  -d url=<WORKER_URL>

# 4. 验证
wrangler tail --env production
```

### 轮换 TG_TOKEN（每季度）

```bash
# 1. 在 @BotFather 中撤销旧 token
#    /start -> /mybots -> select bot -> /revoke

# 2. 获取新 token（同上）

# 3. 部署新 token
wrangler secret put TG_TOKEN --env production

# 4. 重新注册 webhook
curl -X POST https://api.telegram.org/bot<NEW_TOKEN>/setWebhook -d url=<WORKER_URL>

# 5. 验证
wrangler tail --env production
```

---

## 多环境部署

### 部署到 Staging

```bash
# 部署 staging 秘密
wrangler secret put SECRET_TOKEN --env staging
wrangler secret put TG_TOKEN --env staging
wrangler secret put GROUP_ID --env staging

# 部署 staging Worker
wrangler deploy --env staging

# 查看 staging 日志
wrangler tail --env staging
```

### 同时运行生产和测试

在 `wrangler.toml` 中定义不同的环境：

```toml
[env.production]
vars = { ENVIRONMENT = "production", PREFIX = "" }

[env.staging]
vars = { ENVIRONMENT = "staging", PREFIX = "staging_" }
```

这样：
- 生产环境：日志没有前缀，用户消息直接转发
- 测试环境：日志前缀为 `staging_`，用户消息转发到测试群组

---

## 紧急���作

### 立即暂停机器人

```bash
# 删除 webhook
curl -X POST https://api.telegram.org/bot<TOKEN>/deleteWebhook
```

（机器人会停止接收新消息）

### 恢复机器人

```bash
# 重新注册 webhook
curl -X POST https://api.telegram.org/bot<TOKEN>/setWebhook -d url=<WORKER_URL> -d secret_token=<SECRET_TOKEN>
```

### 完全禁用（30 分钟内）

在 Cloudflare Workers 控制面板中：
1. 进入 Worker 详情页
2. 点击「Settings」
3. 点击「Disable」

---

## 安全检查清单

- [ ] SECRET_TOKEN 从不在日志中出现
- [ ] TG_TOKEN 从不在源代码中出现
- [ ] 所有秘密通过 `wrangler secret` 部署
- [ ] `.env` 文件在 `.gitignore` 中
- [ ] 没有秘密被提交到 git
- [ ] 每月检查一次 Cloudflare 日志中是否有安全警告
- [ ] 每季度轮换一次 TG_TOKEN
- [ ] 每月轮换一次 SECRET_TOKEN

---

## 需要帮助？

- 查看 Telegram Bot API 文档：https://core.telegram.org/bots/api
- 查看 Cloudflare Workers 文档：https://developers.cloudflare.com/workers/
- 查看项目 MANIFESTO：见 MANIFESTO.md
