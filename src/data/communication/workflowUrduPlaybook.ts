/**
 * KC-0077.2 — Workflow-Based Urdu Communication Playbook.
 * Digital Rafeeq tone: warm, encouraging, mission-focused. No bureaucratic language.
 * Bodies omit footers — applied at compose/send time.
 */

import type { MessageTemplate, TemplateCategory } from '@/types/communication'

const now = new Date().toISOString()

function playbook(
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
    footerMode: 'personal',
    createdAt: now,
    updatedAt: now,
    updatedBy: 'System',
  }
}

/** Admin → Rukn workflow library (KC-0077.2). */
export const WORKFLOW_URDU_PLAYBOOK_TEMPLATES: MessageTemplate[] = [
  // ── 1. Assignment Management ──────────────────────────────────────────
  playbook(
    'tpl-pb-new-assignment',
    'Assignment Issued',
    'assignment-management',
    'New Karkuns entrusted to the Rukn',
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
    ['RuknName', 'CampaignName', 'AssignedKarkunCount', 'KarkunWord', 'AssignedKarkunList'],
  ),
  playbook(
    'tpl-pb-assignment-updated',
    'Assignment Updated',
    'assignment-management',
    'Updated assignment list for the Rukn',
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
  playbook(
    'tpl-pb-new-karkun-added',
    'New Karkun Added',
    'assignment-management',
    'Encourage first contact for a newly added Karkun',
    `السلام علیکم {{RuknName}}

آپ کے تعاون کا شکریہ — اللہ قبول فرمائے۔

آپ کی سپردگی میں ایک نیا کارکن شامل ہوا ہے:
{{RecentlyAddedKarkuns}}

اگر موقع ملے تو ایک مختصر، نرم پہلا رابطہ ان شاء اللہ تعلق کو مضبوط بنائے گا۔

اللہ دونوں دلوں میں الفت اور خیر پیدا فرمائے۔`,
    ['RuknName', 'RecentlyAddedKarkuns'],
  ),
  playbook(
    'tpl-pb-karkun-transferred',
    'Karkun Transferred',
    'assignment-management',
    'Polite notice of transfer with appreciation',
    `السلام علیکم {{RuknName}}

آپ کی سابقہ کوششوں اور توجہ کا دل سے شکریہ۔ اللہ آپ کے اس تعاون کو قبول فرمائے۔

ایک کارکن کی سپردگی دوسرے رکن کی طرف منتقل ہوئی ہے تاکہ رابطہ بہتر طریقے سے جاری رہ سکے۔

آپ کی گزشتہ خدمت مشن کے لیے قیمتی رہی۔

اللہ آپ کو مزید خیر کی توفیق عطا فرمائے۔`,
    ['RuknName'],
  ),
  playbook(
    'tpl-pb-karkun-removed',
    'Karkun Removed',
    'assignment-management',
    'Respectful notice with appreciation',
    `السلام علیکم {{RuknName}}

آپ کی خدمت اور تعاون کا بھرپور شکریہ۔

ایک کارکن آپ کی موجودہ سپردگی سے ہٹایا گیا ہے۔ ممکن ہے حالات یا ترتیب کی تبدیلی کی وجہ سے ہو۔

آپ کی گزشتہ کوششوں کی قدر کی جاتی ہے — جزاکم اللہ خیراً۔

اللہ اس مشن میں آپ کے لیے آسانی اور اجر لکھے۔`,
    ['RuknName'],
  ),
  playbook(
    'tpl-pb-assigned-karkuns-briefing',
    'Your Assigned Karkuns (Briefing)',
    'assignment-management',
    'Personal briefing — not a report',
    `السلام علیکم {{RuknName}}

آپ کی خدمت کا شکریہ۔ یہ آپ کا مختصر ذاتی بریفنگ نوٹ ہے — رپورٹ نہیں۔

{{CampaignName}} · آج {{TodaysDate}}

سپرد شدہ کارکنان: {{AssignedKarkunCount}}
منسلک: {{ConnectedCount}}
پہلا رابطہ باقی: {{PendingFirstContact}}
فالو اپ باقی: {{PendingFollowUps}}
مکمل ملاقاتیں: {{CompletedVisits}}
زیرِ التواء ملاقاتیں: {{PendingVisits}}

فہرست:
{{AssignedKarkunList}}

جب سہولت ہو، جس سے رابطہ آسان لگے وہیں سے شروع کر لیجیے۔

اللہ اس امانت میں برکت عطا فرمائے۔`,
    [
      'RuknName',
      'CampaignName',
      'TodaysDate',
      'AssignedKarkunCount',
      'ConnectedCount',
      'PendingFirstContact',
      'PendingFollowUps',
      'CompletedVisits',
      'PendingVisits',
      'AssignedKarkunList',
    ],
  ),

  // ── 2. Execution Tracking ─────────────────────────────────────────────
  playbook(
    'tpl-pb-first-contact-pending',
    'First Contact Pending',
    'execution-tracking',
    'Gentle encouragement for first contact',
    `السلام علیکم {{RuknName}}

آپ کی مصروفیت کا خیال ہے — اللہ آسانی عطا فرمائے۔

ممکن ہے کچھ کارکنان سے پہلا رابطہ ابھی باقی ہو:
باقی پہلا رابطہ: {{PendingFirstContact}}

جب موقع ملے تو ایک مختصر سلام اور خیریت پوچھنا بھی بہت بڑی خدمت ہے۔

اللہ دلوں کو جوڑنے کی توفیق دے۔`,
    ['RuknName', 'PendingFirstContact'],
  ),
  playbook(
    'tpl-pb-follow-up-pending',
    'Follow-up Pending',
    'execution-tracking',
    'Encourage pending follow-ups without blame',
    `السلام علیکم {{RuknName}}

آپ کی مسلسل کوششوں کا شکریہ۔

کچھ فالو اپ ابھی باقی ہیں ({{PendingFollowUps}}) — ممکن ہے مصروفیت کی وجہ سے مؤخر ہوئے ہوں۔

جب سہولت ہو تو ایک نرم یاددہانی تعلق کو تازہ کر دے گی۔

اللہ آپ کو حکمت اور توفیق عطا فرمائے۔`,
    ['RuknName', 'PendingFollowUps'],
  ),
  playbook(
    'tpl-pb-visit-overdue',
    'Visit Overdue',
    'execution-tracking',
    'Soft reminder for overdue visits',
    `السلام علیکم {{RuknName}}

آپ کی خدمت کا شکریہ۔ اللہ قبول فرمائے۔

کچھ ملاقاتیں مؤخر ہو سکتی ہیں (زیرِ التواء: {{PendingVisits}})۔ کوئی الزام نہیں — زندگی میں مصروفیت فطری ہے۔

جب موقع ملے تو ایک مختصر ملاقات بھی مشن کے لیے بہت قیمتی ہے۔

اللہ راستے کھولے اور نیت قبول کرے۔`,
    ['RuknName', 'PendingVisits'],
  ),
  playbook(
    'tpl-pb-no-activity-days',
    'No Activity Reminder',
    'execution-tracking',
    'Gentle nudge after quiet days',
    `السلام علیکم {{RuknName}}

امید ہے آپ خیریت سے ہیں۔ اللہ صحت و عافیت عطا فرمائے۔

ممکن ہے چند دنوں سے سرگرمی درج نہ ہو سکی ہو — مصروفیت بالکل قابلِ فہم ہے۔

جب سہولت ہو تو ایک چھوٹا اپ ڈیٹ بھی ٹیم کی مدد کرتا ہے۔

اللہ اس مشن میں آپ کے قدم ہلکے کرے۔`,
    ['RuknName'],
  ),
  playbook(
    'tpl-pb-daily-progress',
    'Daily Progress Reminder',
    'execution-tracking',
    'Warm daily mission encouragement',
    `السلام علیکم {{RuknName}}

آپ کی خدمت مشن کا حصہ ہے — جزاکم اللہ خیراً۔

آج {{TodaysDate}} · {{CampaignName}}
سپرد شدہ: {{AssignedKarkunCount}} · فالو اپ باقی: {{PendingFollowUps}}

اگر آج صرف ایک نرم رابطہ بھی ہو سکے تو یہ بھی بڑی کامیابی ہے۔

اللہ آج کے دن کو بابرکت بنائے۔`,
    ['RuknName', 'TodaysDate', 'CampaignName', 'AssignedKarkunCount', 'PendingFollowUps'],
  ),

  // ── 3. Reporting & Compliance ─────────────────────────────────────────
  playbook(
    'tpl-pb-ijtema-attendance-pending',
    'Ijtema Attendance Pending',
    'reporting-compliance',
    'Explain why attendance helps the Jamaat',
    `السلام علیکم {{RuknName}}

آپ کی توجہ کا شکریہ۔

ریکارڈ کو مکمل رکھنے کے لیے ہفتہ وار اجتماع کی حاضری درج ہونا ابھی باقی ہو سکتا ہے۔ یہ مطالبہ نہیں — اجتماع کی صورتحال سمجھنے میں جماعت کی مدد کرتا ہے۔

جب سہولت ہو تو درج کر لیجیے۔

اللہ اس عمل کو قبول فرمائے۔`,
    ['RuknName'],
  ),
  playbook(
    'tpl-pb-annexure-pending',
    'Annexure Pending',
    'reporting-compliance',
    'Encourage annexure completion with purpose',
    `السلام علیکم {{RuknName}}

آپ کی ملاقاتوں اور کوششوں کا شکریہ۔

ممکن ہے کچھ انیکسچر / ملاقات کی تفصیل ابھی درج نہ ہو سکی ہو۔ مکمل ریکارڈ مہم کی رہنمائی بہتر بناتا ہے — آپ پر بوجھ ڈالنے کے لیے نہیں۔

جب موقع ملے تو مختصر اندراج کافی ہے۔

اللہ نیت اور عمل دونوں قبول کرے۔`,
    ['RuknName'],
  ),
  playbook(
    'tpl-pb-profile-incomplete',
    'Profile Incomplete',
    'reporting-compliance',
    'Soft request to complete profile fields',
    `السلام علیکم {{RuknName}}

آپ کے تعاون کا شکریہ۔

کچھ پروفائل معلومات ابھی نامکمل ہو سکتی ہیں۔ مکمل تفصیل رابطے اور خدمت کو آسان بناتی ہے۔

جب سہولت ہو تو جو خانے آسان لگے وہ پر کر لیجیے۔

اللہ آسانی عطا فرمائے۔`,
    ['RuknName'],
  ),
  playbook(
    'tpl-pb-pending-reporting',
    'Pending Reporting',
    'reporting-compliance',
    'Motivate reporting with shared mission',
    `السلام علیکم {{RuknName}}

آپ کی خدمت مشن کی بنیاد ہے — جزاکم اللہ۔

ممکن ہے کچھ رپورٹنگ ابھی باقی ہو۔ بروقت اندراج ٹیم کو صحیح فیصلے کرنے میں مدد دیتا ہے۔

جب موقع ملے تو ایک مختصر اپ ڈیٹ بھی بہت مفید ہے۔

اللہ اس تعاون کو قبول فرمائے۔`,
    ['RuknName'],
  ),
  playbook(
    'tpl-pb-missing-activity-update',
    'Missing Activity Update',
    'reporting-compliance',
    'Supportive activity-update reminder',
    `السلام علیکم {{RuknName}}

امید ہے سب خیریت سے ہے۔

ممکن ہے مصروفیت کی وجہ سے ابھی تک سرگرمی درج نہ ہو سکی ہو۔ کوئی فکر کی بات نہیں۔

جب سہولت ہو تو مختصر اپ ڈیٹ درج کر لیجیے تاکہ مشن کی تصویر واضح رہے۔

اللہ آپ کے ہر قدم میں برکت دے۔`,
    ['RuknName'],
  ),

  // ── 4. Motivation & Appreciation ──────────────────────────────────────
  playbook(
    'tpl-pb-excellent-work',
    'Excellent Work',
    'motivation-appreciation',
    'Warm recognition for effort',
    `السلام علیکم {{RuknName}}

آپ کی خدمت واقعی قابلِ تحسین ہے۔ ماشاء اللہ۔

آپ کی محنت {{CampaignName}} کے لیے روشنی بن رہی ہے۔ اللہ آپ کے اس عمل کو قبول فرمائے اور اجرِ عظیم عطا کرے۔

آگے بھی اسی جذبے کے ساتھ — اللہ مددگار ہے۔

والسلام`,
    ['RuknName', 'CampaignName'],
  ),
  playbook(
    'tpl-pb-milestone-achieved',
    'Milestone Achieved',
    'motivation-appreciation',
    'Celebrate a campaign milestone',
    `السلام علیکم {{RuknName}}

مبارک ہو — ایک اہم سنگِ میل عبور ہوا ہے۔ الحمد للہ۔

آپ اور ساتھیوں کی کوششوں سے {{CampaignName}} آگے بڑھ رہی ہے۔ اللہ اس پیشرفت کو قبول فرمائے۔

آگے کی منزل بھی اللہ کے فضل سے آسان ہو۔ آمین۔`,
    ['RuknName', 'CampaignName'],
  ),
  playbook(
    'tpl-pb-consistent-reporting',
    'Consistent Reporting',
    'motivation-appreciation',
    'Appreciate reliable updates',
    `السلام علیکم {{RuknName}}

آپ کی باقاعدگی اور رپورٹنگ قابلِ قدر ہے۔ جزاکم اللہ خیراً۔

مسلسل اپ ڈیٹ پوری ٹیم کی رہنمائی آسان بناتے ہیں۔ اللہ آپ کی اس عادت کو بابرکت بنائے۔

اللہ آپ کو مزید استقامت عطا فرمائے۔`,
    ['RuknName'],
  ),
  playbook(
    'tpl-pb-campaign-appreciation',
    'Campaign Appreciation',
    'motivation-appreciation',
    'General campaign thank-you',
    `السلام علیکم {{RuknName}}

{{CampaignName}} میں آپ کی شرکت اور خدمت کا دل سے شکریہ۔

آپ کا ہر نرم رابطہ اور دعا مشن کا حصہ ہے۔ اللہ قبول فرمائے۔

اللہ ہمیں خلوص اور محبت کے ساتھ خدمت کی توفیق دے۔`,
    ['RuknName', 'CampaignName'],
  ),
  playbook(
    'tpl-pb-monthly-appreciation',
    'Monthly Appreciation',
    'motivation-appreciation',
    'End-of-month thanks',
    `السلام علیکم {{RuknName}}

اس ماہ ({{month}}) آپ کی خدمت کا بھرپور شکریہ۔ ماشاء اللہ۔

اللہ آپ کے وقت، صبر اور تعاون کو قبول فرمائے اور آنے والے دنوں میں مزید خیر کی توفیق دے۔

آمین۔`,
    ['RuknName', 'month'],
  ),
  playbook(
    'tpl-pb-special-contribution',
    'Special Contribution',
    'motivation-appreciation',
    'Recognize an exceptional effort',
    `السلام علیکم {{RuknName}}

آپ کی خصوصی کوشش اور تعاون قابلِ ذکر ہے۔ جزاکم اللہ خیراً۔

ایسی خدمت دلوں کو جوڑتی اور مشن کو آگے بڑھاتی ہے۔ اللہ آپ کے اس عمل کو میزانِ حسنات میں وزن دار بنائے۔

اللہ مزید توفیق عطا فرمائے۔`,
    ['RuknName'],
  ),
  playbook(
    'tpl-pb-assignment-completed',
    'Assigned Work Completed',
    'motivation-appreciation',
    'Celebrate completion of entrusted work',
    `السلام علیکم {{RuknName}}

مبارک ہو — آپ نے اپنی سپرد کردہ خدمت میں نمایاں پیش رفت کی ہے۔ الحمد للہ۔

مکمل ملاقاتیں: {{CompletedVisits}} · سپرد شدہ: {{AssignedKarkunCount}}

اللہ اس امانت کی ادائیگی کو قبول فرمائے اور اجرِ جزیل عطا کرے۔`,
    ['RuknName', 'CompletedVisits', 'AssignedKarkunCount'],
  ),

  // ── 5. Administrative Communication ───────────────────────────────────
  playbook(
    'tpl-pb-campaign-started',
    'Campaign Started',
    'administrative',
    'Warm campaign launch notice',
    `السلام علیکم {{RuknName}}

{{CampaignName}} کا آغاز ہو چکا ہے — اللہ کامیابی عطا فرمائے۔

یہ مشترکہ مشن ہے: نرم رابطہ، خلوص، اور دعا۔ آپ کی شرکت بہت قیمتی ہے۔

اللہ ہمیں اس مہم میں خلوص اور حکمت عطا فرمائے۔`,
    ['RuknName', 'CampaignName'],
  ),
  playbook(
    'tpl-pb-campaign-ending',
    'Campaign Ending',
    'administrative',
    'Gentle close-of-campaign reminder',
    `السلام علیکم {{RuknName}}

{{CampaignName}} اپنے اختتام کے قریب ہے۔ آپ کی پوری خدمت کا شکریہ۔

اگر کوئی نرم فالو اپ باقی ہو تو جب سہولت ہو مکمل کر لیجیے۔

اللہ اس مہم کے ثمرات قبول فرمائے۔`,
    ['RuknName', 'CampaignName'],
  ),
  playbook(
    'tpl-pb-meeting-reminder-admin',
    'Meeting Reminder',
    'administrative',
    'Respectful meeting notice',
    `السلام علیکم {{RuknName}}

امید ہے آپ خیریت سے ہیں۔

ایک اہم نشست کی نرم یاددہانی ہے:
تاریخ: {{date}}
وقت: {{time}}
مقام: {{venue}}

آپ کی موجودگی باعثِ خوشی ہوگی۔ اللہ آسانیاں عطا فرمائے۔`,
    ['RuknName', 'date', 'time', 'venue'],
  ),
  playbook(
    'tpl-pb-admin-announcement',
    'Administrative Announcement',
    'administrative',
    'Soft administrative update',
    `السلام علیکم {{RuknName}}

{{CampaignName}} کے سلسلے میں ایک مختصر اطلاع شیئر کی جا رہی ہے۔

تفصیل جلد دستیاب ہوگی۔ آپ کی توجہ کا شکریہ۔

اللہ ہمیں سمجھ اور تعاون کی توفیق دے۔`,
    ['RuknName', 'CampaignName'],
  ),
  playbook(
    'tpl-pb-training-reminder',
    'Training Reminder',
    'administrative',
    'Encourage training attendance',
    `السلام علیکم {{RuknName}}

آپ کی خدمت کا شکریہ۔

تربیتی نشست کی نرم یاددہانی ہے — یہ ہمارے مشن کی صلاحیت بڑھانے کے لیے ہے۔
تاریخ: {{date}} · وقت: {{time}}

اگر شرکت ممکن ہو تو ان شاء اللہ بہت مفید ہوگا۔

اللہ فہم اور عمل کی توفیق دے۔`,
    ['RuknName', 'date', 'time'],
  ),
  playbook(
    'tpl-pb-feature-announcement',
    'Feature Announcement',
    'administrative',
    'Friendly product/feature update',
    `السلام علیکم {{RuknName}}

کارکن کنیکٹ میں ایک مفید سہولت دستیاب ہوئی ہے تاکہ آپ کی خدمت آسان ہو۔

جب سہولت ہو تو ایک نظر ڈال لیجیے۔ سوال ہو تو بتائیے — ہم ساتھ ہیں۔

اللہ اس ذریعے کو مشن کے لیے بابرکت بنائے۔`,
    ['RuknName'],
  ),
  playbook(
    'tpl-pb-system-maintenance',
    'System Maintenance',
    'administrative',
    'Courteous maintenance notice',
    `السلام علیکم {{RuknName}}

مختصر اطلاع: سسٹم مینٹیننس کے دوران کچھ سروس عارضی طور پر دستیاب نہیں ہو سکتی۔

آپ کی صبر و تعاون کا پیشگی شکریہ۔ جلد معمول پر آ جائے گی ان شاء اللہ۔

اللہ آسانیاں عطا فرمائے۔`,
    ['RuknName'],
  ),

  // ── 6. Personal Guidance (companion tone; often Rukn→Karkun reusable) ─
  playbook(
    'tpl-pb-guidance-check-in',
    'Caring Check-in',
    'personal-guidance',
    'Warm wellbeing check',
    `السلام علیکم {{KarkunName}}

امید ہے آپ خیریت سے ہیں۔ اللہ صحت و عافیت عطا فرمائے۔

بس خیریت دریافت کرنے کے لیے لکھا — آپ کیسے ہیں؟

اللہ آپ کے دن کو بابرکت بنائے۔`,
    ['KarkunName'],
  ),
  playbook(
    'tpl-pb-guidance-encourage',
    'Gentle Encouragement',
    'personal-guidance',
    'Encourage without pressure',
    `السلام علیکم {{KarkunName}}

آپ کی کوشش اور نیت قابلِ قدر ہے۔ ماشاء اللہ۔

اگر کوئی قدم ابھی باقی ہو ({{PendingAction}}) تو جب سہولت ہو آگے بڑھ لیجیے — جلدی نہیں۔

اللہ توفیق اور آسانی عطا فرمائے۔`,
    ['KarkunName', 'PendingAction'],
  ),
  playbook(
    'tpl-pb-guidance-visit-invite',
    'Warm Visit Invitation',
    'personal-guidance',
    'Invite to meet with care',
    `السلام علیکم {{KarkunName}}

آپ سے ملاقات کا شوق ہے۔ اللہ ملاقات کو بابرکت بنائے۔

اگر سہولت ہو تو {{NextMeeting}} کے قریب ملاقات ہو سکتی ہے — جو وقت آپ کو آسان ہو بتائیے۔

اللہ دونوں کے لیے خیر رکھے۔`,
    ['KarkunName', 'NextMeeting'],
  ),
]
