/**
 * Motion System Barrel Export
 * 
 * Centralized exports for animation utilities.
 */

export { animationPresets, springConfigs, getAnimationConfig } from './presets';
export type { AnimationPreset, SpringConfig } from './presets';

export { AnimatedView } from './AnimatedView';
export { AnimatedPressable } from './AnimatedPressable';
export { useReducedMotion, withReducedMotion } from './useReducedMotion';
