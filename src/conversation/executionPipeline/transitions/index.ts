/**
 * Pipeline transitions barrel (KC-0131.9).
 */

export {
  PIPELINE_STAGE_TRANSITIONS,
  isLegalPipelineTransition,
  isTerminalPipelineStage,
} from '../stages/vocabulary'

export { createPipelineTransition } from '../lifecycle/factories'
export type { PipelineTransition } from '../lifecycle/models'
