/**
 * Animated View Component
 * 
 * Simple animated container with preset animations.
 * Uses React Native Animated API (Reanimated can be added later).
 */

import React, { useEffect, useRef } from 'react';
import { Animated, ViewProps, ViewStyle } from 'react-native';
import { AnimationPreset, getAnimationConfig } from './presets';
import { useReducedMotion } from './useReducedMotion';

interface AnimatedViewProps extends ViewProps {
  /** Animation preset to apply */
  animation?: AnimationPreset;
  
  /** Animation delay (ms) */
  delay?: number;
  
  /** Custom duration override */
  duration?: number;
  
  /** Loop animation */
  loop?: boolean;
  
  /** Children */
  children: React.ReactNode;
  
  /** Custom style */
  style?: ViewStyle;
}

export function AnimatedView({
  animation = 'fadeIn',
  delay = 0,
  duration,
  loop = false,
  children,
  style,
  ...viewProps
}: AnimatedViewProps) {
  const reducedMotion = useReducedMotion();
  const animatedValues = useRef<{ [key: string]: Animated.Value }>({});
  
  // Get animation config
  const config = getAnimationConfig(animation);
  const animDuration = duration || ('duration' in config ? config.duration : 250);
  
  // Initialize animated values
  useEffect(() => {
    if (reducedMotion) return;
    
    // Create animated values for each property in 'from'
    if ('from' in config) {
      Object.keys(config.from).forEach(key => {
        if (!animatedValues.current[key]) {
          animatedValues.current[key] = new Animated.Value(
            (config.from as any)[key]
          );
        }
      });
      
      // Start animation
      const animations = Object.keys(config.from).map(key => {
        return Animated.timing(animatedValues.current[key], {
          toValue: (config.to as any)[key],
          duration: animDuration,
          delay,
          useNativeDriver: true,
          easing: config.easing,
        });
      });
      
      if (loop) {
        Animated.loop(Animated.sequence(animations)).start();
      } else {
        Animated.parallel(animations).start();
      }
    }
  }, [animation, delay, animDuration, loop, reducedMotion]);
  
  // Build animated style
  const animatedStyle: any = {};
  if (!reducedMotion && 'from' in config) {
    Object.keys(config.from).forEach(key => {
      if (animatedValues.current[key]) {
        animatedStyle[key] = animatedValues.current[key];
      }
    });
  }
  
  return (
    <Animated.View style={[style, animatedStyle]} {...viewProps}>
      {children}
    </Animated.View>
  );
}
