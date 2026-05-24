# 系统架构与设计文档 - open-wegram-bot

## 📚 目录
1. [系统分型](#系统分型)
2. [消息生命周期](#消息生命周期)
3. [关键约束](#关键约束)
4. [API 参考](#api-参考)
5. [错误处理](#错误处理)
6. [运营指南](#运营指南)

---

## 系统分型

### 官方定义

**系统类型**：Ephemeral Edge Event Sink（瞬时边缘事件终端）

```
┌─────────────────┐
│  User (Telegram)│
│   Private Chat  │
└────────┬────────┘
         │ POST /webhook
         ↓
┌──────────────────────────────────┐
│  Cloudflare Worker (Edge)        │
│  - Verify Secret Token (5 sec)   │
│  - Extract Message               │
│  - Route to Group                │
│  - Return 200 (always)           │
└──────────────┬───────────────────┘
               │
               ├─→ Telegram API
               │   - sendMessage (ack)
               │   - copyMessage (forward)
               │
               └─→ /dev/null
                   (message discarded after)
```

### 执行模型

| 特性 | 值 | 含义 |
|------|-----|------|
| **Compute** | Stateless | 每个请求完全独立，无内存共享 |
| **Storage** | None | 无数据库、无缓存、无文件系统 |
| **Delivery** | At-most-once | 消息最多被转发一次，失败不重试 |
| **Ordering** | None | 消息顺序不保证，完全独立处理 |
| **Observability** | Post-hoc logs only | 只能查看历史日志，无实时观测 |
| **Control** | Human operator | 运营者可随时暂停/恢复 |

---

## 消息生命周期

### 阶段 1: 接收（Ingestion）

```
Telegram → X-Telegram-Bot-Api-Secret-Token → Cloudflare Edge
                      ↓
              Verify Secret (timing-safe compare)
                      ↓
           ✅ Valid → Continue
           ❌ Invalid → Return 200 (discard)
```

**关键点**：
- 请求头必须包含 `X-Telegram-Bot-Api-Secret-Token`
- 秘密比较使用 `timingSafeEqual` 防时序攻击
- 所有错误返回 200（防止 webhook 重试风暴）

### 阶段 2: 解析（Parsing）

```
JSON Body → request.json()
       ↓
Parse Error → Discard (return 200)
       ↓
Valid JSON → Extract message
       ↓
🔹 msg.chat.type (must be "private")
🔹 msg.text or msg.caption
🔹 msg.message_id
🔹 msg.chat.id
```

**关键点**：
- 只处理私聊消息（群组消息被忽略）
- 仅支持文本或带文本的媒体
- 每个字段都被验证

### 阶段 3: 执行（Execution）

```
┌─ Command Handler
│  /start → send welcome message
│
├─ Content Handler
│  extract text/caption
│  send acknowledgment "放这了"
│
└─ Transport Handler
   copyMessage to group
   message is now in group
```

**关键点**：
- 命令在入口被拦截
- 文本被精确提取一次
- `copyMessage` 确保完全匿名

### 阶段 4: 消失（Ephemeral）

```
After sendReply() + sendToGroup():
        ↓
  Worker returns 200
        ↓
  Request ends
        ↓
  Message object discarded
        ↓
  Memory freed
        ↓
  No trace in Worker (only Telegram has copy)
```

**关键点**：
- Worker 内存完全释放
- 无持久化存储
- 无审计日志（除了 Cloudflare 系统日志）
- 用户数据完全从系统消失

---

## 关键约束

### 约束 #1: NO RETRY

**定义**：失败的操作永远不会被重新执行

**实现**：
```javascript
try {
  await sendToGroup(...);
} catch (error) {
  console.error(error);
  // ❌ NO retry loop
  // ❌ NO exponential backoff
  // ❌ NO dead letter queue
  throw error;  // Fail and move on
}
```

**后果**：
- 消息可能丢失（如果 Telegram API 失败）
- 用户不会被通知重试
- 这是**可接受的**按照 Manifesto

### 约束 #2: NO PERSISTENCE

**定义**：任何数据都不会被保存到磁盘或数据库

**实现**：
```javascript
// ❌ NO database queries
// ❌ NO file writes
// ❌ NO localStorage
// ❌ NO caching
// ✅ ONLY memory (which is freed after request)
```

**后果**：
- 无法查询过去的消息
- 无法恢复丢失的消息
- 完全匿名（无用户记录）

### 约束 #3: NO RECOVERY SEMANTICS

**定义**：系统不定义失败如何恢复

**实现**：
```javascript
if (!res.ok) {
  // ❌ NO error code mapping
  // ❌ NO fallback strategies
  // ❌ NO compensation logic
  console.error(`Failed: ${res.status}`);
  // That's it. No recovery.
}
```

**后果**：
- 错误时消息永久丢失
- 无法区分 "暂时失败" vs "永久失败"
- 运营者必须手动恢复

### 约束 #4: NO ORDERING GUARANTEES

**定义**：消息顺序不保证

**实现**：
```javascript
// Each message is processed independently
// No queue, no sequence numbers
// Telegram webhook may deliver out-of-order
// This is acceptable
```

**后果**：
- 用户 A 发送消息 1, 然后 2
- 它们可能以 2, 1 的顺序出现在��组
- 这不会被修复

### 约束 #5: TIMEOUT HARD LIMIT

**定义**：所有外部 API 调用必须在 5 秒内完成

**实现**：
```javascript
const controller = new AbortController();
setTimeout(() => controller.abort(), 5000);
await fetch(url, { signal: controller.signal });
```

**后果**：
- Telegram API 响应超过 5 秒 → 消息丢失
- 不会重试，不会等待
- 这是**工程选择**（Worker 资源限制）

---

## API 参考

### 入口: POST /

**请求**：
```
POST / HTTP/1.1
Host: open-wegram-bot.workers.dev
X-Telegram-Bot-Api-Secret-Token: <SECRET_TOKEN>
Content-Type: application/json

{
  "message": {
    "message_id": 12345,
    "date": 1234567890,
    "chat": {
      "id": 987654321,
      "type": "private",
      "username": "username"
    },
    "text": "这是一条消息"
  }
}
```

**响应**（总是 200）：
```
HTTP/1.1 200 OK
Content-Type: text/plain

OK
```

**日志**：
```
[uuid] [Success] Webhook processed in 123ms
[uuid] [Telegram API] Message copied to group successfully
```

### 内部: sendToGroup()

**调用**：
```javascript
await sendToGroup(
  token,      // "8578110215:AAGdluxQxK3..."
  groupId,    // "-1001234567890"
  message,    // Telegram message object
  requestId   // UUID for tracing
);
```

**效果**：
```
POST https://api.telegram.org/bot{token}/copyMessage
Content-Type: application/json

{
  "chat_id": "-1001234567890",
  "from_chat_id": 987654321,
  "message_id": 12345
}
```

**Telegram API 响应**：
```json
{
  "ok": true,
  "result": {
    "message_id": 99999,
    "...": "..."
  }
}
```

**失败情况**：
- `400 Bad Request` → 参数错误（群组 ID 格式不对）
- `401 Unauthorized` → token 无效
- `403 Forbidden` → 机器人不在群组
- `429 Too Many Requests` → 速率限制
- `500+ Server Error` → Telegram 故障

**所有失败都导致消息丢失**（不重试）

---

## 错误处理

### 错误分类

| 类型 | 例子 | 处理方式 | 结果 |
|------|------|--------|------|
| **验证错误** | 无效秘密令牌 | 返回 200，不处理 | 消息丢失 |
| **解析错误** | 格式错误的 JSON | 返回 200，不处理 | 消息丢失 |
| **API 错误** | Telegram 403 Forbidden | 记录，不重试 | 消息丢失 |
| **超时** | > 5 秒无响应 | 中止请求 | 消息丢失 |
| **系统错误** | Worker OOM | 返回 200，崩溃恢复 | 消息可能丢失 |

### 错误日志示例

```
❌ [a1b2c3d4] [Security Alert] Unauthorized webhook payload blocked
❌ [e5f6g7h8] [Parse Error] Invalid JSON in webhook payload
❌ [i9j0k1l2] [Telegram API] copyMessage failed: HTTP 403 - Not a member
❌ [m3n4o5p6] [Timeout] Telegram API exceeded 5000ms - request aborted
```

### 日志分析

**关键指标**：
- `[Success]` 出现率（应该 > 99%）
- `[Security Alert]` 频率（应该很少）
- `[Timeout]` 频率（应该 < 0.1%）
- `[Telegram API] Error` 类型分布

**查看日志**：
```bash
wrangler tail --env production --follow
```

---

## 运营指南

### 正常操作

```
每天：
[ ] 检查日志中是否有 [Security Alert]
[ ] 观察 [Success] vs [Error] 比率

每周：
[ ] 查看群组中新消息数量（应该逐渐增加或稳定）
[ ] 检查是否有消息转发失败的模式

每月：
[ ] 轮换 SECRET_TOKEN
[ ] 检查 Cloudflare 账单
[ ] 验证机器人在群组中的权限
```

### 异常情况处理

**情况 1: 突然出现大量 [Timeout]**

→ Telegram 服务可能故障，等待恢复

**情况 2: [Security Alert] 频繁出现**

→ 可能有人在尝试暴力破解，轮换 SECRET_TOKEN

**情况 3: copyMessage 返回 403**

→ 机器人被移出群组或权限被改变，需要重新添加

**情况 4: 消息转发延迟增加**

→ 可能是 Telegram API 性能下降，暂时等待

### 暂停和恢复

**暂停（立即停止接收消息）**：
```bash
# 删除 webhook
curl -X POST https://api.telegram.org/bot<TOKEN>/deleteWebhook
```

**恢复**：
```bash
# 重新注册 webhook
curl -X POST https://api.telegram.org/bot<TOKEN>/setWebhook \
  -d url=<WORKER_URL> \
  -d secret_token=<SECRET_TOKEN>
```

**关机**（Cloudflare 控制面板）：
Worker 详情 → Settings → Disable

### 秘密管理

**轮换计划**：
- SECRET_TOKEN: 每 30 天
- TG_TOKEN: 每 90 天（通过 @BotFather 撤销）

**轮换步骤**：
1. 生成新秘密
2. 部署到 Cloudflare
3. 更新 Telegram webhook
4. 验证新秘密生效
5. 可选：删除旧秘密日志

---

## Manifesto 遵循检查清单

- [x] NO retry logic
- [x] NO persistence
- [x] NO recovery semantics
- [x] NO ordering guarantees
- [x] Ephemeral execution (memory freed after request)
- [x] At-most-once delivery
- [x] Graceful degradation (200 on all errors)
- [x] Human-controlled pausing
- [x] Secret token verification (timing-safe)
- [x] 5-second hard timeout

✅ 系统完全遵循 Manifesto 的约束
