/**
 * IconButton Component
 * 
 * Accessible icon-only button with WCAG touch target requirements.
 */

import React from 'react';
import {
  TouchableOpacity,
  View,
  StyleSheet,
  ViewStyle,
  TouchableOpacityProps,
} from 'react-native';
import { useTheme } from '../../theme';

type IconButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type IconButtonSize = 'sm' | 'md' | 'lg';

interface IconButtonProps extends Omit<TouchableOpacityProps, 'style'> {
  /** Icon component */
  icon: React.ReactNode;
  
  /** Visual variant */
  variant?: IconButtonVariant;
  
  /** Size variant */
  size?: IconButtonSize;
  
  /** Custom style */
  style?: ViewStyle;
  
  /** Required: Accessibility label */
  accessibilityLabel: string;
}

export function IconButton({
  icon,
  variant = 'secondary',
  size = 'md',
  disabled = false,
  style,
  accessibilityLabel,
  accessibilityHint,
  ...touchableProps
}: IconButtonProps) {
  const { theme } = useTheme();
  
  const variantStyle = getVariantStyle(variant, theme);
  const sizeStyle = getSizeStyle(size);
  
  return (
    <TouchableOpacity
      style={[
        styles.button,
        sizeStyle,
        variantStyle,
        disabled && styles.disabled,
        style,
      ]}
      disabled={disabled}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      {...touchableProps}
    >
      <View style={styles.iconContainer}>{icon}</View>
    </TouchableOpacity>
  );
}

function getVariantStyle(variant: IconButtonVariant, theme: any) {
  switch (variant) {
    case 'primary':
      return {
        backgroundColor: theme.colors.interactive.primary,
      };
    case 'secondary':
      return {
        backgroundColor: theme.colors.interactive.secondary,
        borderWidth: 1,
        borderColor: theme.colors.border.default,
      };
    case 'ghost':
      return {
        backgroundColor: 'transparent',
      };
    case 'danger':
      return {
        backgroundColor: theme.colors.error,
      };
  }
}

function getSizeStyle(size: IconButtonSize): ViewStyle {
  switch (size) {
    case 'sm':
      return { width: 36, height: 36 };
    case 'md':
      return { width: 44, height: 44 }; // WCAG minimum
    case 'lg':
      return { width: 52, height: 52 };
  }
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  disabled: {
    opacity: 0.5,
  },
});
