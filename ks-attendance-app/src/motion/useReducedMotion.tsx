/**
 * Reduced Motion Hook
 * 
 * Respects user's device accessibility settings for reduced motion.
 * When enabled, animations should be disabled or simplified.
 */

import React from 'react';
import { useState, useEffect } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * Hook to check if user prefers reduced motion
 * 
 * @returns true if reduced motion is preferred
 * 
 * @example
 * const reducedMotion = useReducedMotion();
 * 
 * if (!reducedMotion) {
 *   // Run animations
 * }
 */
export function useReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = useState(false);
  
  useEffect(() => {
    // Check initial state
    AccessibilityInfo.isReduceMotionEnabled().then(enabled => {
      setReducedMotion(enabled);
    });
    
    // Listen for changes
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReducedMotion
    );
    
    return () => {
      subscription?.remove();
    };
  }, []);
  
  return reducedMotion;
}

/**
 * Higher-order component to disable animations when reduced motion is enabled
 * 
 * @example
 * const MyAnimatedComponent = withReducedMotion(({ animate }) => {
 *   if (animate) {
 *     return React.createElement(AnimatedView, { animation: "fadeIn" }, ...);
 *   }
 *   return React.createElement(View, null, ...);
 * });
 */
export function withReducedMotion<P extends object>(
  Component: React.ComponentType<P & { animate: boolean }>
) {
  return (props: P) => {
    const reducedMotion = useReducedMotion();
    return React.createElement(Component, { ...props, animate: !reducedMotion } as any);
  };
}
