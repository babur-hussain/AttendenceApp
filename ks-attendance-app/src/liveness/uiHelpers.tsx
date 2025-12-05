/**
 * Liveness UI Helpers
 * 
 * React Native components for guided liveness flows.
 * Provides visual feedback, animations, and accessibility.
 */

import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import * as Haptics from 'expo-haptics';

/**
 * Liveness action types
 */
export type LivenessAction = 
  | 'idle'
  | 'blink'
  | 'turn_left'
  | 'turn_right'
  | 'smile'
  | 'complete';

/**
 * Liveness prompt overlay props
 */
export interface LivenessPromptOverlayProps {
  currentAction: LivenessAction;
  progress: number;              // Overall progress (0-1)
  onComplete?: () => void;
}

/**
 * Liveness prompt overlay component
 * 
 * Shows animated instructions for each liveness action.
 */
export const LivenessPromptOverlay: React.FC<LivenessPromptOverlayProps> = ({
  currentAction,
  progress,
  onComplete,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    // Animate in
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // Haptic feedback
    if (currentAction !== 'idle' && currentAction !== 'complete') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    if (currentAction === 'complete') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onComplete?.();
    }
  }, [currentAction]);

  const getPromptText = (): string => {
    switch (currentAction) {
      case 'blink':
        return 'Please blink twice';
      case 'turn_left':
        return 'Turn your head left';
      case 'turn_right':
        return 'Turn your head right';
      case 'smile':
        return 'Smile or open your mouth';
      case 'complete':
        return 'Verification complete!';
      case 'idle':
      default:
        return 'Position your face in the frame';
    }
  };

  const getPromptIcon = (): string => {
    switch (currentAction) {
      case 'blink':
        return '👁️';
      case 'turn_left':
        return '⬅️';
      case 'turn_right':
        return '➡️';
      case 'smile':
        return '😊';
      case 'complete':
        return '✅';
      case 'idle':
      default:
        return '📷';
    }
  };

  return (
    <Animated.View
      style={[
        styles.overlayContainer,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
      accessibilityLabel={getPromptText()}
      accessibilityRole="text"
    >
      <Text style={styles.promptIcon}>{getPromptIcon()}</Text>
      <Text style={styles.promptText}>{getPromptText()}</Text>
      
      {/* Progress bar */}
      <View style={styles.progressBarContainer}>
        <View
          style={[
            styles.progressBarFill,
            { width: `${progress * 100}%` },
          ]}
        />
      </View>
    </Animated.View>
  );
};

/**
 * Liveness progress ring props
 */
export interface LivenessProgressRingProps {
  score: number;                 // Current L1 score (0-1)
  size?: number;                 // Ring size in pixels
  strokeWidth?: number;          // Ring stroke width
  showScore?: boolean;           // Show numeric score
}

/**
 * Liveness progress ring component
 * 
 * Circular progress indicator with color-coded feedback.
 */
export const LivenessProgressRing: React.FC<LivenessProgressRingProps> = ({
  score,
  size = 120,
  strokeWidth = 12,
  showScore = true,
}) => {
  const progressAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Animate progress
    Animated.timing(progressAnim, {
      toValue: score,
      duration: 500,
      useNativeDriver: false,
    }).start();

    // Pulse animation when score changes
    Animated.sequence([
      Animated.timing(pulseAnim, {
        toValue: 1.1,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  }, [score]);

  const getColor = (): string => {
    if (score < 0.5) return '#FF3B30'; // Red
    if (score < 0.7) return '#FF9500'; // Orange
    return '#34C759'; // Green
  };

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <View style={[styles.ringContainer, { width: size, height: size }]}>
      <Animated.View
        style={{
          transform: [{ scale: pulseAnim }],
        }}
      >
        <svg width={size} height={size}>
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#E5E5EA"
            strokeWidth={strokeWidth}
            fill="none"
          />
          
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={getColor()}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - score)}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </svg>
      </Animated.View>

      {showScore && (
        <Text style={[styles.scoreText, { color: getColor() }]}>
          {Math.round(score * 100)}%
        </Text>
      )}
    </View>
  );
};

/**
 * Liveness hint props
 */
export interface LivenessHintProps {
  reasons: string[];             // Reasons from decision
  visible: boolean;
}

/**
 * Liveness hint component
 * 
 * Contextual tips based on failing components.
 */
export const LivenessHint: React.FC<LivenessHintProps> = ({ reasons, visible }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: visible ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [visible]);

  const getHintText = (reason: string): string => {
    switch (reason) {
      case 'low_motion':
        return '💡 Try blinking more naturally';
      case 'insufficient_blinks':
        return '💡 Please blink twice slowly';
      case 'insufficient_head_turns':
        return '💡 Turn your head more clearly';
      case 'low_ml':
        return '💡 Hold still and face the camera directly';
      case 'low_quality':
        return '💡 Move to a brighter area';
      case 'possible_replay':
        return '💡 Make sure you\'re using a live camera';
      case 'device_trust_low':
        return '💡 Device verification issue';
      case 'overall_score_low':
        return '💡 Try again with clearer movements';
      default:
        return `💡 ${reason.replace(/_/g, ' ')}`;
    }
  };

  if (!visible || reasons.length === 0) {
    return null;
  }

  return (
    <Animated.View style={[styles.hintContainer, { opacity: fadeAnim }]}>
      {reasons.slice(0, 3).map((reason, index) => (
        <Text key={index} style={styles.hintText}>
          {getHintText(reason)}
        </Text>
      ))}
    </Animated.View>
  );
};

/**
 * Liveness guidance state
 */
export interface LivenessGuidanceState {
  currentPrompt: LivenessAction;
  progress: number;
  isComplete: boolean;
  hints: string[];
}

/**
 * Use liveness guidance hook
 * 
 * State machine for guided liveness flow.
 * 
 * @param policy Liveness policy
 * @returns Guidance state and event handler
 */
export function useLivenessGuidance(policy?: {
  requireBlink?: boolean;
  requireHeadTurn?: boolean;
  requireMouthMovement?: boolean;
}): {
  state: LivenessGuidanceState;
  onEvent: (event: 'blink' | 'turn_left' | 'turn_right' | 'smile') => void;
  reset: () => void;
} {
  const [state, setState] = useState<LivenessGuidanceState>({
    currentPrompt: 'idle',
    progress: 0,
    isComplete: false,
    hints: [],
  });

  const [completedActions, setCompletedActions] = useState<Set<LivenessAction>>(new Set());

  const requiredActions: LivenessAction[] = [];
  if (policy?.requireBlink !== false) requiredActions.push('blink');
  if (policy?.requireHeadTurn !== false) requiredActions.push('turn_left', 'turn_right');
  if (policy?.requireMouthMovement) requiredActions.push('smile');

  const onEvent = (event: 'blink' | 'turn_left' | 'turn_right' | 'smile') => {
    setCompletedActions(prev => new Set(prev).add(event));

    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Update progress
    const newCompleted = new Set(completedActions);
    newCompleted.add(event);

    const progress = newCompleted.size / requiredActions.length;

    // Determine next prompt
    let nextPrompt: LivenessAction = 'idle';

    if (policy?.requireBlink !== false && !newCompleted.has('blink')) {
      nextPrompt = 'blink';
    } else if (policy?.requireHeadTurn !== false) {
      if (!newCompleted.has('turn_left')) {
        nextPrompt = 'turn_left';
      } else if (!newCompleted.has('turn_right')) {
        nextPrompt = 'turn_right';
      }
    } else if (policy?.requireMouthMovement && !newCompleted.has('smile')) {
      nextPrompt = 'smile';
    }

    const isComplete = newCompleted.size >= requiredActions.length;

    setState({
      currentPrompt: isComplete ? 'complete' : nextPrompt,
      progress,
      isComplete,
      hints: [],
    });
  };

  const reset = () => {
    setCompletedActions(new Set());
    setState({
      currentPrompt: 'idle',
      progress: 0,
      isComplete: false,
      hints: [],
    });
  };

  // Initialize prompt
  useEffect(() => {
    if (state.currentPrompt === 'idle' && requiredActions.length > 0) {
      setState(prev => ({ ...prev, currentPrompt: requiredActions[0] }));
    }
  }, []);

  return { state, onEvent, reset };
}

const styles = StyleSheet.create({
  overlayContainer: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    marginHorizontal: 20,
    borderRadius: 16,
  },
  promptIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  promptText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 16,
  },
  progressBarContainer: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#34C759',
    borderRadius: 2,
  },
  ringContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  scoreText: {
    position: 'absolute',
    fontSize: 24,
    fontWeight: '700',
  },
  hintContainer: {
    position: 'absolute',
    bottom: 80,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    borderRadius: 12,
    padding: 16,
  },
  hintText: {
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 8,
    lineHeight: 22,
  },
});
