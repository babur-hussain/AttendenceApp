/**
 * ROC Report Generator
 * 
 * Generates Receiver Operating Characteristic (ROC) curves and statistics
 * for threshold tuning. Computes TPR (True Positive Rate), FPR (False Positive Rate),
 * accuracy, precision, recall, and F1 score at multiple threshold values.
 * 
 * USAGE:
 * 1. Collect test dataset with ground truth labels
 * 2. Run generateROCReport(dataset)
 * 3. Analyze statistics to choose optimal threshold
 * 4. Update PolicyConfig with chosen threshold
 * 
 * THRESHOLD SELECTION STRATEGIES:
 * - Max F1: Best balance of precision and recall
 * - Max Accuracy: Overall correctness
 * - Target FPR: Fix false positive rate (security-critical)
 * - Target TPR: Fix true positive rate (UX-critical)
 */

import { cosineSimilarity } from './faceMatcher';

/**
 * Test data point with ground truth
 */
export interface TestDataPoint {
  liveEmbedding: Float32Array;
  storedEmbedding: Float32Array;
  isGenuineMatch: boolean; // Ground truth
  employeeId?: string;
  metadata?: any;
}

/**
 * ROC statistics at a specific threshold
 */
export interface ROCPoint {
  threshold: number;
  
  // Confusion matrix
  truePositives: number;
  falsePositives: number;
  trueNegatives: number;
  falseNegatives: number;
  
  // Rates
  tpr: number; // True Positive Rate (Recall, Sensitivity)
  fpr: number; // False Positive Rate (1 - Specificity)
  tnr: number; // True Negative Rate (Specificity)
  fnr: number; // False Negative Rate
  
  // Metrics
  accuracy: number; // (TP + TN) / Total
  precision: number; // TP / (TP + FP)
  recall: number; // TP / (TP + FN)
  f1: number; // 2 * (Precision * Recall) / (Precision + Recall)
  
  // Additional
  total: number;
}

/**
 * Complete ROC report
 */
export interface ROCReport {
  points: ROCPoint[];
  
  // Optimal thresholds based on different criteria
  optimalByF1: ROCPoint;
  optimalByAccuracy: ROCPoint;
  optimalByBalancedAccuracy: ROCPoint; // (TPR + TNR) / 2
  
  // Statistics
  auc: number; // Area Under Curve
  
  // Dataset info
  totalSamples: number;
  genuineMatches: number;
  impostorMatches: number;
}

/**
 * Generate ROC report from test dataset
 * 
 * @param dataset Test data with ground truth labels
 * @param thresholds Array of thresholds to evaluate (default: 0.3 to 0.9 in 0.05 steps)
 * @returns Complete ROC report with statistics
 */
export function generateROCReport(
  dataset: TestDataPoint[],
  thresholds: number[] = generateDefaultThresholds()
): ROCReport {
  console.log(`[ROC] Generating report for ${dataset.length} samples at ${thresholds.length} thresholds...`);
  
  // Compute similarity scores for all pairs
  const scores = dataset.map((point) => ({
    score: cosineSimilarity(point.liveEmbedding, point.storedEmbedding, true),
    isGenuine: point.isGenuineMatch,
  }));
  
  // Compute ROC point for each threshold
  const points: ROCPoint[] = thresholds.map((threshold) =>
    computeROCPoint(scores, threshold)
  );
  
  // Find optimal thresholds
  const optimalByF1 = points.reduce((best, point) =>
    point.f1 > best.f1 ? point : best
  );
  
  const optimalByAccuracy = points.reduce((best, point) =>
    point.accuracy > best.accuracy ? point : best
  );
  
  const optimalByBalancedAccuracy = points.reduce((best, point) => {
    const balancedAcc = (point.tpr + point.tnr) / 2;
    const bestBalancedAcc = (best.tpr + best.tnr) / 2;
    return balancedAcc > bestBalancedAcc ? point : best;
  });
  
  // Compute AUC (Area Under Curve) using trapezoidal rule
  const auc = computeAUC(points);
  
  return {
    points,
    optimalByF1,
    optimalByAccuracy,
    optimalByBalancedAccuracy,
    auc,
    totalSamples: dataset.length,
    genuineMatches: scores.filter((s) => s.isGenuine).length,
    impostorMatches: scores.filter((s) => !s.isGenuine).length,
  };
}

/**
 * Compute ROC point at a specific threshold
 */
function computeROCPoint(
  scores: { score: number; isGenuine: boolean }[],
  threshold: number
): ROCPoint {
  let tp = 0, fp = 0, tn = 0, fn = 0;
  
  for (const { score, isGenuine } of scores) {
    const predicted = score >= threshold;
    
    if (predicted && isGenuine) {
      tp++;
    } else if (predicted && !isGenuine) {
      fp++;
    } else if (!predicted && !isGenuine) {
      tn++;
    } else {
      fn++;
    }
  }
  
  const total = tp + fp + tn + fn;
  
  // Rates
  const tpr = tp > 0 ? tp / (tp + fn) : 0; // Recall
  const fpr = fp > 0 ? fp / (fp + tn) : 0;
  const tnr = tn > 0 ? tn / (tn + fp) : 0; // Specificity
  const fnr = fn > 0 ? fn / (fn + tp) : 0;
  
  // Metrics
  const accuracy = (tp + tn) / total;
  const precision = tp > 0 ? tp / (tp + fp) : 0;
  const recall = tpr;
  const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
  
  return {
    threshold,
    truePositives: tp,
    falsePositives: fp,
    trueNegatives: tn,
    falseNegatives: fn,
    tpr,
    fpr,
    tnr,
    fnr,
    accuracy,
    precision,
    recall,
    f1,
    total,
  };
}

/**
 * Compute Area Under Curve using trapezoidal rule
 */
function computeAUC(points: ROCPoint[]): number {
  // Sort by FPR ascending
  const sorted = [...points].sort((a, b) => a.fpr - b.fpr);
  
  let auc = 0;
  
  for (let i = 1; i < sorted.length; i++) {
    const x1 = sorted[i - 1].fpr;
    const x2 = sorted[i].fpr;
    const y1 = sorted[i - 1].tpr;
    const y2 = sorted[i].tpr;
    
    // Trapezoidal area
    auc += (x2 - x1) * (y1 + y2) / 2;
  }
  
  return auc;
}

/**
 * Generate default threshold range
 */
function generateDefaultThresholds(): number[] {
  const thresholds: number[] = [];
  
  // 0.3 to 0.9 in 0.05 steps
  for (let t = 0.3; t <= 0.9; t += 0.05) {
    thresholds.push(parseFloat(t.toFixed(2)));
  }
  
  return thresholds;
}

/**
 * Format ROC report as human-readable string
 */
export function formatROCReport(report: ROCReport): string {
  const lines: string[] = [];
  
  lines.push('=== ROC ANALYSIS REPORT ===');
  lines.push('');
  lines.push(`Dataset: ${report.totalSamples} samples`);
  lines.push(`  Genuine matches: ${report.genuineMatches}`);
  lines.push(`  Impostor matches: ${report.impostorMatches}`);
  lines.push('');
  lines.push(`AUC (Area Under Curve): ${report.auc.toFixed(4)}`);
  lines.push('');
  
  lines.push('=== OPTIMAL THRESHOLDS ===');
  lines.push('');
  
  lines.push('Best F1 Score:');
  lines.push(formatROCPoint(report.optimalByF1));
  lines.push('');
  
  lines.push('Best Accuracy:');
  lines.push(formatROCPoint(report.optimalByAccuracy));
  lines.push('');
  
  lines.push('Best Balanced Accuracy:');
  lines.push(formatROCPoint(report.optimalByBalancedAccuracy));
  lines.push('');
  
  lines.push('=== ALL THRESHOLD POINTS ===');
  lines.push('');
  lines.push('Threshold | TPR    | FPR    | Accuracy | Precision | Recall | F1     ');
  lines.push('----------|--------|--------|----------|-----------|--------|--------');
  
  for (const point of report.points) {
    lines.push(
      `${point.threshold.toFixed(2).padEnd(9)} | ` +
      `${point.tpr.toFixed(4)} | ` +
      `${point.fpr.toFixed(4)} | ` +
      `${point.accuracy.toFixed(4).padEnd(8)} | ` +
      `${point.precision.toFixed(4).padEnd(9)} | ` +
      `${point.recall.toFixed(4)} | ` +
      `${point.f1.toFixed(4)}`
    );
  }
  
  return lines.join('\n');
}

/**
 * Format single ROC point
 */
function formatROCPoint(point: ROCPoint): string {
  return (
    `  Threshold: ${point.threshold.toFixed(2)}\n` +
    `  Accuracy: ${point.accuracy.toFixed(4)} (${(point.accuracy * 100).toFixed(2)}%)\n` +
    `  Precision: ${point.precision.toFixed(4)}\n` +
    `  Recall: ${point.recall.toFixed(4)}\n` +
    `  F1 Score: ${point.f1.toFixed(4)}\n` +
    `  TPR: ${point.tpr.toFixed(4)} | FPR: ${point.fpr.toFixed(4)}\n` +
    `  TP: ${point.truePositives} | FP: ${point.falsePositives} | TN: ${point.trueNegatives} | FN: ${point.falseNegatives}`
  );
}

/**
 * Create test dataset from genuine and impostor pairs
 * 
 * Helper for generating synthetic test data.
 */
export function createTestDataset(
  genuinePairs: { live: Float32Array; stored: Float32Array }[],
  impostorPairs: { live: Float32Array; stored: Float32Array }[]
): TestDataPoint[] {
  const dataset: TestDataPoint[] = [];
  
  // Add genuine matches
  for (const pair of genuinePairs) {
    dataset.push({
      liveEmbedding: pair.live,
      storedEmbedding: pair.stored,
      isGenuineMatch: true,
    });
  }
  
  // Add impostor matches
  for (const pair of impostorPairs) {
    dataset.push({
      liveEmbedding: pair.live,
      storedEmbedding: pair.stored,
      isGenuineMatch: false,
    });
  }
  
  return dataset;
}

/**
 * Generate mock test dataset for testing
 * 
 * Creates synthetic embeddings with controlled similarity.
 */
export function generateMockTestDataset(
  numGenuine: number = 100,
  numImpostor: number = 100,
  embeddingDim: number = 512
): TestDataPoint[] {
  const dataset: TestDataPoint[] = [];
  
  // Generate genuine pairs (high similarity)
  for (let i = 0; i < numGenuine; i++) {
    const base = createRandomEmbedding(embeddingDim);
    const variation = createSimilarEmbedding(base, 0.1); // 10% noise
    
    dataset.push({
      liveEmbedding: variation,
      storedEmbedding: base,
      isGenuineMatch: true,
      employeeId: `EMP_${i}`,
    });
  }
  
  // Generate impostor pairs (low similarity)
  for (let i = 0; i < numImpostor; i++) {
    const emb1 = createRandomEmbedding(embeddingDim);
    const emb2 = createRandomEmbedding(embeddingDim);
    
    dataset.push({
      liveEmbedding: emb1,
      storedEmbedding: emb2,
      isGenuineMatch: false,
      employeeId: `IMP_${i}`,
    });
  }
  
  return dataset;
}

/**
 * Create random embedding
 */
function createRandomEmbedding(dim: number): Float32Array {
  const embedding = new Float32Array(dim);
  
  for (let i = 0; i < dim; i++) {
    embedding[i] = (Math.random() - 0.5) * 2; // Range [-1, 1]
  }
  
  return embedding;
}

/**
 * Create similar embedding with controlled noise
 */
function createSimilarEmbedding(base: Float32Array, noiseLevel: number): Float32Array {
  const similar = new Float32Array(base.length);
  
  for (let i = 0; i < base.length; i++) {
    const noise = (Math.random() - 0.5) * 2 * noiseLevel;
    similar[i] = base[i] + noise;
  }
  
  return similar;
}

/**
 * Export ROC report to CSV format
 */
export function exportROCToCSV(report: ROCReport): string {
  const lines: string[] = [];
  
  // Header
  lines.push('threshold,tpr,fpr,tnr,fnr,accuracy,precision,recall,f1,tp,fp,tn,fn');
  
  // Data rows
  for (const point of report.points) {
    lines.push(
      `${point.threshold},${point.tpr},${point.fpr},${point.tnr},${point.fnr},` +
      `${point.accuracy},${point.precision},${point.recall},${point.f1},` +
      `${point.truePositives},${point.falsePositives},${point.trueNegatives},${point.falseNegatives}`
    );
  }
  
  return lines.join('\n');
}

/**
 * Find threshold that achieves target FPR
 * 
 * Useful for security-critical applications where false
 * positives must be minimized.
 */
export function findThresholdForTargetFPR(
  report: ROCReport,
  targetFPR: number
): ROCPoint | null {
  // Sort by FPR ascending
  const sorted = [...report.points].sort((a, b) => a.fpr - b.fpr);
  
  // Find first point with FPR <= target
  return sorted.find((p) => p.fpr <= targetFPR) || null;
}

/**
 * Find threshold that achieves target TPR
 * 
 * Useful for UX-critical applications where false
 * negatives must be minimized.
 */
export function findThresholdForTargetTPR(
  report: ROCReport,
  targetTPR: number
): ROCPoint | null {
  // Sort by TPR descending
  const sorted = [...report.points].sort((a, b) => b.tpr - a.tpr);
  
  // Find first point with TPR >= target
  return sorted.find((p) => p.tpr >= targetTPR) || null;
}
