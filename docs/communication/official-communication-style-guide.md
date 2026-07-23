# Official Communication Style Guide

**KC-0099 — Communication Operating System (product charter)**

Official Communications are not CRM templates. They are the organisation’s approved language for coordination that motivates, guides, and strengthens relationships while advancing campaign execution.

Karkun Connect is only the facilitator. The campaign — and the shared mission of **اقامتِ دین** — remains the centre.

---

## Principles

Every Official Communication must be:

| English | Urdu |
|---------|------|
| Respectful | باوقار |
| Professional | پیشہ ورانہ |
| Motivating | حوصلہ افزا |
| Purpose-driven | مقصد پر مبنی |
| Action-oriented | عمل کی جانب رہنمائی کرنے والی |
| Mission-centric | اقامتِ دین اور مہم کے مقصد سے وابستہ |
| Clear and concise | واضح اور مختصر |
| Consistent | یکساں اندازِ بیان |

Naturally communicate: ذمہ داری، پیش رفت، اجتماعی کوشش، باہمی تعاون، رہنمائی، حوصلہ افزائی، مہم کا اگلا مرحلہ، اقامتِ دین کی ذمہ داری.

---

## Never use

- Reminder / Gentle Reminder / Friendly Reminder / Follow-up Reminder
- Urgent / Immediate Action Required
- نرم (as soft-policing tone)
- جب بھی فرصت ملے / اگر ممکن ہو / ہو سکے تو / کوئی جلدی نہیں / جب مناسب سمجھیں / جب موقع ملے / جب سہولت ہو
- آپ نے ابھی تک… / ابھی تک اندراج موصول نہیں ہوا / ابھی تک اپ ڈیٹ نہیں کیا
- Any sentence that sounds like monitoring, chasing updates, or unnecessary flexibility

---

## Preferred expressions

- ان شاء اللہ
- آپ کی ذمہ داری
- مہم کا اگلا مرحلہ
- پیش رفت
- باہمی تعاون
- اجتماعی کوشش
- رہنمائی
- حوصلہ افزائی
- اقامتِ دین کی ذمہ داری

---

## Structure (every Official Communication)

1. **Opening** — السلام علیکم ورحمۃ اللہ وبرکاتہ  
2. **Dua** — sincere dua for the recipient  
3. **Purpose** — campaign context  
4. **Responsibility** — link to اقامتِ دین  
5. **Expected Action** — next step, guiding not commanding  
6. **Coordination** — Karkun Connect only as the medium for collective visibility  
7. **Closing Dua**  
8. **Closing** — جزاکم اللہ خیراً  

Never make software updates the primary objective.

---

## Dynamic wording

| Condition | Wording |
|-----------|---------|
| 1 assignment | کارکن |
| Multiple | کارکنان |
| Campaign stage / pending objectives | Auto-filled via Official Communication Engine |

---

## Admin workflow

Recipient → Official Communication → Review (read-only preview) → Send  

No manual variable entry for Official Communications.

---

## Future architecture (no redesign required)

The engine is a thin layer over existing `templateService`, mail-merge, and WhatsApp delivery so future releases can add:

- Digital Rafeeq suggested communications  
- AI-assisted drafting  
- Relationship intelligence  
- Automatic milestone communications  
- Campaign-aware recommendations  

without changing Firestore schema.

---

## Code map

| Concern | Path |
|---------|------|
| Library | `src/lib/communication/officialCommunicationLibrary.ts` |
| Engine | `src/lib/communication/officialCommunicationEngine.ts` |
| Language rules | `src/lib/communication/officialCommunicationLanguage.ts` |
| Admin UI | `src/components/communication/cos/OfficialCommunicationsPanel.tsx` |
| Style guide | this file |
