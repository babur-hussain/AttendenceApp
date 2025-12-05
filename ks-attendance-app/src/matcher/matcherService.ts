/**
 * Matcher Service Module
 * 
 * High-level orchestrator for face matching and decision making.
 * Integrates face matching, liveness detection, threshold evaluation,
 * and TOON token assembly for network transmission.
 * 
 * WORKFLOW:
 * 1. Shortlist candidates using k-NN (findTopKMatches)
 * 2. Match live embedding against each candidate
 * 3. Evaluate best match using policy-driven threshold engine
 * 4. Package results into TOON decision object
 * 5. Optionally submit to server via ToonClient
 * 
 * SCALE CONSIDERATIONS:
 * - For <10k employees: Linear scan with cached embeddings (current)
 * - For 10k-100k: IVF with k-NN clustering
 * - For >100k: FAISS or Annoy with GPU acceleration
 */

import {
  matchEmbedding,
  findTopKMatches,
  MatchResult,
  CachedEmbedding,
  createCachedEmbedding,
} from './faceMatcher';

import {
  evaluateDecision,
  DecisionResult,
  PolicyConfig,
} from './thresholdEngine';

import {
  LivenessResult,
  validateLiveness,
} from './livenessAdapter';

import {
  packEmbeddingToToon,
  ToonEmbeddingTokens,
} from './embeddingUtils';

import { getPolicyForEmployee } from './policyStore';

/**
 * Employee candidate for matching
 */
export interface EmployeeCandidate {
  employeeId: string;
  name: string;
  role?: string;
  department?: string;
  
  // Stored biometric data
  faceEmbedding: Float32Array;
  fingerprintTemplate?: Uint8Array;
  
  // Cached data for performance
  cachedEmbedding?: CachedEmbedding;
}

/**
 * Match context for audit trail
 */
export interface MatchContext {
  deviceId: string;
  location?: string;
  timestamp: number;
  sessionId?: string;
}

/**
 * TOON decision result for network transmission
 */
export interface ToonDecisionResult {
  // Core decision
  status: 'ACCEPTED' | 'PENDING' | 'REJECTED';
  employeeId?: string;
  confidence: number; // 0-100
  
  // TOON tokens
  F3_FACE_SCORE?: string; // Face match score (0-1)
  L1_LIVENESS?: string; // Liveness score (0-1)
  FP2_FINGERPRINT?: string; // Fingerprint score (0-1)
  S1_STATUS: string; // Decision status
  R1_REASON?: string; // Rejection reason
  E1_EMPLOYEE_ID?: string; // Matched employee ID
  CONF1_CONFIDENCE: string; // Final confidence (0-100)
  
  // Embedding (optional, for enrollment or logging)
  embeddingTokens?: ToonEmbeddingTokens;
  
  // Context
  timestamp: number;
  deviceId: string;
  location?: string;
  
  // Detailed result (not transmitted, for local logging)
  detailedResult?: DecisionResult;
  matchResult?: MatchResult;
}

/**
 * Match request parameters
 */
export interface MatchRequest {
  liveEmbedding: Float32Array;
  livenessResult?: LivenessResult;
  fingerprintScore?: number;
  candidates: EmployeeCandidate[];
  context: MatchContext;
  policyOverride?: Partial<PolicyConfig>;
}

/**
 * Main matching and decision function
 * 
 * @param request Match request with live biometric data and candidates
 * @returns TOON decision result ready for network transmission
 */
export async function matchAndDecide(
  request: MatchRequest
): Promise<ToonDecisionResult> {
  const {
    liveEmbedding,
    livenessResult,
    fingerprintScore,
    candidates,
    context,
    policyOverride,
  } = request;

  // Shortlist top K candidates for efficiency
  const K = 10;
  const candidateEmbeddings = candidates.map((c) => ({
    employeeId: c.employeeId,
    embedding: c.faceEmbedding,
  }));

  const topCandidates = findTopKMatches(
    liveEmbedding,
    candidateEmbeddings,
    K,
    'cosine'
  );

  // Find best match
  let bestMatch: MatchResult | undefined;
  let bestCandidate: EmployeeCandidate | undefined;

  for (const topMatch of topCandidates) {
    const candidate = candidates.find(
      (c) => c.employeeId === topMatch.employeeId
    );

    if (!candidate) continue;

    const match = matchEmbedding(
      liveEmbedding,
      candidate.faceEmbedding,
      'cosine'
    );

    if (!bestMatch || match.matchScore > bestMatch.matchScore) {
      bestMatch = match;
      bestCandidate = candidate;
    }
  }

  // Get policy for best match candidate (or use override)
  let policy: PolicyConfig;
  
  if (policyOverride) {
    const basePolicy = await getPolicyForEmployee(
      bestCandidate?.employeeId || 'unknown',
      bestCandidate?.role
    );
    policy = { ...basePolicy, ...policyOverride };
  } else if (bestCandidate) {
    policy = await getPolicyForEmployee(
      bestCandidate.employeeId,
      bestCandidate.role
    );
  } else {
    policy = await getPolicyForEmployee('unknown');
  }

  // Validate liveness if present
  let livenessValid = true;
  let livenessScore: number | undefined;

  if (livenessResult) {
    livenessValid = validateLiveness(livenessResult, policy.livenessMin);
    livenessScore = livenessResult.score;
  }

  // Evaluate decision using threshold engine
  const decision = evaluateDecision({
    faceMatchScore: bestMatch?.matchScore,
    livenessScore,
    fingerprintScore,
    candidateCount: topCandidates.length,
    policy,
  });

  // Package into TOON decision result
  const toonResult: ToonDecisionResult = {
    status: decision.status,
    employeeId: bestCandidate?.employeeId,
    confidence: decision.confidence,
    
    // TOON tokens
    F3_FACE_SCORE: bestMatch ? bestMatch.matchScore.toFixed(4) : undefined,
    L1_LIVENESS: livenessScore?.toFixed(4),
    FP2_FINGERPRINT: fingerprintScore?.toFixed(4),
    S1_STATUS: decision.status,
    R1_REASON: decision.primaryReason || undefined,
    E1_EMPLOYEE_ID: bestCandidate?.employeeId,
    CONF1_CONFIDENCE: decision.confidence.toFixed(2),
    
    // Context
    timestamp: context.timestamp,
    deviceId: context.deviceId,
    location: context.location,
    
    // Detailed results (local only)
    detailedResult: decision,
    matchResult: bestMatch,
  };

  // Optionally pack embedding for transmission
  // (useful for enrollment or logging)
  // toonResult.embeddingTokens = packEmbeddingToToon(liveEmbedding);

  return toonResult;
}

/**
 * Submit decision to server via ToonClient
 * 
 * TODO: TOON CLIENT INTEGRATION
 * 
 * INTEGRATION STEPS:
 * 1. Import ToonClient instance
 * 2. Call toonClient.toonPost('/api/v1/attendance/checkin', toonTokens)
 * 3. Parse response for confirmation
 * 
 * TOON REQUEST FORMAT:
 * {
 *   E1_EMPLOYEE_ID: "EMP123",
 *   F3_FACE_SCORE: "0.8234",
 *   L1_LIVENESS: "0.9100",
 *   FP2_FINGERPRINT: "0.7800",
 *   S1_STATUS: "ACCEPTED",
 *   CONF1_CONFIDENCE: "85.50",
 *   D1_DEVICE_ID: "DEVICE_001",
 *   LOC1_LOCATION: "OFFICE_A",
 *   T1_TIMESTAMP: "2024-01-15T10:30:00Z"
 * }
 * 
 * TOON RESPONSE FORMAT:
 * {
 *   ACK1_STATUS: "SUCCESS",
 *   ACK2_MESSAGE: "Check-in recorded",
 *   ACK3_RECORD_ID: "REC_789"
 * }
 * 
 * @param decision TOON decision result
 * @returns Server response
 */
export async function submitDecisionToServer(
  decision: ToonDecisionResult
): Promise<Record<string, string>> {
  // TODO: Implement ToonClient submission
  // const toonClient = getToonClient();
  // 
  // const toonRequest = {
  //   E1_EMPLOYEE_ID: decision.E1_EMPLOYEE_ID,
  //   F3_FACE_SCORE: decision.F3_FACE_SCORE,
  //   L1_LIVENESS: decision.L1_LIVENESS,
  //   FP2_FINGERPRINT: decision.FP2_FINGERPRINT,
  //   S1_STATUS: decision.S1_STATUS,
  //   R1_REASON: decision.R1_REASON,
  //   CONF1_CONFIDENCE: decision.CONF1_CONFIDENCE,
  //   D1_DEVICE_ID: decision.deviceId,
  //   LOC1_LOCATION: decision.location,
  //   T1_TIMESTAMP: new Date(decision.timestamp).toISOString(),
  // };
  // 
  // try {
  //   const response = await toonClient.toonPost(
  //     '/api/v1/attendance/checkin',
  //     toonRequest
  //   );
  //   
  //   return response;
  // } catch (error) {
  //   console.error('[MatcherService] Failed to submit decision:', error);
  //   throw error;
  // }

  console.warn('[MatcherService] Server submission not implemented');
  
  return {
    ACK1_STATUS: 'MOCK_SUCCESS',
    ACK2_MESSAGE: 'Mock response (server not connected)',
  };
}

/**
 * Batch match multiple live captures against candidates
 * 
 * Useful for processing a queue of offline captures when
 * network connectivity is restored.
 * 
 * @param requests Array of match requests
 * @returns Array of TOON decision results
 */
export async function batchMatchAndDecide(
  requests: MatchRequest[]
): Promise<ToonDecisionResult[]> {
  const results: ToonDecisionResult[] = [];

  for (const request of requests) {
    try {
      const result = await matchAndDecide(request);
      results.push(result);
    } catch (error) {
      console.error('[MatcherService] Batch match failed:', error);
      
      // Create error result
      results.push({
        status: 'REJECTED',
        confidence: 0,
        S1_STATUS: 'REJECTED',
        R1_REASON: 'processing_error',
        CONF1_CONFIDENCE: '0',
        timestamp: request.context.timestamp,
        deviceId: request.context.deviceId,
        location: request.context.location,
      });
    }
  }

  return results;
}

/**
 * Pre-cache all employee embeddings for performance
 * 
 * Call this on app startup or when employee list is updated.
 * Caches normalized embeddings to speed up similarity computation.
 * 
 * @param candidates Employee candidates to cache
 */
export function preCacheEmbeddings(candidates: EmployeeCandidate[]): void {
  console.log(`[MatcherService] Pre-caching ${candidates.length} embeddings...`);
  
  const start = Date.now();
  
  for (const candidate of candidates) {
    candidate.cachedEmbedding = createCachedEmbedding(candidate.faceEmbedding);
  }
  
  const elapsed = Date.now() - start;
  console.log(`[MatcherService] Cached ${candidates.length} embeddings in ${elapsed}ms`);
}

/**
 * TODO: SCALE OPTIMIZATION - FAISS Integration
 * 
 * For large employee databases (>10k), integrate FAISS for fast
 * approximate nearest neighbor search.
 * 
 * INTEGRATION STEPS:
 * 1. Install FAISS: `npm install faiss-node` (Node.js) or use Web Assembly
 * 2. Build index on app startup:
 *    ```
 *    import { IndexFlatIP } from 'faiss-node';
 *    const dimension = 512;
 *    const index = new IndexFlatIP(dimension);
 *    
 *    // Add all employee embeddings
 *    for (const candidate of candidates) {
 *      index.add(candidate.faceEmbedding);
 *    }
 *    ```
 * 3. Search for top-K matches:
 *    ```
 *    const K = 10;
 *    const { distances, labels } = index.search(liveEmbedding, K);
 *    const topCandidates = labels.map(idx => candidates[idx]);
 *    ```
 * 4. Proceed with regular matching logic on shortlist
 * 
 * PERFORMANCE:
 * - IndexFlatIP: Exact search, ~1ms for 100k embeddings (512-dim)
 * - IndexIVFFlat: Approximate search, ~0.1ms for 1M embeddings
 * - IndexIVFPQ: Compressed search, ~0.05ms for 10M embeddings
 * 
 * TRADEOFFS:
 * - Exact (IndexFlatIP): 100% recall, slower
 * - IVF: 95-99% recall, 10x faster
 * - IVF+PQ: 90-95% recall, 100x faster, less memory
 * 
 * For Kapoor & Sons (likely <10k employees), current linear
 * scan with cached embeddings is sufficient (~10ms).
 */


