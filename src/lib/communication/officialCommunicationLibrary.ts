/**
 * KC-0099 — Official Communication Library (approved language).
 * Structure: Salam → Dua → Purpose → Responsibility → Action → Coordination → Closing.
 * Bodies omit footers (applied at compose/send). Variables auto-resolve via the engine.
 */

import type { MessageTemplate, TemplateCategory } from '@/types/communication'

const now = new Date().toISOString()

function official(
  id: string,
  name: string,
  category: TemplateCategory,
  subject: string,
  body: string,
  variables: string[],
): MessageTemplate {
  return {
    id,
    name,
    category,
    subject,
    body,
    variables,
    isActive: true,
    isOfficial: true,
    footerMode: 'official',
    createdAt: now,
    updatedAt: now,
    updatedBy: 'System',
  }
}

/**
 * First approved Official Communication library (KC-0099 charter).
 * IDs are stable — mergeOfficialTemplates refreshes System rows.
 */
export const OFFICIAL_COMMUNICATION_LIBRARY: MessageTemplate[] = [
  official(
    'tpl-oc-assignment-issued',
    'Assignment Issued',
    'assignment-management',
    'New amanah entrusted to the Rukn',
    `السلام علیکم ورحمۃ اللہ وبرکاتہ
{{RuknName}}

اللہ آپ کو صحت، توفیق اور حکمت عطا فرمائے۔

{{CampaignName}} کے سلسلے میں آپ کے سپرد {{AssignedKarkunCount}} {{KarkunWord}} کیے گئے ہیں — یہ امانت اور ذمہ داری ہے۔

آپ کے سپرد کردہ {{KarkunWord}}:
{{AssignedKarkunList}}

یہ ذمہ داری اقامتِ دین کی اجتماعی کوشش کا حصہ ہے، اور مہم کا اگلا مرحلہ آپ کی رہنمائی اور باہمی تعاون سے آگے بڑھتا ہے۔

ان شاء اللہ کارکن کنیکٹ پر مہم کی پیش رفت دیکھی جا سکتی ہے — یہ صرف ہم آہنگی اور اجتماعی نظر کا ذریعہ ہے۔

اللہ اس امانت میں نیت، صبر اور برکت عطا فرمائے۔

جزاکم اللہ خیراً`,
    [
      'RuknName',
      'CampaignName',
      'AssignedKarkunCount',
      'KarkunWord',
      'AssignedKarkunList',
    ],
  ),
  official(
    'tpl-oc-assignment-updated',
    'Assignment Updated',
    'assignment-management',
    'Updated amanah list for the Rukn',
    `السلام علیکم ورحمۃ اللہ وبرکاتہ
{{RuknName}}

اللہ آپ کی خدمت کو قبول فرمائے اور آپ کو استقامت عطا کرے۔

آپ کی سپردگی کی فہرست میں تازہ پیش رفت ہوئی ہے:
کل سپرد شدہ: {{AssignedKarkunCount}} {{KarkunWord}}
منسلک: {{ConnectedCount}}

تازہ فہرست:
{{AssignedKarkunList}}

مہم کا اگلا مرحلہ اسی امانت کی روشنی میں آگے بڑھتا ہے — اقامتِ دین کی ذمہ داری اجتماعی کوشش سے پوری ہوتی ہے۔

کارکن کنیکٹ مہم کی ہم آہنگی کے لیے معاون ہے۔

اللہ آپ کے تعاون میں برکت دے۔

جزاکم اللہ خیراً`,
    [
      'RuknName',
      'AssignedKarkunCount',
      'KarkunWord',
      'ConnectedCount',
      'AssignedKarkunList',
    ],
  ),
  official(
    'tpl-oc-assignment-acknowledged',
    'Assignment Acknowledged',
    'assignment-management',
    'Appreciation for acknowledging the amanah',
    `السلام علیکم ورحمۃ اللہ وبرکاتہ
{{RuknName}}

اللہ آپ کی نیت کو قبول فرمائے۔

آپ نے {{CampaignName}} کی امانت کو قبول کیا — یہ ذمہ داری اور باہمی تعاون کی خوبصورت مثال ہے۔

{{AssignedKarkunCount}} {{KarkunWord}} آپ کی رہنمائی میں ہیں، اور مہم کا اگلا مرحلہ اب عملی پیش رفت کی طرف ہے۔

اقامتِ دین کی ذمہ داری اجتماعی کوشش سے ہی پوری ہوتی ہے — آپ کا کردار اس میں اہم ہے۔

کارکن کنیکٹ صرف ہم آہنگی اور مہم کی نظر کا ذریعہ ہے۔

اللہ آپ کو حکمت اور توفیق عطا فرمائے۔

جزاکم اللہ خیراً`,
    ['RuknName', 'CampaignName', 'AssignedKarkunCount', 'KarkunWord'],
  ),
  official(
    'tpl-oc-campaign-initiation-pending',
    'Campaign Initiation Pending',
    'execution-tracking',
    'Encourage campaign initiation with dignity',
    `السلام علیکم ورحمۃ اللہ وبرکاتہ
{{RuknName}}

اللہ آپ کو عافیت اور توفیقِ عمل عطا فرمائے۔

{{CampaignName}} میں آپ کے سپرد {{AssignedKarkunCount}} {{KarkunWord}} ہیں، اور مہم کا اگلا مرحلہ آپ کی شرکت کا منتظر ہے۔

یہ ذمہ داری اقامتِ دین کی اجتماعی کوشش کا حصہ ہے — پیش رفت باہمی تعاون اور رہنمائی سے آتی ہے۔

ان شاء اللہ جب آپ مہم کی عملی پیش رفت شروع کریں گے تو اجتماعی نظر میں بھی برکت ہوگی۔ کارکن کنیکٹ صرف ہم آہنگی کا ذریعہ ہے۔

اللہ آپ کو نیت، حکمت اور آسانی عطا فرمائے۔

جزاکم اللہ خیراً`,
    ['RuknName', 'CampaignName', 'AssignedKarkunCount', 'KarkunWord'],
  ),
  official(
    'tpl-oc-appreciation',
    'Appreciation',
    'motivation-appreciation',
    'General appreciation for service',
    `السلام علیکم ورحمۃ اللہ وبرکاتہ
{{RuknName}}

اللہ آپ کی خدمت کو قبول فرمائے۔

آپ کی ذمہ داری، پیش رفت اور باہمی تعاون قابلِ قدر ہے۔ {{CampaignName}} میں آپ کا کردار حوصلہ افزا ہے۔

اقامتِ دین کی ذمہ داری ایسے ہی اجتماعی جذبے سے آگے بڑھتی ہے۔

کارکن کنیکٹ مہم کی ہم آہنگی کا ذریعہ ہے — اصل کام آپ کی نیت اور عمل ہے۔

اللہ آپ کو مزید توفیق عطا فرمائے۔

جزاکم اللہ خیراً`,
    ['RuknName', 'CampaignName'],
  ),
  official(
    'tpl-oc-weekly-encouragement',
    'Weekly Encouragement',
    'motivation-appreciation',
    'Weekly encouragement for campaign progress',
    `السلام علیکم ورحمۃ اللہ وبرکاتہ
{{RuknName}}

اللہ آپ کے ہفتے کو خیر اور برکت سے بھر دے۔

{{CampaignName}} میں پیش رفت {{CampaignProgress}} ہے، اور مہم کا اگلا مرحلہ {{PendingObjectives}} کی طرف ہے۔

اجتماعی کوشش اور رہنمائی سے ہی اقامتِ دین کی ذمہ داری پوری ہوتی ہے — آپ کی حوصلہ افزائی اس سفر کا حصہ ہے۔

کارکن کنیکٹ صرف ہم آہنگی اور اجتماعی نظر کا ذریعہ ہے۔

اللہ آپ کو استقامت عطا فرمائے۔

جزاکم اللہ خیراً`,
    ['RuknName', 'CampaignName', 'CampaignProgress', 'PendingObjectives'],
  ),
  official(
    'tpl-oc-meeting-invitation',
    'Meeting Invitation',
    'administrative',
    'Invite to a meeting with dignity',
    `السلام علیکم ورحمۃ اللہ وبرکاتہ
{{RuknName}}

اللہ آپ کو صحت و توفیق عطا فرمائے۔

{{CampaignName}} کے سلسلے میں ایک اہم ملاقات کا اہتمام ہے — مہم کے اگلے مرحلے کی رہنمائی اور باہمی تعاون کے لیے۔

تاریخ: {{TodaysDate}}
تفصیل کارکن کنیکٹ پر دستیاب ہے — یہ صرف ہم آہنگی کا ذریعہ ہے۔

اقامتِ دین کی ذمہ داری اجتماعی مشورے سے مضبوط ہوتی ہے۔

اللہ اس ملاقات میں حکمت اور برکت عطا فرمائے۔

جزاکم اللہ خیراً`,
    ['RuknName', 'CampaignName', 'TodaysDate'],
  ),
  official(
    'tpl-oc-campaign-milestone',
    'Campaign Milestone',
    'motivation-appreciation',
    'Celebrate a campaign milestone',
    `السلام علیکم ورحمۃ اللہ وبرکاتہ
{{RuknName}}

اللہ آپ کی محنت کو قبول فرمائے۔

{{CampaignName}} میں ایک اہم سنگِ میل طے ہوا ہے — پیش رفت {{CampaignProgress}}۔ یہ اجتماعی کوشش اور آپ کی ذمہ داری کا ثمر ہے۔

مہم کا اگلا مرحلہ اب مزید رہنمائی اور باہمی تعاون سے آگے بڑھے گا، ان شاء اللہ۔

کارکن کنیکٹ مہم کی نظر کا ذریعہ ہے؛ اصل کارنامہ آپ کی نیت ہے۔

اللہ مزید پیش رفت کی توفیق دے۔

جزاکم اللہ خیراً`,
    ['RuknName', 'CampaignName', 'CampaignProgress'],
  ),
  official(
    'tpl-oc-outstanding-contribution',
    'Outstanding Contribution',
    'motivation-appreciation',
    'Recognise outstanding contribution',
    `السلام علیکم ورحمۃ اللہ وبرکاتہ
{{RuknName}}

اللہ آپ کے اخلاص کو قبول فرمائے۔

{{CampaignName}} میں آپ کی نمایاں خدمت حوصلہ افزا ہے — ذمہ داری، پیش رفت اور باہمی تعاون کی زندہ مثال۔

اقامتِ دین کی ذمہ داری ایسے ہی جذبے سے پوری ہوتی ہے۔

کارکن کنیکٹ صرف ہم آہنگی کا ذریعہ ہے؛ اصل قدر آپ کے عمل میں ہے۔

اللہ آپ کو بلند مراتب عطا فرمائے۔

جزاکم اللہ خیراً`,
    ['RuknName', 'CampaignName'],
  ),
  official(
    'tpl-oc-eid-greeting',
    'Eid Greeting',
    'greetings',
    'Eid greeting in Official Communication style',
    `السلام علیکم ورحمۃ اللہ وبرکاتہ
{{name}}

اللہ آپ اور آپ کے گھر والوں کو خوشی، امن اور برکت عطا فرمائے۔

عید مبارک!
یہ خوشی اجتماعی کوشش اور باہمی محبت کی یاد دلاتی ہے — اقامتِ دین کی ذمہ داری بھی اسی جذبے سے جڑی ہے۔

اللہ ہمیں شکر، اتحاد اور عملِ صالح کی توفیق دے۔

جزاکم اللہ خیراً`,
    ['name'],
  ),
  official(
    'tpl-oc-ramadan-greeting',
    'Ramadan Greeting',
    'greetings',
    'Ramadan greeting in Official Communication style',
    `السلام علیکم ورحمۃ اللہ وبرکاتہ
{{name}}

اللہ اس مقدس مہینے میں عبادت، دعا اور خیر کی توفیق عطا فرمائے۔

رمضان المبارک!
رمضان اقامتِ دین کی ذمہ داری، صبر اور اجتماعی کوشش کی تربیت کا موسم ہے۔

اللہ ہمیں قبولیت اور استقامت عطا فرمائے۔

جزاکم اللہ خیراً`,
    ['name'],
  ),
  official(
    'tpl-oc-campaign-completion-appreciation',
    'Campaign Completion Appreciation',
    'motivation-appreciation',
    'Appreciate campaign completion',
    `السلام علیکم ورحمۃ اللہ وبرکاتہ
{{RuknName}}

اللہ آپ کی خدمت کو قبول فرمائے اور آپ کو اجرِ عظیم عطا کرے۔

{{CampaignName}} کی تکمیل میں آپ کی ذمہ داری، پیش رفت اور باہمی تعاون قابلِ قدر ہے۔ یہ اجتماعی کوشش اقامتِ دین کی ذمہ داری کی عملی تعبیر ہے۔

آپ کی رہنمائی نے مہم کو منزل تک پہنچانے میں اہم کردار ادا کیا۔

کارکن کنیکٹ ہم آہنگی کا ذریعہ رہا؛ اصل کام آپ کی نیت اور عمل تھا۔

اللہ مزید توفیقات عطا فرمائے۔

جزاکم اللہ خیراً`,
    ['RuknName', 'CampaignName'],
  ),
]

/** Canonical IDs for the KC-0099 library (for engine listing / compliance checks). */
export const OFFICIAL_COMMUNICATION_LIBRARY_IDS = OFFICIAL_COMMUNICATION_LIBRARY.map(
  (item) => item.id,
)
