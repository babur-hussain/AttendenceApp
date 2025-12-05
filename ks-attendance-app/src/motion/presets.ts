/**
 * Animation Presets
 * 
 * Reusable animation configurations for common UI patterns.
 * Uses Reanimated-compatible timing functions.
 */

import { Easing } from 'react-native';

export const animationPresets = {
  // Fade animations
  fadeIn: {
    from: { opacity: 0 },
    to: { opacity: 1 },
    duration: 250,
    easing: Easing.out(Easing.ease),
  },
  
  fadeOut: {
    from: { opacity: 1 },
    to: { opacity: 0 },
    duration: 200,
    easing: Easing.in(Easing.ease),
  },
  
  fadeInUp: {
    from: { opacity: 0, translateY: 20 },
    to: { opacity: 1, translateY: 0 },
    duration: 350,
    easing: Easing.out(Easing.cubic),
  },
  
  fadeInDown: {
    from: { opacity: 0, translateY: -20 },
    to: { opacity: 1, translateY: 0 },
    duration: 350,
    easing: Easing.out(Easing.cubic),
  },
  
  // Scale animations
  scaleIn: {
    from: { scale: 0.8, opacity: 0 },
    to: { scale: 1, opacity: 1 },
    duration: 250,
    easing: Easing.out(Easing.back(1.2)),
  },
  
  scaleOnPress: {
    from: { scale: 1 },
    to: { scale: 0.95 },
    duration: 100,
    easing: Easing.inOut(Easing.ease),
  },
  
  // Slide animations
  slideInLeft: {
    from: { translateX: -100, opacity: 0 },
    to: { translateX: 0, opacity: 1 },
    duration: 300,
    easing: Easing.out(Easing.cubic),
  },
  
  slideInRight: {
    from: { translateX: 100, opacity: 0 },
    to: { translateX: 0, opacity: 1 },
    duration: 300,
    easing: Easing.out(Easing.cubic),
  },
  
  slideUp: {
    from: { translateY: 300, opacity: 0 },
    to: { translateY: 0, opacity: 1 },
    duration: 400,
    easing: Easing.out(Easing.cubic),
  },
  
  // Bounce animations
  bounceIn: {
    from: { scale: 0, opacity: 0 },
    to: { scale: 1, opacity: 1 },
    duration: 500,
    easing: Easing.bounce,
  },
  
  // Stagger children animation
  staggerChildren: {
    staggerDelay: 50, // ms between each child
    childAnimation: 'fadeInUp',
  },
  
  // Loading animations
  pulse: {
    from: { scale: 1, opacity: 1 },
    to: { scale: 1.05, opacity: 0.8 },
    duration: 800,
    loop: true,
    easing: Easing.inOut(Easing.ease),
  },
  
  spin: {
    from: { rotate: '0deg' },
    to: { rotate: '360deg' },
    duration: 1000,
    loop: true,
    easing: Easing.linear,
  },
  
  // Shake animation (for errors)
  shake: {
    keyframes: [
      { translateX: 0 },
      { translateX: -10 },
      { translateX: 10 },
      { translateX: -10 },
      { translateX: 10 },
      { translateX: 0 },
    ],
    duration: 400,
    easing: Easing.linear,
  },
} as const;

export type AnimationPreset = keyof typeof animationPresets;

/**
 * Get animation config by name
 */
export function getAnimationConfig(preset: AnimationPreset) {
  return animationPresets[preset];
}

/**
 * Spring animation configs (for natural motion)
 */
export const springConfigs = {
  gentle: {
    damping: 20,
    mass: 1,
    stiffness: 100,
  },
  
  bouncy: {
    damping: 8,
    mass: 1,
    stiffness: 120,
  },
  
  snappy: {
    damping: 30,
    mass: 1,
    stiffness: 200,
  },
  
  slow: {
    damping: 15,
    mass: 1.5,
    stiffness: 80,
  },
} as const;

export type SpringConfig = keyof typeof springConfigs;
