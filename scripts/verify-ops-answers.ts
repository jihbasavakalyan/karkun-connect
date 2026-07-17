/**
 * Verify KC-007 operational Q&A answers use live metrics shape (no crash).
 */
import { answerOperationalQuery } from '../src/features/digitalRafeeq/voice/opsAnswers'

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message)
}

const adminUnconnected = answerOperationalQuery('How many Karkuns remain unconnected?', {
  role: 'administrator',
})
assert(adminUnconnected.text.length > 0, 'admin unconnected answer empty')
assert(adminUnconnected.actions.length > 0, 'admin unconnected actions missing')

const ruknToday = answerOperationalQuery('What should I do today?', {
  role: 'rukn',
  ruknId: 'R001',
})
assert(ruknToday.text.length > 0, 'rukn today answer empty')

const attendance = answerOperationalQuery('Who missed Ijtema this week?', {
  role: 'rukn',
  ruknId: 'R001',
})
assert(attendance.text.length > 0, 'attendance answer empty')

console.log('[PASS] KC-007 ops Q&A scenarios ok')
console.log(' sample:', adminUnconnected.text.slice(0, 120))
