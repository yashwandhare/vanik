"""Natural conversation handler for VANIK Telegram Bot (strictly bounded to VANIK)."""

from telegram import Update
from telegram.ext import ContextTypes


def is_hindi_or_hinglish(text: str) -> bool:
    """Detects if message is in Hindi (Devanagari) or conversational Hinglish."""
    if any("\u0900" <= char <= "\u097f" for char in text):
        return True
    hinglish_markers = [
        "kya",
        "kaise",
        "batao",
        "namaste",
        "pranam",
        "karo",
        "samaan",
        "khareed",
        "bhav",
        "molbhav",
        "chahiye",
        "dhokha",
        "hoga",
        "dukan",
        "kirana",
        "thok",
        "mandi",
        "paise",
        "bachat",
        "asli",
        "nakli",
        "shuru",
        "madad",
        "vyapari",
        "sasta",
        "daam",
        "mujhe",
        "apna",
        "mera",
    ]
    words = text.lower().split()
    return any(marker in words or any(marker in w for w in words) for marker in hinglish_markers)


async def natural_chat_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Answers natural language questions about VANIK in Hindi or English."""
    if not update.effective_message or not update.effective_message.text:
        return

    raw_text = update.effective_message.text.strip()
    query = raw_text.lower()
    in_hindi = is_hindi_or_hinglish(raw_text)

    # 1. Reset / Disconnect / Restart
    if any(k in query for k in ["disconnect", "reset", "restart", "shuru se", "fir se", "clear"]):
        if in_hindi:
            response = (
                "🔄 *VANIK डेमो फिर से शुरू करें!*\n\n"
                "डेमो को नए सिरे से शुरू करने के लिए `/disconnect` कमांड भेजें। "
                "यह आपकी पुरानी बातचीत और नेगोशिएशन स्टेट को रीसेट कर देगा।\n\n"
                "👉 रीसेट करने के लिए: `/disconnect`\n"
                "👉 फिर नया एजेंट बनाने के लिए: `/ganesh_kirana`"
            )
        else:
            response = (
                "🔄 *Resetting VANIK Demo State*\n\n"
                "To wipe the current session and restart the presentation from the beginning, "
                "simply send `/disconnect`.\n\n"
                "👉 Send `/disconnect` to reset, then `/ganesh_kirana` to reload the persona!"
            )

    # 2. Greeting / Introduction / What is VANIK?
    elif any(
        k in query for k in ["hi", "hello", "namaste", "pranam", "hey", "vanik", "what is", "kya"]
    ):
        if in_hindi:
            response = (
                "🌾 *VANIK स्वायत्त बी2बी मंडी नेटवर्क में आपका स्वागत है!*\n\n"
                "VANIK भारत का पहला ऐसा स्वायत्त मार्केटप्लेस है जहाँ खुदरा किराना व्यापारी "
                "और थोक सप्लायर्स के AI एजेंट्स सीधे आपस में मोलभाव (A2A negotiation) करते हैं।\n\n"
                "🔒 *मुख्य विशेषताएं:*\n"
                "• *Ed25519 डिजिटल पासपोर्ट:* हर एजेंट की पुख्ता पहचान और अधिकार सीमा\n"
                "• *जीरो-नॉलेज बजट सुरक्षा:* आपका बजट कभी किसी सेलर को नहीं बताया जाता\n"
                "• *नकली छूट और प्रॉम्प्ट इंजेक्शन से सुरक्षा:* मंडी बेंचमार्क से लाइव जांच\n\n"
                "🎬 *लाइव डेमो देखने के लिए ये स्टेप्स करें:*\n"
                "1️⃣ `/ganesh_kirana` — श्री गणेश किराना स्टोर प्रोफाइल लोड करें\n"
                "2️⃣ `/ganesh_agent` — दिवाली खरीद एजेंट और पासपोर्ट बनाएं\n"
                "3️⃣ `/task` — 40 दिवाली प्रोडक्ट्स का थोक मोलभाव शुरू करें\n"
                "4️⃣ `/miniapp` — मिनी ऐप में लाइव राउंड्स और डील्स देखें\n"
                "5️⃣ `/auth_deal` — बेस्ट डील को मंज़ूरी देकर पेमेंट लॉक करें\n"
                "6️⃣ `/test` — मैलेशियस सेलर के हमले को नाकाम होते देखें"
            )
        else:
            response = (
                "🌾 *Welcome to VANIK B2B Autonomous Mandi Network!*\n\n"
                "VANIK is an A2A commerce protocol connecting retail kirana store owners\n"
                "with wholesale distributors. Autonomous agents discover and negotiate\n"
                "in parallel, structuring cryptographic commitments for human auth.\n\n"
                "💡 *Live Demo Workflow for Judges:*\n"
                "• Send `/ganesh_kirana` to onboard Shree Ganesh Kirana Store\n"
                "• Send `/ganesh_agent` to spawn your autonomous buyer agent\n"
                "• Send `/task` to dispatch parallel negotiations across sellers\n"
                "• Send `/miniapp` to open the interactive mini app\n"
                "• Send `/auth_deal` to lock payment and rate counterparty\n"
                "• Send `/test` to simulate red-team adversarial seller defense\n"
                "• Send `/disconnect` anytime to restart demo cleanly!"
            )

    # 3. Agent Passports / Identity / Security
    elif any(k in query for k in ["passport", "agent", "ed25519", "key", "pehechan", "pehchan"]):
        if in_hindi:
            response = (
                "🛡️ *VANIK क्रिप्टोग्राफिक एजेंट पासपोर्ट*\n\n"
                "हर स्वायत्त ट्रेडिंग एजेंट को एक पुख्ता Ed25519 डिजिटल की-पेयर और पासपोर्ट मिलता है:\n"
                "• *अधिकार सीमा (Scopes):* `request_quote`, `counter_offer`, `place_order`\n"
                "• *बजट सीमा:* ₹85,000.00 की अधिकतम सीमा से अधिक खर्च नहीं हो सकता\n"
                "• *मंडी प्रतिष्ठा (Reputation):* पिछले पूरे हुए सौदों के आधार पर स्टार रेटिंग\n\n"
                "👉 अपना एजेंट बनाने के लिए `/ganesh_agent` भेजें, या "
                "[वेब डैशबोर्ड में पासपोर्ट देखें](http://localhost:3000/agents)!"
            )
        else:
            response = (
                "🛡️ *Cryptographic Agent Passports in VANIK*\n\n"
                "Every autonomous trading agent is minted with an immutable Ed25519 keypair "
                "and signed capability bounds:\n"
                "• *Delegation Scopes:* `request_quote`, `counter_offer`, `place_order`\n"
                "• *Authority Bounds:* Spend ceiling (e.g. ₹85,000 max)\n"
                "• *Reputation Score:* Dynamic star rating based on settled trade memory\n\n"
                "👉 Send `/ganesh_agent` to mint your live agent passport, or inspect "
                "[Agent Passports in Dashboard](http://localhost:3000/agents)!"
            )

    # 4. Negotiations / Deals / SKUs / Bargaining
    elif any(
        k in query for k in ["negotiat", "bargain", "round", "task", "deal", "sasta", "molbhav"]
    ):
        if in_hindi:
            response = (
                "⚡ *स्वायत्त पैरेलल नेगोशिएशन (Parallel Bargaining)*\n\n"
                "जब आप खरीद का आदेश देते हैं, तो आपका खरीद एजेंट:\n"
                "1. कई थोक सप्लायर्स को एक साथ स्ट्रक्चर्ड RFQ भेजता है\n"
                "2. आपका बजट पूरी तरह गोपनीय रखता है (Zero-Knowledge Masking)\n"
                "3. 40 दिवाली प्रोडक्ट्स के सरकारी मंडी बेंचमार्क से तुलना करता है\n"
                "4. वॉल्यूम का फायदा उठाकर सप्लायर्स से बेहतर रेट की मांग करता है\n"
                "5. बेस्ट डील (कीमत, डिलीवरी समय, क्रेडिट) की सिफारिश करता है\n\n"
                "👉 नेगोशिएशन शुरू करने के लिए `/task` भेजें, या "
                "[लाइव नेगोशिएशन डेक देखें](http://localhost:3000/negotiations?tab=timeline)!"
            )
        else:
            response = (
                "⚡ *Autonomous Parallel Negotiation Engine*\n\n"
                "When you launch a procurement mandate, your buyer agent:\n"
                "1. Broadcasts structured RFQs to eligible wholesale sellers simultaneously\n"
                "2. Strictly *masks* your maximum reservation budget from counterparties\n"
                "3. Analyzes competing quotes against 40-SKU trusted Mandi benchmark prices\n"
                "4. Issues multi-round automated counter-offers leveraging basket volume\n"
                "5. Recommends the optimal deal (Price 40%, Reliability 25%, Delivery 20%)\n\n"
                "👉 Send `/task` to watch parallel rounds converge, or view the "
                "[Live Negotiation Workspace](http://localhost:3000/negotiations?tab=timeline)!"
            )

    # 5. Malicious / Fake Discounts / Security / Prompt Injection
    elif any(
        k in query for k in ["malicious", "attack", "injection", "fake", "security", "dhokha"]
    ):
        if in_hindi:
            response = (
                "🚨 *धोखाधड़ी और प्रॉम्प्ट इंजेक्शन से सुरक्षा*\n\n"
                "VANIK आपके एजेंट को बेईमान विक्रेताओं से सुरक्षित रखता है:\n"
                "1. *फर्जी डिस्काउंट सुरक्षा:* अगर सेलर दाम बढ़ाकर 40% डिस्काउंट का दावा करता है, "
                "तो मंडी बेंचमार्क इंजन तुरंत फर्जीवाड़े को पकड़ लेता है।\n"
                "2. *प्रॉम्प्ट इंजेक्शन ब्लॉकिंग:* सेलर के फ्री-टेक्स्ट नोट्स को अलग रखा जाता है; "
                "खरीदार एजेंट कभी भी सेलर के लिखे टेक्स्ट निर्देशों पर अमल नहीं करता।\n\n"
                "👉 लाइव रेड-टीम अटैक टेस्ट देखने के लिए `/test` भेजें!"
            )
        else:
            response = (
                "🚨 *Adversarial Red-Team Seller Defense*\n\n"
                "VANIK defends buyer agents against adversarial marketplace participants:\n"
                "1. *Fake Discount Protection:* Deterministic validator compares line prices "
                "against trusted Mandi benchmark ledger, catching inflated reference prices.\n"
                "2. *Prompt Injection Neutralization:* Free-text seller notes are strictly "
                "quarantined; buyer agents never execute directives parsed from untrusted text.\n\n"
                "👉 Send `/test` to trigger a simulated malicious seller attack and observe "
                "the buyer agent turn down and quarantine the adversary!"
            )

    # 6. Payment / Settlement / UPI / Escrow
    elif any(k in query for k in ["pay", "settle", "escrow", "upi", "rtgs", "contact", "paise"]):
        if in_hindi:
            response = (
                "💳 *सुरक्षित भुगतान और कांटेक्ट शेयरिंग*\n\n"
                "जब आप बेस्ट डील को मंज़ूरी देते हैं:\n"
                "• *पेमेंट ऑप्शन्स:* UPI Instant, Mandi Smart Escrow (सुरक्षित), या RTGS\n"
                "• *मानवीय मंज़ूरी (Human Auth):* बिना आपकी मंज़ूरी (`/auth_deal`) कोई भुगतान नहीं\n"
                "• *कांटेक्ट एक्सचेंज:* डील पक्की होने के बाद दोनों व्यापारियों के नंबर मिलते हैं\n"
                "• *सेलर रेटिंग:* आपका एजेंट सेलर को मंडी लेजर पर स्टार रेटिंग देता है!\n\n"
                "👉 डील मंज़ूर करने के लिए `/auth_deal` भेजें या `/miniapp` खोलें।"
            )
        else:
            response = (
                "💳 *Human-Authorized Settlement & Contact Exchange*\n\n"
                "When a winning deal is finalized:\n"
                "• *Payment Methods:* Pick UPI Instant (`kisan.wholesale@okicici`), "
                "Mandi Smart Escrow (funds locked until delivery verified), or RTGS Net Banking.\n"
                "• *Principal Challenge:* Deal terms bind to SHA256 basket hash and require "
                "one-touch authorization (`/auth_deal` or in the Mini App).\n"
                "• *Contact Exchange:* Verified counterparties share contacts for delivery.\n"
                "• *Buyer Rating:* Buyer agent automatically rates the seller on the Mandi ledger!"
            )

    # 7. Mini App specific queries
    elif any(k in query for k in ["mini", "app", "miniapp", "ui", "mobile"]):
        if in_hindi:
            response = (
                "📱 *VANIK टेलीग्राम मिनी ऐप*\n\n"
                "मिनी ऐप में आप लाइव नेगोशिएशन राउंड्स, सप्लायर्स की तुलना और डील अप्रूवल देख सकते हैं।\n\n"
                "👉 मिनी ऐप खोलने के लिए `/miniapp` भेजें!"
            )
        else:
            response = (
                "📱 *VANIK Interactive Mini App*\n\n"
                "You can inspect negotiation rounds, multi-seller matrices, and approve deals "
                "directly in the visual Mini App interface.\n\n"
                "👉 Send `/miniapp` to open the Mini App launch deck!"
            )

    # Default fallback
    else:
        if in_hindi:
            response = (
                "🌾 *VANIK स्वायत्त मंडी सहायक*\n\n"
                "मैं VANIK मार्केटप्लेस, एजेंट पासपोर्ट्स और थोक मोलभाव के लिए उपलब्ध हूँ।\n\n"
                "💡 *ये कमांड्स इस्तेमाल करें:*\n"
                "• `/ganesh_kirana` — किराना स्टोर ऑनबोर्ड करें\n"
                "• `/ganesh_agent` — खरीद एजेंट बनाएं\n"
                "• `/task` — 40 SKUs का मोलभाव शुरू करें\n"
                "• `/miniapp` — मिनी ऐप खोलें\n"
                "• `/auth_deal` — डील फाइनल करें\n"
                "• `/test` — सुरक्षा टेस्ट करें\n"
                "• `/disconnect` — डेमो रीसेट करें"
            )
        else:
            response = (
                "🌾 *VANIK B2B Mandi Assistant*\n\n"
                "I specialize exclusively in autonomous wholesale procurement, agent passports, "
                "Mandi negotiations, and trade settlements on VANIK.\n\n"
                "💡 *Try these live demo commands:*\n"
                "• `/ganesh_kirana` — Onboard Shree Ganesh Kirana Store\n"
                "• `/ganesh_agent` — Spawn Diwali procurement agent\n"
                "• `/task` — Launch parallel negotiations\n"
                "• `/miniapp` — Open interactive Mini App\n"
                "• `/auth_deal` — Authorize payment and rate seller\n"
                "• `/test` — Simulate malicious seller attack\n"
                "• `/disconnect` — Reset demo state from start\n"
                "• `/help` — Command directory"
            )

    await update.effective_message.reply_text(
        response, parse_mode="Markdown", disable_web_page_preview=True
    )
