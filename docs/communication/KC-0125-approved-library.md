# KC-0125 — Approved Communication Library

**Editorial process:** Draft → Editorial Review → Verification → Approved Template

## Context-aware Notify (approved generator)

When pending matters exist:

1. السلام علیکم ورحمۃ اللہ وبرکاتہ (+ recipient name)  
2. Context purpose (guiding, not “reminder”)  
3. آپ کی ذمہ داری سے متعلق درج ذیل امور زیر التواء ہیں۔  
4. تفصیلات: + `•` each real pending activity  
5. براہ کرم ان تمام امور پر جلد از جلد توجہ فرماتے ہوئے ان کی تکمیل کو یقینی بنائیں۔  
6. اللہ تعالیٰ آپ کی کوششوں کو قبول فرمائے۔  
7. والسلام  

When nothing is pending:

```
الحمد للہ!

آپ کی ذمہ داری سے متعلق تمام امور مکمل ہیں۔

جزاکم اللہ خیراً۔
```

(+ dua + closing)

Never emit bare counts such as `خلاصہ: 3 امور زیر التواء`.

## Canonical activity bullets

| Activity | Approved label |
|----------|----------------|
| Visit | ملاقات باقی ہے۔ |
| Weekly ijtema | ہفتہ وار اجتماع میں شرکت مطلوب ہے۔ |
| JIH app | JIH Reporting App میں اندراج باقی ہے۔ |
| Baitul Maal | ماہانہ بیت المال کی تکمیل باقی ہے۔ |
| Follow-up | پیروی کا امر زیر التواء ہے۔ |

## Static libraries

All bodies in:

- `OFFICIAL_WHATSAPP_TEMPLATES` (V1 + playbook + OC)  
- `ARKAAN_DAILY_REPORT_TEMPLATES`  
- `URDU_REPORT` PDF labels  

are editorially approved for production send / export after KC-0125.

## Verification

```bash
npm run verify:kc0119
npm run verify:kc0125
```
