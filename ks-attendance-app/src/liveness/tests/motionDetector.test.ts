/**
 * Motion Detector Tests
 * 
 * Tests for blink, head turn, mouth movement, and stability detectors.
 */

import { describe, it, expect } from '@jest/globals';
import {
  computeEAR,
  blinkDetector,
  estimateYaw,
  headTurnDetector,
  computeMAR,
  mouthMovementDetector,
  frameStabilityChecker,
  type Point3D,
  type FaceLandmarks,
} from '../motionDetector';

/**
 * Generate synthetic eye landmarks
 */
function generateEyeLandmarks(openRatio: number): Point3D[] {
  const height = 0.3 * openRatio;
  const width = 0.4;

  return [
    { x: 0, y: 0, z: 0 },        // p1 (left corner)
    { x: width * 0.25, y: -height, z: 0 }, // p2 (top-left)
    { x: width * 0.75, y: -height, z: 0 }, // p3 (top-right)
    { x: width, y: 0, z: 0 },    // p4 (right corner)
    { x: width * 0.75, y: height, z: 0 },  // p5 (bottom-right)
    { x: width * 0.25, y: height, z: 0 },  // p6 (bottom-left)
  ];
}

/**
 * Generate synthetic landmarks with yaw
 */
function generateLandmarksWithYaw(yaw: number): FaceLandmarks {
  const noseX = 0.5 + Math.sin(yaw * Math.PI / 180) * 0.2;
  const leftEyeX = 0.3 - Math.sin(yaw * Math.PI / 180) * 0.1;
  const rightEyeX = 0.7 - Math.sin(yaw * Math.PI / 180) * 0.1;

  return {
    leftEye: [{ x: leftEyeX, y: 0.4, z: 0 }],
    rightEye: [{ x: rightEyeX, y: 0.4, z: 0 }],
    nose: [{ x: noseX, y: 0.6, z: 0 }],
    mouth: [{ x: 0.5, y: 0.8, z: 0 }],
    timestamp: Date.now(),
  };
}

/**
 * Generate mouth landmarks
 */
function generateMouthLandmarks(openRatio: number): Point3D[] {
  const height = 0.2 * openRatio;
  const width = 0.3;

  return [
    { x: 0, y: 0, z: 0 },                          // Left corner
    { x: width * 0.25, y: -height * 0.5, z: 0 },   // Top-left
    { x: width * 0.5, y: -height, z: 0 },          // Top-center
    { x: width * 0.75, y: -height * 0.5, z: 0 },   // Top-right
    { x: width, y: 0, z: 0 },                      // Right corner
    { x: width * 0.75, y: height * 0.5, z: 0 },    // Bottom-right
    { x: width * 0.5, y: height, z: 0 },           // Bottom-center
    { x: width * 0.25, y: height * 0.5, z: 0 },    // Bottom-left
  ];
}

describe('Motion Detector', () => {
  describe('computeEAR', () => {
    it('should compute correct EAR for open eye', () => {
      const eyePoints = generateEyeLandmarks(1.0); // Fully open
      const ear = computeEAR(eyePoints);
      
      expect(ear).toBeGreaterThan(0.25);
      expect(ear).toBeLessThan(0.35);
    });

    it('should compute correct EAR for closed eye', () => {
      const eyePoints = generateEyeLandmarks(0.5); // Half open
      const ear = computeEAR(eyePoints);
      
      expect(ear).toBeGreaterThan(0.15);
      expect(ear).toBeLessThan(0.25);
    });

    it('should handle zero height', () => {
      const eyePoints = generateEyeLandmarks(0); // Closed
      const ear = computeEAR(eyePoints);
      
      expect(ear).toBe(0);
    });
  });

  describe('blinkDetector', () => {
    it('should detect two clear blinks', () => {
      const sequence: FaceLandmarks[] = [];
      const baseTime = Date.now();

      // Open → Close → Open → Close → Open
      const earValues = [0.3, 0.3, 0.18, 0.3, 0.3, 0.18, 0.3, 0.3];

      for (let i = 0; i < earValues.length; i++) {
        const eyePoints = generateEyeLandmarks(earValues[i] / 0.3);
        sequence.push({
          leftEye: eyePoints,
          rightEye: eyePoints,
          nose: [{ x: 0.5, y: 0.6, z: 0 }],
          mouth: [{ x: 0.5, y: 0.8, z: 0 }],
          timestamp: baseTime + i * 100,
        });
      }

      const result = blinkDetector(sequence);

      expect(result.blinkCount).toBeGreaterThanOrEqual(1);
      expect(result.score).toBeGreaterThan(0.5);
    });

    it('should return low score for no blinks', () => {
      const sequence: FaceLandmarks[] = [];
      const baseTime = Date.now();

      // Eyes always open
      for (let i = 0; i < 10; i++) {
        const eyePoints = generateEyeLandmarks(1.0);
        sequence.push({
          leftEye: eyePoints,
          rightEye: eyePoints,
          nose: [{ x: 0.5, y: 0.6, z: 0 }],
          mouth: [{ x: 0.5, y: 0.8, z: 0 }],
          timestamp: baseTime + i * 100,
        });
      }

      const result = blinkDetector(sequence);

      expect(result.blinkCount).toBe(0);
      expect(result.score).toBeLessThan(0.3);
    });

    it('should reject too-fast blinks', () => {
      const sequence: FaceLandmarks[] = [];
      const baseTime = Date.now();

      // Very fast blink (< 100ms)
      const earValues = [0.3, 0.18, 0.3, 0.3];

      for (let i = 0; i < earValues.length; i++) {
        const eyePoints = generateEyeLandmarks(earValues[i] / 0.3);
        sequence.push({
          leftEye: eyePoints,
          rightEye: eyePoints,
          nose: [{ x: 0.5, y: 0.6, z: 0 }],
          mouth: [{ x: 0.5, y: 0.8, z: 0 }],
          timestamp: baseTime + i * 30, // Only 30ms intervals
        });
      }

      const result = blinkDetector(sequence);

      // Should not count the too-fast blink
      expect(result.blinkCount).toBe(0);
    });
  });

  describe('estimateYaw', () => {
    it('should estimate near-zero yaw for frontal face', () => {
      const landmarks = generateLandmarksWithYaw(0);
      const yaw = estimateYaw(landmarks);
      
      expect(Math.abs(yaw)).toBeLessThan(10);
    });

    it('should estimate positive yaw for right turn', () => {
      const landmarks = generateLandmarksWithYaw(30);
      const yaw = estimateYaw(landmarks);
      
      expect(yaw).toBeGreaterThan(10);
    });

    it('should estimate negative yaw for left turn', () => {
      const landmarks = generateLandmarksWithYaw(-30);
      const yaw = estimateYaw(landmarks);
      
      expect(yaw).toBeLessThan(-10);
    });
  });

  describe('headTurnDetector', () => {
    it('should detect left and right turns', () => {
      const sequence: FaceLandmarks[] = [];

      // Start frontal, turn left, return center, turn right, return center
      const yawSequence = [0, 5, 10, 20, 25, 20, 10, 5, 0, -5, -10, -20, -25, -20, -10, -5, 0];

      for (const yaw of yawSequence) {
        sequence.push(generateLandmarksWithYaw(yaw));
      }

      const result = headTurnDetector(sequence);

      expect(result.turnCount).toBeGreaterThanOrEqual(2);
      expect(result.score).toBeGreaterThan(0.5);
    });

    it('should return low score for no turns', () => {
      const sequence: FaceLandmarks[] = [];

      // Face stays frontal
      for (let i = 0; i < 20; i++) {
        sequence.push(generateLandmarksWithYaw(0));
      }

      const result = headTurnDetector(sequence);

      expect(result.turnCount).toBe(0);
      expect(result.score).toBeLessThan(0.3);
    });
  });

  describe('computeMAR', () => {
    it('should compute correct MAR for open mouth', () => {
      const mouthPoints = generateMouthLandmarks(1.5); // Wide open
      const mar = computeMAR(mouthPoints);
      
      expect(mar).toBeGreaterThan(0.3);
    });

    it('should compute correct MAR for closed mouth', () => {
      const mouthPoints = generateMouthLandmarks(0.5); // Slightly open
      const mar = computeMAR(mouthPoints);
      
      expect(mar).toBeLessThan(0.3);
    });
  });

  describe('mouthMovementDetector', () => {
    it('should detect mouth opening', () => {
      const sequence: FaceLandmarks[] = [];
      const baseTime = Date.now();

      // Closed → Open → Closed
      const marValues = [0.15, 0.15, 0.4, 0.45, 0.4, 0.15, 0.15];

      for (let i = 0; i < marValues.length; i++) {
        const mouthPoints = generateMouthLandmarks(marValues[i] / 0.3);
        sequence.push({
          leftEye: [{ x: 0.3, y: 0.4, z: 0 }],
          rightEye: [{ x: 0.7, y: 0.4, z: 0 }],
          nose: [{ x: 0.5, y: 0.6, z: 0 }],
          mouth: mouthPoints,
          timestamp: baseTime + i * 200,
        });
      }

      const result = mouthMovementDetector(sequence);

      expect(result.movementCount).toBeGreaterThanOrEqual(1);
      expect(result.score).toBeGreaterThan(0.5);
    });

    it('should return neutral score for no movement (optional)', () => {
      const sequence: FaceLandmarks[] = [];
      const baseTime = Date.now();

      // Mouth stays closed
      for (let i = 0; i < 10; i++) {
        const mouthPoints = generateMouthLandmarks(0.5);
        sequence.push({
          leftEye: [{ x: 0.3, y: 0.4, z: 0 }],
          rightEye: [{ x: 0.7, y: 0.4, z: 0 }],
          nose: [{ x: 0.5, y: 0.6, z: 0 }],
          mouth: mouthPoints,
          timestamp: baseTime + i * 200,
        });
      }

      const result = mouthMovementDetector(sequence);

      expect(result.movementCount).toBe(0);
      expect(result.score).toBe(0.5); // Neutral score
    });
  });

  describe('frameStabilityChecker', () => {
    it('should detect static frames', () => {
      const frames: ImageData[] = [];

      // Create 5 identical frames
      const data = new Uint8ClampedArray(100 * 100 * 4).fill(128);
      
      for (let i = 0; i < 5; i++) {
        frames.push({
          data,
          width: 100,
          height: 100,
          colorSpace: 'srgb',
        });
      }

      const result = frameStabilityChecker(
        frames.map((f, i) => ({ data: f.data, width: f.width, height: f.height, timestamp: Date.now() + i * 100 })),
        { minVariance: 100, maxStaticFrames: 3 }
      );

      expect(result.isStatic).toBe(true);
      expect(result.score).toBeLessThan(0.3);
    });

    it('should accept normal variance', () => {
      const frames: ImageData[] = [];

      // Create frames with slight variance
      for (let i = 0; i < 10; i++) {
        const data = new Uint8ClampedArray(100 * 100 * 4);
        
        for (let j = 0; j < data.length; j++) {
          data[j] = 128 + Math.random() * 40 - 20; // Random noise
        }

        frames.push({
          data,
          width: 100,
          height: 100,
          colorSpace: 'srgb',
        });
      }

      const result = frameStabilityChecker(
        frames.map((f, i) => ({ data: f.data, width: f.width, height: f.height, timestamp: Date.now() + i * 100 })),
        { minVariance: 100, maxStaticFrames: 3 }
      );

      expect(result.isStatic).toBe(false);
      expect(result.score).toBeGreaterThan(0.5);
    });
  });
});
