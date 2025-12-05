/**
 * Animated Pressable Component
 * 
 * Touchable component with press animations (scale effect).
 */

import React, { useRef } from 'react';
import {
  Pressable,
  Animated,
  PressableProps,
  ViewStyle,
} from 'react-native';
import { useReducedMotion } from './useReducedMotion';

interface AnimatedPressableProps extends PressableProps {
  /** Scale amount on press (default: 0.95) */
  scaleOnPress?: number;
  
  /** Animation duration (default: 100ms) */
  duration?: number;
  
  /** Children */
  children: React.ReactNode;
  
  /** Custom style */
  style?: ViewStyle;
}

export function AnimatedPressable({
  scaleOnPress = 0.95,
  duration = 100,
  children,
  style,
  ...pressableProps
}: AnimatedPressableProps) {
  const reducedMotion = useReducedMotion();
  const scale = useRef(new Animated.Value(1)).current;
  
  const handlePressIn = () => {
    if (reducedMotion) return;
    
    Animated.spring(scale, {
      toValue: scaleOnPress,
      useNativeDriver: true,
      speed: 50,
      bounciness: 0,
    }).start();
  };
  
  const handlePressOut = () => {
    if (reducedMotion) return;
    
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 0,
    }).start();
  };
  
  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      {...pressableProps}
    >
      <Animated.View
        style={[
          style,
          reducedMotion ? {} : { transform: [{ scale }] },
        ]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}
