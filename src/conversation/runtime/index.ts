/**
 * Runtime Composition public API (KC-004 Sprint 1.6).
 *
 * Single entry point for assembling the Digital Rafeeq conversation runtime.
 */

export {
  RuntimeBuilder,
  createRuntimeBuilder,
  type RuntimeBuilderOptions,
} from './RuntimeBuilder'

export {
  createDefaultRuntimeConfiguration,
  mergeRuntimeConfiguration,
  type AdapterRuntimeConfig,
  type CommunicationRuntimeConfig,
  type ConversationRuntimeConfig,
  type FeatureFlagsRuntimeConfig,
  type FutureAiRuntimeConfig,
  type LocalizationRuntimeConfig,
  type LoggingRuntimeConfig,
  type RuntimeConfiguration,
  type RuntimeConfigurationOverrides,
  type TracingRuntimeConfig,
} from './RuntimeConfiguration'

export {
  RuntimeContainer,
  type RuntimeContainerParts,
} from './RuntimeContainer'

export {
  createDevelopmentRuntime,
  createProductionRuntime,
  createRuntime,
  createRuntimeFromBuilderOptions,
  createTestingRuntime,
  type RuntimeFactoryOptions,
} from './RuntimeFactory'

export {
  createRuntimeHealthApi,
  createRuntimeHealthReport,
  type RuntimeConfigurationSummary,
  type RuntimeHealthApi,
  type RuntimeHealthInput,
  type RuntimeHealthReport,
} from './RuntimeHealth'

export {
  RUNTIME_DEPENDENCY_ORDER,
  RUNTIME_VERSION,
  type ConversationRuntime,
  type RuntimeBuildInformation,
  type RuntimeEnvironment,
  type RuntimeLifecycleState,
  type RuntimeModuleId,
} from './RuntimeTypes'

export {
  validateConversationRuntime,
  validateRuntimeComposition,
  type RuntimeValidationIssue,
  type RuntimeValidationResult,
} from './RuntimeValidation'
