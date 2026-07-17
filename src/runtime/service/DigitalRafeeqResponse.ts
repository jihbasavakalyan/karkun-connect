/**
 * Digital Rafeeq public response model (KC-005 Sprint 2.4).
 */

import type { CommunicationPlan } from '@/conversation/communication'
import type { ConversationLifecycleState } from '@/conversation'
import type { GuidanceBundle } from '@/conversation/guidance'
import type {
  DigitalRafeeqError,
  DigitalRafeeqExecutionMetadata,
  DigitalRafeeqHealthStatus,
  DigitalRafeeqStatus,
  DigitalRafeeqTiming,
} from './DigitalRafeeqTypes'
import type { KnowledgeSummary } from '../orchestration'

export type DigitalRafeeqResponse = {
  success: boolean
  runtimeStatus: DigitalRafeeqStatus
  conversationState: ConversationLifecycleState
  sessionId: string
  knowledgeSummary: KnowledgeSummary | null
  guidancePlan: GuidanceBundle | null
  communicationPlan: CommunicationPlan | null
  health: DigitalRafeeqHealthStatus
  timing: DigitalRafeeqTiming
  metadata: DigitalRafeeqExecutionMetadata
  error?: DigitalRafeeqError
}
