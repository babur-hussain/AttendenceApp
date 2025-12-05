/**
 * Face Matcher Module Exports
 * 
 * Comprehensive biometric matching system with ONNX integration,
 * policy-driven thresholds, and TOON token encoding.
 */

// Core matching functions
export {
  cosineSimilarity,
  euclideanDistance,
  matchEmbedding,
  normalizeVector,
  createCachedEmbedding,
  fastCosineSimilarity,
  findBestMatch,
  findTopKMatches,
  assertEmbeddingShape,
} from './faceMatcher';

export type {
  MatchResult,
  CachedEmbedding,
} from './faceMatcher';

// Embedding utilities
export {
  quantizeEmbedding,
  dequantizeEmbedding,
  packEmbeddingToToon,
  unpackEmbeddingFromToon,
  computeEmbeddingChecksum,
  estimateQuantizationError,
  testQuantizationAccuracy,
} from './embeddingUtils';

export type {
  QuantizationParams,
  ToonEmbeddingTokens,
} from './embeddingUtils';

// Threshold engine
export {
  evaluateDecision,
  DEFAULT_POLICY,
  mergePolicyOverrides,
  wouldAccept,
  createEmployeeOverride,
  createRoleOverride,
  computeScoreBreakdown,
} from './thresholdEngine';

export type {
  PolicyConfig,
  DecisionResult,
  RejectionReason,
  RecommendedAction,
  BiometricMode,
  EvaluatedRule,
  ScoreBreakdown,
} from './thresholdEngine';

// Liveness detection
export {
  combineLivenessScores,
  computeMotionLivenessScore,
  computeMLLivenessScore,
  checkRemoteLiveness,
  performHybridLiveness,
  validateLiveness,
  createMockLiveness,
  DEFAULT_LIVENESS_CONFIG,
} from './livenessAdapter';

export type {
  LivenessResult,
  LivenessConfig,
  LivenessMethod,
} from './livenessAdapter';

// Matcher service
export {
  matchAndDecide,
  submitDecisionToServer,
  batchMatchAndDecide,
  preCacheEmbeddings,
} from './matcherService';

export type {
  EmployeeCandidate,
  MatchContext,
  ToonDecisionResult,
  MatchRequest,
} from './matcherService';

// Policy store
export {
  policyStore,
  getPolicyForEmployee,
  getPolicyForRole,
  getBasePolicy,
  updateBasePolicy,
  setRoleOverride,
  setEmployeeOverride,
  fetchPolicyFromServer,
  clearPolicyCache,
} from './policyStore';

// ROC analysis
export {
  generateROCReport,
  formatROCReport,
  exportROCToCSV,
  createTestDataset,
  generateMockTestDataset,
  findThresholdForTargetFPR,
  findThresholdForTargetTPR,
} from './rocGenerator';

export type {
  TestDataPoint,
  ROCPoint,
  ROCReport,
} from './rocGenerator';
