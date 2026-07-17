/**
 * Digital Rafeeq Runtime bootstrap — public API (KC-005 Sprint 2.0).
 */

export {
  getRuntimeBootstrapResult,
  getRuntimeBootstrapStatus,
  initializeRuntime,
  resetRuntimeBootstrapForTests,
  type InitializeRuntimeOptions,
  type RuntimeBootstrapResult,
  type RuntimeBootstrapStatus,
} from './initializeRuntime'

export {
  DEFAULT_RUNTIME_CONTEXT_VALUE,
  RuntimeContext,
  type RuntimeContextValue,
} from './RuntimeContext'

export { RuntimeProvider } from './RuntimeProvider'

export {
  useCommunication,
  useConversationEngine,
  useGuidance,
  useRuntime,
} from './RuntimeHooks'
