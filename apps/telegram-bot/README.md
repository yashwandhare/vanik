# VANIK Telegram Bot & Mini App

Telegram integration service providing conversational assistance, trade dispatch, deal authorization, and responsive Mini App interfaces.

---

## 1. Capabilities

- **Conversational Mandi Assistant:** Natural language assistance in English, Hindi, and conversational Hinglish.
- **Account Linking:** Cryptographic account binding using single-use verification codes (`/link <CODE>`).
- **Autonomous Mandate Dispatch:** Launch parallel multi-seller procurement mandates directly from chat (`/task`).
- **Cryptographic Deal Authorization:** One-touch human authorization with UPI, Mandi Smart Escrow, or RTGS (`/auth_deal`).
- **Adversarial Red-Team Defense:** On-demand simulation of malicious seller attacks, showing benchmark fake discount detection and prompt injection quarantine (`/test`).
- **Interactive Mini App:** Dedicated Telegram WebApp interface (`/miniapp` and chat menu button) with 6 visual tabs: Mandate, Passport, Rounds, Offers, Approve, and A2A Protocol.

---

## 2. Slash Commands

| Command | Description |
|---|---|
| `/start` | Welcome onboarding guide and deep link handler |
| `/ganesh_kirana` | Quick-load Shree Ganesh Kirana Store persona |
| `/ganesh_agent` | Spawn verified Kirana Buyer Agent with Ed25519 keys |
| `/task [MANDATE]` | Deploy 40-SKU procurement mandate across wholesale sellers |
| `/miniapp` | Launch interactive Telegram Mini App |
| `/sale [SKU] [PRICE] [QTY]` | Put wholesale items on sale live from Telegram (Seller) |
| `/auth_deal [DEAL] [METHOD]` | Cryptographically authorize winning deal and submit seller rating |
| `/test` | Simulate adversarial seller attack and observe buyer defenses |
| `/disconnect` | Reset session state to rerun demonstration from scratch |
| `/status` | Check agent and market status |
| `/help` | Complete command reference |

---

## 3. Setup and Execution

Run commands from the repository root:

```bash
# Install bot dependencies
uv --directory apps/telegram-bot sync --locked

# Run test suite
make test-bot

# Run linter checks
make lint-bot

# Start bot worker process
uv --directory apps/telegram-bot run python -m bot.main
```
