/**
 * KC-038C — Weekly Ijtema Executive Report verification.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  blueprintSectionsFor,
  composeKc034CampaignReportModel,
  composeReport,
  createReportContext,
  defaultKc034Config,
  registerBuiltinSections,
  resetSectionRegistryForTests,
  validateReportConfig,
} from '../src/lib/reporting/v2'
import { MOCK_KARKUN_REGISTRY } from '../src/constants/mockKarkunRegistry'
import { ruknMaster } from '../src/data/ruknMaster'
import {
  WEEKLY_IJTEMA_EXPORT_KINDS,
  audienceGenderForWeeklyIjtemaExport,
  buildMissedThreeConnectedKarkuns,
  buildNonSubmittingRuknsTwoWeeks,
  listCanonicalIjtemaMeetingsForAudience,
  officerMatchesWeeklyIjtemaExport,
  resolveWeeklyIjtemaReportGenders,
  splitPerformanceRows,
} from '../src/lib/reporting/weeklyIjtemaAttendanceReportWings'
import {
  buildWeeklyIjtemaAttendanceReportHtmlForSlice,
  ijtemaExecutiveReportCss,
} from '../src/lib/reporting/weeklyIjtemaAttendanceReportPdf'
import {
  buildWeeklyIjtemaAttendanceReportModel,
  WEEKLY_IJTEMA_ATTENDANCE_MODEL_KIND,
  WEEKLY_IJTEMA_ATTENDANCE_SECTION_ID,
  isWeeklyIjtemaAttendanceReportModel,
} from '../src/lib/reporting/weeklyIjtemaAttendanceReportModel'
import { createWeeklyIjtemaEvent, upsertWeeklyIjtemaKarkunMark } from '../src/services/weeklyIjtemaService'
import { clearAssignmentStore, replaceAllAssignments } from '../src/stores/assignmentStore'
import { clearIjtemaAttendanceStore } from '../src/stores/ijtemaAttendanceStore'
import { clearWeeklyIjtemaStore } from '../src/stores/weeklyIjtemaStore'
import type { AssignmentRecord } from '../src/types/assignment'
import type { KarkunRegistryRecord } from '../src/types/karkun-registry.types'

type CaseResult = { name: string; passed: boolean; detail: string }

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message)
}

function run(name: string, fn: () => void): CaseResult {
  try {
    fn()
    return { name, passed: true, detail: 'ok' }
  } catch (error) {
    return {
      name,
      passed: false,
      detail: error instanceof Error ? error.message : String(error),
    }
  }
}

function ensure(): void {
  resetSectionRegistryForTests()
  registerBuiltinSections({ force: true })
}

function testBlueprintAndCatalog(): void {
  ensure()
  const sections = blueprintSectionsFor('weekly_ijtema')
  assert(
    sections.length === 1 && sections[0] === WEEKLY_IJTEMA_ATTENDANCE_SECTION_ID,
    'weekly_ijtema blueprint is attendance dossier only',
  )
  const typesSrc = readFileSync(resolve('src/lib/reporting/v2/reportTypes.ts'), 'utf8')
  assert(typesSrc.includes('Weekly Ijtema'), 'catalog title')
}

function testComposeExecutiveModel(): void {
  ensure()
  const config = defaultKc034Config({
    reportType: 'weekly_ijtema',
    scope: 'overall_campaign',
    enabledSections: blueprintSectionsFor('weekly_ijtema'),
    outputType: 'pdf',
    detailLevel: 'standard',
    language: 'ur',
    generatedBy: 'verify-kc-038c',
  })
  assert(validateReportConfig(config).ok, 'validates')
  const doc = composeReport(config)
  assert(doc.sections.length === 1, 'one section')
  const data = doc.sections[0]!.model.data
  assert(isWeeklyIjtemaAttendanceReportModel(data), 'model kind')
  assert(data.kind === WEEKLY_IJTEMA_ATTENDANCE_MODEL_KIND, 'executive kind constant')
  assert(data.cover.reportTitle.includes('جائزہ'), 'Urdu executive title')
  assert(typeof data.executiveSummary.reminded === 'number', 'reminded kpi')
  assert(typeof data.executiveSummary.attendancePct === 'number', 'attendance pct')
  assert(typeof data.executiveObservation === 'string' && data.executiveObservation.length > 0, 'observation')
  assert(Array.isArray(data.ruknDetails), 'rukn details')
  assert(Array.isArray(data.followUp), 'follow-up')
  assert(Array.isArray(data.futureAnalyticsPlaceholders), 'future placeholders')
  assert(data.appendix.reportVersion === 'KC-038C', 'report version')
  assert(Array.isArray(data.reports) && data.reports.length === 3, 'three export editions')
  assert(
    data.reports.map((row) => row.kind).join() === WEEKLY_IJTEMA_EXPORT_KINDS.join(),
    'Rukn then Aazim then Women',
  )
  assert(data.reports[0]?.palette === 'emerald', 'Rukn emerald palette')
  assert(data.reports[1]?.palette === 'navy', 'Aazim navy palette')
  assert(data.reports[2]?.palette === 'plum', 'Women plum palette')
  assert(
    data.reports.every((row) => row.weekOverWeekHighlights.length > 0),
    'week-over-week highlights on all editions',
  )
  assert(Array.isArray(data.reports[0]?.missedThreeConnectedKarkuns), 'miss-3 list')
  assert(Array.isArray(data.reports[0]?.nonSubmittingRuknsTwoWeeks), 'miss-2-submit list')

  const ctx = createReportContext(config)
  const built = buildWeeklyIjtemaAttendanceReportModel(ctx)
  assert(built.kind === WEEKLY_IJTEMA_ATTENDANCE_MODEL_KIND, 'direct build ok')
}

function testNoRankingInPdf(): void {
  const pdfSrc = readFileSync(
    resolve('src/lib/reporting/weeklyIjtemaAttendanceReportPdf.ts'),
    'utf8',
  )
  assert(!pdfSrc.includes('rank-badge'), 'no rank badges')
  assert(!pdfSrc.includes('top5'), 'no top performer highlights')
  assert(!pdfSrc.includes('bottom5'), 'no bottom performer highlights')
  assert(pdfSrc.includes('ijtema-exec-v1'), 'executive design class')
  assert(pdfSrc.includes('wi-summary-row'), 'summary layout')
  assert(pdfSrc.includes('wi-page-footer'), 'page footer')
  assert(pdfSrc.includes('صفحہ'), 'Urdu page numbers')
  assert(!pdfSrc.includes('Karkun Connect ·'), 'no technical header metadata')
  assert(!pdfSrc.includes('generatedTimestamp'), 'no timestamp in HTML output')
  assert(pdfSrc.includes('wi-meeting-dates'), 'meeting dates inside report body')
  assert(!pdfSrc.includes('wi-cover-dates'), 'no meeting dates on cover')
  assert(pdfSrc.includes('pdf-page-rukn'), 'rukn pages avoid split')
  assert(pdfSrc.includes('break-inside: avoid'), 'page-break guard on rukn sections')
  const ruknPerf = pdfSrc.indexOf('L.ruknPerformance')
  const aazimPerf = pdfSrc.indexOf('L.aazimRuknPerformance')
  const wow = pdfSrc.indexOf('L.weekOverWeek')
  const exec = pdfSrc.indexOf('L.executiveSummary')
  assert(ruknPerf > 0 && aazimPerf > 0, 'Rukn and Aazim performance headings exist')
  assert(wow > 0 && wow < exec, 'WoW before remaining executive summary sections')
  assert(pdfSrc.includes('Weekly_Ijtema_${slice.fileSlug}'), 'three-file download names')
  assert(pdfSrc.includes("palette: 'emerald'") || pdfSrc.includes('#064e3b'), 'emerald palette')
  assert(pdfSrc.includes('#1e3a5f'), 'navy palette')
  assert(pdfSrc.includes('#701a75'), 'plum palette')
  const urduSrc = readFileSync(
    resolve('src/lib/reporting/weeklyIjtemaExecutiveReportUrdu.ts'),
    'utf8',
  )
  assert(urduSrc.includes('خلاصۂ جائزہ'), 'executive summary heading')
  assert(urduSrc.includes('اہم مشاہدات'), 'observation heading')
  assert(urduSrc.includes('شرکت کا جائزہ'), 'comparison heading')
  assert(urduSrc.includes('رکن وار تفصیل'), 'rukn detail heading')
  assert(urduSrc.includes('مزید توجہ کے متقاضی کارکنان'), 'follow-up heading')
}

function testExporterWiring(): void {
  const src = readFileSync(
    resolve('src/lib/reporting/v2/exporters/exportReportDocument.ts'),
    'utf8',
  )
  assert(src.includes('downloadWeeklyIjtemaAttendanceReportPdf'), 'exporter PDF wired')
  const pdfSrc = readFileSync(
    resolve('src/lib/reporting/weeklyIjtemaAttendanceReportPdf.ts'),
    'utf8',
  )
  assert(pdfSrc.includes('for (const slice of editions)'), 'three PDF loop')
  const modelSrc = readFileSync(
    resolve('src/lib/reporting/weeklyIjtemaAttendanceReportModel.ts'),
    'utf8',
  )
  assert(modelSrc.includes('getActiveRuknRows'), 'Rukn rows via KC-033')
  assert(modelSrc.includes('getSummariesView'), 'register via KC-033')
  assert(!modelSrc.includes('firestore'), 'no firestore')
}

function testExecutiveUnaffected(): void {
  ensure()
  const model = composeKc034CampaignReportModel({ generatedBy: 'verify-kc-038c' })
  assert(typeof model.executive.overallCampaignProgress === 'number', 'executive progress')
}

function testOfficerSplitAndScopes(): void {
  assert(
    resolveWeeklyIjtemaReportGenders('mens_wing').join() === 'Male',
    'mens_wing is Male only',
  )
  assert(
    resolveWeeklyIjtemaReportGenders('womens_wing').join() === 'Female',
    'womens_wing is Female only',
  )
  assert(
    resolveWeeklyIjtemaReportGenders('overall_campaign').join() === 'Male,Female',
    'overall is both genders',
  )
  const split = splitPerformanceRows([
    {
      ruknId: 'AR01',
      ruknName: 'Aazim Fixture',
      officerKind: 'a_rukn',
      connected: 1,
      reminded: 1,
      present: 1,
      absent: 0,
      attendancePct: 100,
      submitted: true,
    },
    {
      ruknId: 'R001',
      ruknName: 'Rukn Fixture',
      officerKind: 'rukn',
      connected: 1,
      reminded: 1,
      present: 0,
      absent: 1,
      attendancePct: 0,
      submitted: true,
    },
  ])
  assert(split.rukn.length === 1 && split.rukn[0]?.ruknId === 'R001', 'Rukn performance isolated')
  assert(split.aazim.length === 1 && split.aazim[0]?.ruknId === 'AR01', 'Aazim performance isolated')
  assert(
    officerMatchesWeeklyIjtemaExport(
      { id: 'R010', gender: 'Male', officerKind: 'rukn' },
      'male_rukn',
    ),
    'male Rukn in Rukn report',
  )
  assert(
    !officerMatchesWeeklyIjtemaExport(
      { id: 'R010', gender: 'Male', officerKind: 'rukn' },
      'male_a_rukn',
    ),
    'male Rukn not in Aazim report',
  )
  assert(
    !officerMatchesWeeklyIjtemaExport(
      { id: 'R010', gender: 'Male', officerKind: 'rukn' },
      'women',
    ),
    'male Rukn not in Women report',
  )
  assert(
    officerMatchesWeeklyIjtemaExport(
      { id: 'AR01', gender: 'Male', officerKind: 'a_rukn' },
      'male_a_rukn',
    ),
    'male Aazim in Aazim report',
  )
  assert(
    !officerMatchesWeeklyIjtemaExport(
      { id: 'AR01', gender: 'Male', officerKind: 'a_rukn' },
      'male_rukn',
    ),
    'male Aazim not in Rukn report',
  )
  assert(
    officerMatchesWeeklyIjtemaExport(
      { id: 'R004', gender: 'Female', officerKind: 'rukn' },
      'women',
    ),
    'female Rukn in Women report',
  )
  assert(
    officerMatchesWeeklyIjtemaExport(
      { id: 'AR02', gender: 'Female', officerKind: 'a_rukn' },
      'women',
    ),
    'female Aazim in Women report',
  )
  assert(
    !officerMatchesWeeklyIjtemaExport(
      { id: 'AR02', gender: 'Female', officerKind: 'a_rukn' },
      'male_a_rukn',
    ),
    'female Aazim not mixed into male Aazim report',
  )
  assert(audienceGenderForWeeklyIjtemaExport('male_rukn') === 'Male', 'Rukn uses Male events')
  assert(audienceGenderForWeeklyIjtemaExport('male_a_rukn') === 'Male', 'Aazim uses Male events')
  assert(audienceGenderForWeeklyIjtemaExport('women') === 'Female', 'Women uses Female events')
}

function seedKarkun(input: {
  id: string
  name: string
  gender: 'Male' | 'Female'
  ruknId: string
  ruknName: string
}): void {
  const now = new Date().toISOString()
  const karkun: KarkunRegistryRecord = {
    id: input.id,
    name: input.name,
    gender: input.gender,
    mobile: `0300${input.id.replace(/\D/g, '').slice(0, 7) || '038C00'}`,
    place: 'Karachi',
    status: 'active',
    createdAt: now,
    updatedAt: now,
    updatedBy: 'Verification',
    address: '',
    area: '',
    assignedRukn: input.ruknName,
    assignedRuknId: input.ruknId,
    assignmentStatus: 'Assigned',
    campaignStatus: 'not_assigned',
    visitStatus: 'none',
    lastVisit: null,
    commitment: null,
    currentCommitment: '',
    jihAppRegistrationStatus: 'Not Discussed',
    notes: '',
    isArchived: false,
    category: 'Karkun',
  }
  MOCK_KARKUN_REGISTRY.push(karkun)
}

function assignmentFor(
  id: string,
  ruknId: string,
  karkunId: string,
  now: string,
): AssignmentRecord {
  return {
    assignmentId: id,
    assignmentNumber: id,
    ruknId,
    karkunId,
    assignedDate: now.slice(0, 10),
    effectiveFrom: now.slice(0, 10),
    status: 'Active',
    assignedBy: 'Administrator',
    createdAt: now,
    updatedAt: now,
  }
}

function testGenderedWingsAndConsecutiveRules(): void {
  clearWeeklyIjtemaStore()
  clearIjtemaAttendanceStore()
  clearAssignmentStore()
  MOCK_KARKUN_REGISTRY.length = 0

  const males = ruknMaster.filter((r) => r.status === 'active' && r.gender === 'Male')
  const females = ruknMaster.filter((r) => r.status === 'active' && r.gender === 'Female')
  const maleSubmit = males[0]
  const maleSilent = males[1]
  const femaleSubmit = females[0]
  const femaleSilent = females[1]
  assert(Boolean(maleSubmit && maleSilent && femaleSubmit && femaleSilent), 'two male + two female rukns')

  const now = new Date().toISOString()
  const people = [
    { id: 'K-038C-M-MISS', name: 'Male Miss Three', gender: 'Male' as const, rukn: maleSubmit! },
    { id: 'K-038C-M-ATT', name: 'Male Attended', gender: 'Male' as const, rukn: maleSubmit! },
    { id: 'K-038C-M-NS', name: 'Male Silent Karkun', gender: 'Male' as const, rukn: maleSilent! },
    { id: 'K-038C-F-MISS', name: 'Female Miss Three', gender: 'Female' as const, rukn: femaleSubmit! },
    { id: 'K-038C-F-ATT', name: 'Female Attended', gender: 'Female' as const, rukn: femaleSubmit! },
    { id: 'K-038C-F-NS', name: 'Female Silent Karkun', gender: 'Female' as const, rukn: femaleSilent! },
  ]
  for (const person of people) {
    seedKarkun({
      id: person.id,
      name: person.name,
      gender: person.gender,
      ruknId: person.rukn.id,
      ruknName: person.rukn.name,
    })
  }
  replaceAllAssignments(
    people.map((person, index) =>
      assignmentFor(`A-038C-${index + 1}`, person.rukn.id, person.id, now),
    ),
    2,
  )

  const dates = ['2026-06-07', '2026-06-14', '2026-06-21']
  for (const [weekIndex, meetingDate] of dates.entries()) {
    const maleEvent = createWeeklyIjtemaEvent({
      meetingDate,
      title: `KC-038C Male ${meetingDate}`,
      createdBy: 'Admin',
      audienceGender: 'Male',
      submissionDeadline: '2026-12-31T23:59:59.000Z',
    })
    const femaleEvent = createWeeklyIjtemaEvent({
      meetingDate,
      title: `KC-038C Female ${meetingDate}`,
      createdBy: 'Admin',
      audienceGender: 'Female',
      submissionDeadline: '2026-12-31T23:59:59.000Z',
    })
    assert(maleEvent.success && femaleEvent.success, `events ${meetingDate}`)
    if (!maleEvent.success || !femaleEvent.success) return

    const markSubmitter = (
      eventId: string,
      rukn: { id: string; name: string },
      karkunId: string,
      karkunName: string,
      status: 'Present' | 'Absent',
    ) => {
      const result = upsertWeeklyIjtemaKarkunMark({
        eventId,
        ruknId: rukn.id,
        ruknName: rukn.name,
        karkunId,
        karkunName,
        status,
        reminded: true,
        submittedBy: rukn.id,
      })
      assert(result.success, `mark ${karkunId} ${meetingDate}`)
    }

    markSubmitter(maleEvent.event.id, maleSubmit!, 'K-038C-M-MISS', 'Male Miss Three', 'Absent')
    markSubmitter(
      maleEvent.event.id,
      maleSubmit!,
      'K-038C-M-ATT',
      'Male Attended',
      weekIndex === dates.length - 1 ? 'Present' : 'Absent',
    )
    markSubmitter(femaleEvent.event.id, femaleSubmit!, 'K-038C-F-MISS', 'Female Miss Three', 'Absent')
    markSubmitter(
      femaleEvent.event.id,
      femaleSubmit!,
      'K-038C-F-ATT',
      'Female Attended',
      weekIndex === dates.length - 1 ? 'Present' : 'Absent',
    )

    if (weekIndex === 0) {
      markSubmitter(maleEvent.event.id, maleSilent!, 'K-038C-M-NS', 'Male Silent Karkun', 'Absent')
      markSubmitter(
        femaleEvent.event.id,
        femaleSilent!,
        'K-038C-F-NS',
        'Female Silent Karkun',
        'Absent',
      )
    }
  }

  const maleMeetings = listCanonicalIjtemaMeetingsForAudience('Male')
  const femaleMeetings = listCanonicalIjtemaMeetingsForAudience('Female')
  assert(maleMeetings.length >= 3 && femaleMeetings.length >= 3, 'three consecutive meetings per gender')

  const maleMiss = buildMissedThreeConnectedKarkuns(maleMeetings, [maleSubmit!.id, maleSilent!.id])
  const femaleMiss = buildMissedThreeConnectedKarkuns(femaleMeetings, [
    femaleSubmit!.id,
    femaleSilent!.id,
  ])
  assert(
    maleMiss.some((row) => row.karkunId === 'K-038C-M-MISS'),
    'male miss-3 includes never-present karkun',
  )
  assert(
    !maleMiss.some((row) => row.karkunId === 'K-038C-M-ATT'),
    'male miss-3 excludes karkun who attended week 3',
  )
  assert(
    femaleMiss.some((row) => row.karkunId === 'K-038C-F-MISS'),
    'female miss-3 includes never-present karkun',
  )
  assert(
    !femaleMiss.some((row) => row.karkunId === 'K-038C-F-ATT'),
    'female miss-3 excludes karkun who attended week 3',
  )

  const maleSilentList = buildNonSubmittingRuknsTwoWeeks(maleMeetings, [
    maleSubmit!.id,
    maleSilent!.id,
  ])
  const femaleSilentList = buildNonSubmittingRuknsTwoWeeks(femaleMeetings, [
    femaleSubmit!.id,
    femaleSilent!.id,
  ])
  assert(
    maleSilentList.some((row) => row.ruknId === maleSilent!.id),
    'male miss-2 includes non-submitting rukn',
  )
  assert(
    !maleSilentList.some((row) => row.ruknId === maleSubmit!.id),
    'male miss-2 excludes submitting rukn',
  )
  assert(
    femaleSilentList.some((row) => row.ruknId === femaleSilent!.id),
    'female miss-2 includes non-submitting rukn',
  )
  assert(
    !femaleSilentList.some((row) => row.ruknId === femaleSubmit!.id),
    'female miss-2 excludes submitting rukn',
  )

  ensure()
  const overallDoc = composeReport(
    defaultKc034Config({
      reportType: 'weekly_ijtema',
      scope: 'overall_campaign',
      enabledSections: blueprintSectionsFor('weekly_ijtema'),
      outputType: 'pdf',
      detailLevel: 'standard',
      language: 'ur',
      generatedBy: 'verify-kc-038c',
    }),
  )
  const overall = overallDoc.sections[0]!.model.data
  assert(isWeeklyIjtemaAttendanceReportModel(overall), 'overall model')
  assert(overall.reports.length === 3, 'one action yields three editions')
  const ruknReport = overall.reports.find((row) => row.kind === 'male_rukn')
  const aazimReport = overall.reports.find((row) => row.kind === 'male_a_rukn')
  const womenReport = overall.reports.find((row) => row.kind === 'women')
  assert(Boolean(ruknReport && aazimReport && womenReport), 'all three editions present')
  assert(ruknReport!.reportTitle.includes('رکن') && !ruknReport!.reportTitle.includes('عازم'), 'Rukn title')
  assert(aazimReport!.reportTitle.includes('عازم رکن'), 'Aazim title')
  assert(womenReport!.reportTitle.includes('زنانہ'), 'Women title')
  assert(ruknReport!.palette === 'emerald' && aazimReport!.palette === 'navy' && womenReport!.palette === 'plum', 'distinct palettes')
  assert(
    ruknReport!.ruknDetails.every((row) =>
      officerMatchesWeeklyIjtemaExport(
        {
          id: row.ruknId,
          gender: ruknMaster.find((r) => r.id === row.ruknId)?.gender,
          officerKind: ruknMaster.find((r) => r.id === row.ruknId)?.officerKind,
        },
        'male_rukn',
      ),
    ),
    'Rukn edition is male Rukn only',
  )
  assert(
    aazimReport!.ruknDetails.every((row) =>
      officerMatchesWeeklyIjtemaExport(
        {
          id: row.ruknId,
          gender: ruknMaster.find((r) => r.id === row.ruknId)?.gender,
          officerKind: ruknMaster.find((r) => r.id === row.ruknId)?.officerKind,
        },
        'male_a_rukn',
      ),
    ),
    'Aazim edition is male Aazim only',
  )
  assert(
    womenReport!.ruknDetails.every((row) =>
      officerMatchesWeeklyIjtemaExport(
        {
          id: row.ruknId,
          gender: ruknMaster.find((r) => r.id === row.ruknId)?.gender,
          officerKind: ruknMaster.find((r) => r.id === row.ruknId)?.officerKind,
        },
        'women',
      ),
    ),
    'Women edition is female officers only',
  )
  assert(
    womenReport!.ruknDetails.some((row) => row.ruknId === femaleSubmit!.id),
    'Women keeps female Rukn',
  )
  assert(
    !ruknReport!.ruknDetails.some((row) => row.ruknId === femaleSubmit!.id),
    'female Rukn not mixed into male Rukn edition',
  )
  assert(ruknReport!.weekOverWeekHighlights.length > 0, 'Rukn WoW')
  assert(womenReport!.weekOverWeekHighlights.length > 0, 'Women WoW')
  assert(
    ruknReport!.missedThreeConnectedKarkuns.some((row) => row.karkunId === 'K-038C-M-MISS'),
    'Rukn composed miss-3',
  )
  assert(
    womenReport!.missedThreeConnectedKarkuns.some((row) => row.karkunId === 'K-038C-F-MISS'),
    'Women composed miss-3',
  )
  assert(
    ruknReport!.nonSubmittingRuknsTwoWeeks.some((row) => row.ruknId === maleSilent!.id),
    'Rukn composed miss-2',
  )
  assert(
    womenReport!.nonSubmittingRuknsTwoWeeks.some((row) => row.ruknId === femaleSilent!.id),
    'Women composed miss-2',
  )

  const ruknHtml = buildWeeklyIjtemaAttendanceReportHtmlForSlice(overall, ruknReport!)
  const aazimHtml = buildWeeklyIjtemaAttendanceReportHtmlForSlice(overall, aazimReport!)
  const womenHtml = buildWeeklyIjtemaAttendanceReportHtmlForSlice(overall, womenReport!)
  assert(ruknHtml.includes(ruknReport!.reportTitle), 'Rukn PDF title in HTML')
  assert(aazimHtml.includes(aazimReport!.reportTitle), 'Aazim PDF title in HTML')
  assert(womenHtml.includes(womenReport!.reportTitle), 'Women PDF title in HTML')
  assert(!ruknHtml.includes('عازم رکن کارکردگی'), 'Rukn PDF omits Aazim performance heading')
  assert(womenHtml.includes('رکن کارکردگی'), 'Women PDF keeps Rukn performance')
  assert(ijtemaExecutiveReportCss('emerald').includes('#064e3b'), 'Rukn CSS emerald')
  assert(ijtemaExecutiveReportCss('navy').includes('#1e3a5f'), 'Aazim CSS navy')
  assert(ijtemaExecutiveReportCss('plum').includes('#701a75'), 'Women CSS plum')
}

const cases = [
  run('blueprint + catalog', testBlueprintAndCatalog),
  run('Composer builds KC-038C executive model', testComposeExecutiveModel),
  run('PDF has no ranking / leaderboard', testNoRankingInPdf),
  run('Exporter + KC-033 path', testExporterWiring),
  run('Executive campaign report unaffected', testExecutiveUnaffected),
  run('Rukn/Aazim split + report scopes', testOfficerSplitAndScopes),
  run('Men/Women consecutive attendance rules', testGenderedWingsAndConsecutiveRules),
]

const failed = cases.filter((c) => !c.passed)
console.log(
  JSON.stringify(
    {
      ok: failed.length === 0,
      ticket: 'KC-038C',
      passed: cases.filter((c) => c.passed).length,
      failed: failed.length,
      cases,
    },
    null,
    2,
  ),
)
process.exit(failed.length === 0 ? 0 : 1)
