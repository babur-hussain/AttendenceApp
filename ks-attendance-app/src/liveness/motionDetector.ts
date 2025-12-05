/**
 * Motion-Based Liveness Detectors
 * 
 * Implements motion-based liveness checks:
 * - Blink detection using Eye Aspect Ratio (EAR)
 * - Head turn detection using landmark-based yaw estimation
 * - Mouth movement detection for voice/mouth prompts
 * - Frame stability checking to detect static photos/replay attacks
 */

/**
 * 3D point for facial landmarks
 */
export interface Point3D {
  x: number;
  y: number;
  z?: number;
}

/**
 * Facial landmarks (68-point or 5-point model)
 */
export interface FaceLandmarks {
  leftEye: Point3D[];   // Left eye points (6 points for 68-point model)
  rightEye: Point3D[];  // Right eye points (6 points)
  nose: Point3D[];      // Nose points
  mouth: Point3D[];     // Mouth points
  jawline?: Point3D[];  // Jawline for pose estimation
  timestamp: number;    // Frame timestamp
}

/**
 * Blink detection result
 */
export interface BlinkDetectionResult {
  score: number;        // 0-1, higher = more confident live
  blinkCount: number;   // Number of blinks detected
  blinkEvents: Array<{
    timestamp: number;
    ear: number;        // Eye aspect ratio at blink
    confidence: number;
  }>;
  avgEAR: number;       // Average eye aspect ratio
  normalized: boolean;
}

/**
 * Head turn detection result
 */
export interface HeadTurnResult {
  score: number;        // 0-1, higher = more confident live
  turnCount: number;    // Number of significant turns detected
  turnEvents: Array<{
    timestamp: number;
    yaw: number;        // Yaw angle in degrees
    direction: 'left' | 'right' | 'center';
    confidence: number;
  }>;
  yawRange: number;     // Total yaw range covered
  normalized: boolean;
}

/**
 * Mouth movement detection result
 */
export interface MouthMovementResult {
  score: number;        // 0-1, higher = more confident live
  movementCount: number;
  movementEvents: Array<{
    timestamp: number;
    mar: number;        // Mouth aspect ratio
    confidence: number;
  }>;
  avgMAR: number;
  normalized: boolean;
}

/**
 * Frame stability result (anti-replay/photo detection)
 */
export interface StabilityResult {
  score: number;        // 0-1, higher = more confident live
  isStatic: boolean;    // True if frames appear static
  variance: number;     // Pixel variance across frames
  temporalConsistency: number; // Motion consistency score
  reasons: string[];
}

// ============================================================================
// BLINK DETECTION (Eye Aspect Ratio Algorithm)
// ============================================================================

/**
 * Compute Eye Aspect Ratio (EAR)
 * 
 * Formula (from Soukupová & Čech, 2016):
 * EAR = (||p2-p6|| + ||p3-p5||) / (2 * ||p1-p4||)
 * 
 * Where p1-p6 are the 6 eye landmarks:
 * p1, p4: horizontal corners
 * p2, p3, p5, p6: vertical landmarks
 * 
 * Typical values:
 * - Open eye: EAR ≈ 0.25-0.35
 * - Closed eye: EAR ≈ 0.15-0.20
 * - Blink threshold: EAR < 0.22
 * 
 * @param eyePoints Array of 6 eye landmark points
 * @returns Eye aspect ratio
 */
export function computeEAR(eyePoints: Point3D[]): number {
  if (eyePoints.length < 6) {
    console.warn('[MotionDetector] Not enough eye points for EAR');
    return 0.3; // Default open eye value
  }

  const [p1, p2, p3, p4, p5, p6] = eyePoints;

  // Euclidean distance helper
  const dist = (a: Point3D, b: Point3D): number => {
    return Math.sqrt(
      Math.pow(a.x - b.x, 2) + 
      Math.pow(a.y - b.y, 2)
    );
  };

  // Vertical distances
  const vertical1 = dist(p2, p6);
  const vertical2 = dist(p3, p5);

  // Horizontal distance
  const horizontal = dist(p1, p4);

  if (horizontal < 1e-6) {
    return 0.3; // Avoid division by zero
  }

  const ear = (vertical1 + vertical2) / (2.0 * horizontal);
  return ear;
}

/**
 * Detect blinks in a sequence of frames
 * 
 * Algorithm:
 * 1. Compute EAR for each frame
 * 2. Detect blink when EAR drops below threshold (0.22) then rises
 * 3. Count valid blinks (complete close-open cycle)
 * 4. Score based on blink count and temporal consistency
 * 
 * @param landmarkSequence Array of landmarks from consecutive frames
 * @param options Detection options
 * @returns Blink detection result
 */
export function blinkDetector(
  landmarkSequence: FaceLandmarks[],
  options: {
    earThreshold?: number;      // Blink threshold (default: 0.22)
    minBlinkDuration?: number;  // Min blink duration in ms (default: 100)
    maxBlinkDuration?: number;  // Max blink duration in ms (default: 400)
    targetBlinkCount?: number;  // Expected blink count (default: 2)
  } = {}
): BlinkDetectionResult {
  const {
    earThreshold = 0.22,
    minBlinkDuration = 100,
    maxBlinkDuration = 400,
    targetBlinkCount = 2,
  } = options;

  const blinkEvents: BlinkDetectionResult['blinkEvents'] = [];
  const earValues: number[] = [];

  // State tracking
  let isBlinking = false;
  let blinkStartTime = 0;
  let blinkStartEAR = 0;

  // Process each frame
  for (const landmarks of landmarkSequence) {
    // Compute average EAR for both eyes
    const leftEAR = computeEAR(landmarks.leftEye);
    const rightEAR = computeEAR(landmarks.rightEye);
    const avgEAR = (leftEAR + rightEAR) / 2;

    earValues.push(avgEAR);

    // Detect blink start
    if (!isBlinking && avgEAR < earThreshold) {
      isBlinking = true;
      blinkStartTime = landmarks.timestamp;
      blinkStartEAR = avgEAR;
    }

    // Detect blink end (eye reopened)
    if (isBlinking && avgEAR >= earThreshold) {
      const blinkDuration = landmarks.timestamp - blinkStartTime;

      // Validate blink duration
      if (blinkDuration >= minBlinkDuration && blinkDuration <= maxBlinkDuration) {
        blinkEvents.push({
          timestamp: blinkStartTime,
          ear: blinkStartEAR,
          confidence: 1.0 - Math.abs(blinkStartEAR - earThreshold) / earThreshold,
        });
      }

      isBlinking = false;
    }
  }

  // Compute average EAR
  const avgEAR = earValues.reduce((sum, ear) => sum + ear, 0) / earValues.length;

  // Compute score
  let score = 0;
  
  if (blinkEvents.length === 0) {
    score = 0.1; // Very low if no blinks detected
  } else if (blinkEvents.length < targetBlinkCount) {
    // Partial credit for some blinks
    score = 0.3 + (blinkEvents.length / targetBlinkCount) * 0.4;
  } else {
    // Full credit if target met
    score = 0.7 + Math.min(0.3, blinkEvents.length / targetBlinkCount * 0.1);
  }

  // Boost score if blinks are evenly spaced (more natural)
  if (blinkEvents.length >= 2) {
    const intervals: number[] = [];
    for (let i = 1; i < blinkEvents.length; i++) {
      intervals.push(blinkEvents[i].timestamp - blinkEvents[i - 1].timestamp);
    }
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance = intervals.reduce((sum, val) => sum + Math.pow(val - avgInterval, 2), 0) / intervals.length;
    const consistency = Math.exp(-variance / 100000); // Lower variance = higher consistency
    score = Math.min(1.0, score + consistency * 0.1);
  }

  return {
    score: Math.max(0, Math.min(1, score)),
    blinkCount: blinkEvents.length,
    blinkEvents,
    avgEAR,
    normalized: true,
  };
}

// ============================================================================
// HEAD TURN DETECTION (Yaw Estimation)
// ============================================================================

/**
 * Estimate yaw angle from facial landmarks
 * 
 * Simplified approach using nose-to-eye-center ratio:
 * - When face is frontal: nose is centered between eyes
 * - When face turns left: nose shifts right relative to eyes
 * - When face turns right: nose shifts left relative to eyes
 * 
 * More accurate: Use 3D pose estimation (solvePnP), but requires calibration
 * 
 * @param landmarks Face landmarks
 * @returns Estimated yaw angle in degrees (-90 to +90)
 */
export function estimateYaw(landmarks: FaceLandmarks): number {
  if (landmarks.leftEye.length === 0 || landmarks.rightEye.length === 0 || landmarks.nose.length === 0) {
    return 0;
  }

  // Get eye centers
  const leftEyeCenter = {
    x: landmarks.leftEye.reduce((sum, p) => sum + p.x, 0) / landmarks.leftEye.length,
    y: landmarks.leftEye.reduce((sum, p) => sum + p.y, 0) / landmarks.leftEye.length,
  };

  const rightEyeCenter = {
    x: landmarks.rightEye.reduce((sum, p) => sum + p.x, 0) / landmarks.rightEye.length,
    y: landmarks.rightEye.reduce((sum, p) => sum + p.y, 0) / landmarks.rightEye.length,
  };

  // Get nose tip (assume first nose point)
  const noseTip = landmarks.nose[0];

  // Face center (midpoint between eyes)
  const faceCenter = {
    x: (leftEyeCenter.x + rightEyeCenter.x) / 2,
    y: (leftEyeCenter.y + rightEyeCenter.y) / 2,
  };

  // Inter-eye distance
  const interEyeDistance = Math.sqrt(
    Math.pow(rightEyeCenter.x - leftEyeCenter.x, 2) +
    Math.pow(rightEyeCenter.y - leftEyeCenter.y, 2)
  );

  // Nose offset from face center (normalized by inter-eye distance)
  const noseOffsetX = (noseTip.x - faceCenter.x) / interEyeDistance;

  // Convert to yaw angle (rough approximation)
  // Typical range: -0.5 to +0.5 corresponds to -30° to +30°
  const yaw = noseOffsetX * 60; // Scale to degrees

  return Math.max(-90, Math.min(90, yaw));
}

/**
 * Detect head turns in a sequence of frames
 * 
 * Algorithm:
 * 1. Estimate yaw for each frame
 * 2. Detect significant turns (yaw change > threshold)
 * 3. Count left/right turns
 * 4. Score based on turn count and yaw range covered
 * 
 * @param landmarkSequence Array of landmarks from consecutive frames
 * @param options Detection options
 * @returns Head turn detection result
 */
export function headTurnDetector(
  landmarkSequence: FaceLandmarks[],
  options: {
    yawThreshold?: number;      // Min yaw change to count as turn (default: 15°)
    targetTurnCount?: number;   // Expected turn count (default: 2)
    minYawRange?: number;       // Min total yaw range for good score (default: 30°)
  } = {}
): HeadTurnResult {
  const {
    yawThreshold = 15,
    targetTurnCount = 2,
    minYawRange = 30,
  } = options;

  const turnEvents: HeadTurnResult['turnEvents'] = [];
  const yawValues: number[] = [];

  let prevYaw = 0;
  let prevDirection: 'left' | 'right' | 'center' = 'center';

  for (const landmarks of landmarkSequence) {
    const yaw = estimateYaw(landmarks);
    yawValues.push(yaw);

    // Determine direction
    let direction: 'left' | 'right' | 'center' = 'center';
    if (yaw < -yawThreshold / 2) {
      direction = 'left';
    } else if (yaw > yawThreshold / 2) {
      direction = 'right';
    }

    // Detect turn (direction change)
    if (direction !== prevDirection && direction !== 'center') {
      const yawChange = Math.abs(yaw - prevYaw);
      
      if (yawChange >= yawThreshold) {
        turnEvents.push({
          timestamp: landmarks.timestamp,
          yaw,
          direction,
          confidence: Math.min(1.0, yawChange / (yawThreshold * 2)),
        });
      }
    }

    prevYaw = yaw;
    prevDirection = direction;
  }

  // Compute yaw range
  const minYaw = Math.min(...yawValues);
  const maxYaw = Math.max(...yawValues);
  const yawRange = maxYaw - minYaw;

  // Compute score
  let score = 0;

  if (turnEvents.length === 0) {
    score = 0.1; // Very low if no turns
  } else if (turnEvents.length < targetTurnCount) {
    score = 0.3 + (turnEvents.length / targetTurnCount) * 0.4;
  } else {
    score = 0.7 + Math.min(0.3, turnEvents.length / targetTurnCount * 0.1);
  }

  // Boost score based on yaw range covered
  if (yawRange >= minYawRange) {
    score = Math.min(1.0, score + 0.1);
  }

  return {
    score: Math.max(0, Math.min(1, score)),
    turnCount: turnEvents.length,
    turnEvents,
    yawRange,
    normalized: true,
  };
}

// ============================================================================
// MOUTH MOVEMENT DETECTION (Mouth Aspect Ratio)
// ============================================================================

/**
 * Compute Mouth Aspect Ratio (MAR)
 * 
 * Similar to EAR but for mouth:
 * MAR = (||p2-p8|| + ||p3-p7|| + ||p4-p6||) / (2 * ||p1-p5||)
 * 
 * Where p1-p8 are mouth landmarks
 * 
 * @param mouthPoints Array of mouth landmark points
 * @returns Mouth aspect ratio
 */
export function computeMAR(mouthPoints: Point3D[]): number {
  if (mouthPoints.length < 8) {
    console.warn('[MotionDetector] Not enough mouth points for MAR');
    return 0.2; // Default closed mouth
  }

  const [p1, p2, p3, p4, p5, p6, p7, p8] = mouthPoints;

  const dist = (a: Point3D, b: Point3D): number => {
    return Math.sqrt(
      Math.pow(a.x - b.x, 2) + 
      Math.pow(a.y - b.y, 2)
    );
  };

  // Vertical distances
  const v1 = dist(p2, p8);
  const v2 = dist(p3, p7);
  const v3 = dist(p4, p6);

  // Horizontal distance
  const horizontal = dist(p1, p5);

  if (horizontal < 1e-6) {
    return 0.2;
  }

  const mar = (v1 + v2 + v3) / (2.0 * horizontal);
  return mar;
}

/**
 * Detect mouth movements (e.g., speaking, mouth opening)
 * 
 * @param landmarkSequence Array of landmarks from consecutive frames
 * @param options Detection options
 * @returns Mouth movement detection result
 */
export function mouthMovementDetector(
  landmarkSequence: FaceLandmarks[],
  options: {
    marThreshold?: number;      // Movement threshold (default: 0.3)
    targetMovementCount?: number; // Expected movements (default: 1)
  } = {}
): MouthMovementResult {
  const {
    marThreshold = 0.3,
    targetMovementCount = 1,
  } = options;

  const movementEvents: MouthMovementResult['movementEvents'] = [];
  const marValues: number[] = [];

  let prevMAR = 0;

  for (const landmarks of landmarkSequence) {
    const mar = computeMAR(landmarks.mouth);
    marValues.push(mar);

    // Detect significant mouth opening
    if (mar > marThreshold && prevMAR <= marThreshold) {
      movementEvents.push({
        timestamp: landmarks.timestamp,
        mar,
        confidence: Math.min(1.0, mar / marThreshold),
      });
    }

    prevMAR = mar;
  }

  const avgMAR = marValues.reduce((sum, mar) => sum + mar, 0) / marValues.length;

  // Compute score
  let score = 0;
  
  if (movementEvents.length === 0) {
    score = 0.5; // Neutral (mouth movement is optional)
  } else if (movementEvents.length < targetMovementCount) {
    score = 0.6 + (movementEvents.length / targetMovementCount) * 0.2;
  } else {
    score = 0.8 + Math.min(0.2, movementEvents.length / targetMovementCount * 0.1);
  }

  return {
    score: Math.max(0, Math.min(1, score)),
    movementCount: movementEvents.length,
    movementEvents,
    avgMAR,
    normalized: true,
  };
}

// ============================================================================
// FRAME STABILITY CHECKING (Anti-Replay Detection)
// ============================================================================

/**
 * Check frame stability to detect static photos or video replay
 * 
 * Indicators of live capture:
 * - Micro-movements (small pixel changes even when "still")
 * - Temporal consistency (motion follows natural patterns)
 * - Illumination changes (subtle lighting variations)
 * 
 * @param frames Array of raw frame data or frame hashes
 * @param options Detection options
 * @returns Stability check result
 */
export function frameStabilityChecker(
  frames: Array<{
    data?: Uint8ClampedArray | number[]; // Optional pixel data
    hash?: string;                        // Optional frame hash
    timestamp: number;
    width?: number;
    height?: number;
  }>,
  options: {
    minVariance?: number;     // Min pixel variance for live (default: 100)
    maxStaticFrames?: number; // Max consecutive static frames (default: 3)
  } = {}
): StabilityResult {
  const {
    minVariance = 100,
    maxStaticFrames = 3,
  } = options;

  const reasons: string[] = [];

  if (frames.length < 2) {
    return {
      score: 0.5,
      isStatic: false,
      variance: 0,
      temporalConsistency: 0.5,
      reasons: ['Insufficient frames for stability check'],
    };
  }

  // Method 1: Hash-based detection (if hashes provided)
  if (frames.every(f => f.hash)) {
    const uniqueHashes = new Set(frames.map(f => f.hash));
    
    if (uniqueHashes.size === 1) {
      reasons.push('All frames identical (replay or photo)');
      return {
        score: 0.0,
        isStatic: true,
        variance: 0,
        temporalConsistency: 0.0,
        reasons,
      };
    }

    // Check for repeated patterns (replay loop)
    const hashSequence = frames.map(f => f.hash);
    const loopDetected = detectLoop(hashSequence);
    
    if (loopDetected) {
      reasons.push('Frame loop detected (replay attack)');
      return {
        score: 0.1,
        isStatic: true,
        variance: 0,
        temporalConsistency: 0.1,
        reasons,
      };
    }
  }

  // Method 2: Pixel variance (if pixel data provided)
  let variance = 0;
  let staticFrameCount = 0;

  if (frames.every(f => f.data && f.data.length > 0)) {
    for (let i = 1; i < frames.length; i++) {
      const prev = frames[i - 1].data!;
      const curr = frames[i].data!;

      // Compute mean squared difference
      let diff = 0;
      const len = Math.min(prev.length, curr.length);
      
      for (let j = 0; j < len; j++) {
        diff += Math.pow((prev as any)[j] - (curr as any)[j], 2);
      }

      const frameVariance = diff / len;
      variance += frameVariance;

      if (frameVariance < minVariance * 0.5) {
        staticFrameCount++;
      }
    }

    variance /= (frames.length - 1);

    if (variance < minVariance) {
      reasons.push(`Low pixel variance (${variance.toFixed(1)} < ${minVariance})`);
    }

    if (staticFrameCount > maxStaticFrames) {
      reasons.push(`Too many static frames (${staticFrameCount} > ${maxStaticFrames})`);
    }
  }

  // Method 3: Temporal consistency (motion should be smooth)
  const timestamps = frames.map(f => f.timestamp);
  const intervals: number[] = [];
  
  for (let i = 1; i < timestamps.length; i++) {
    intervals.push(timestamps[i] - timestamps[i - 1]);
  }

  const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  const intervalVariance = intervals.reduce((sum, val) => sum + Math.pow(val - avgInterval, 2), 0) / intervals.length;
  const temporalConsistency = Math.exp(-intervalVariance / 1000); // Higher = more consistent

  // Compute final score
  let score = 0.5; // Neutral baseline

  if (variance >= minVariance) {
    score += 0.3; // Good variance
  }

  if (staticFrameCount <= maxStaticFrames) {
    score += 0.1; // Not too static
  }

  score += temporalConsistency * 0.1;

  const isStatic = (variance < minVariance) || (staticFrameCount > maxStaticFrames);

  return {
    score: Math.max(0, Math.min(1, score)),
    isStatic,
    variance,
    temporalConsistency,
    reasons: reasons.length > 0 ? reasons : ['Frames appear live'],
  };
}

/**
 * Detect loop pattern in sequence
 * 
 * @param sequence Array of hashes or values
 * @returns True if loop detected
 */
function detectLoop(sequence: any[]): boolean {
  if (sequence.length < 4) return false;

  // Look for repeating subsequence
  for (let patternLen = 2; patternLen <= sequence.length / 2; patternLen++) {
    const pattern = sequence.slice(0, patternLen);
    let matches = 0;

    for (let i = patternLen; i + patternLen <= sequence.length; i += patternLen) {
      const segment = sequence.slice(i, i + patternLen);
      
      if (JSON.stringify(pattern) === JSON.stringify(segment)) {
        matches++;
      }
    }

    if (matches >= 2) {
      return true; // Pattern repeats at least twice
    }
  }

  return false;
}
