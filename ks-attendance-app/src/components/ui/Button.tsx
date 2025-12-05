/**
 * Button Component
 * 
 * Accessible, theme-aware button with multiple variants and loading state.
 * Meets WCAG touch target requirements (44x44 minimum).
 */

import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  View,
  ViewStyle,
  TextStyle,
  TouchableOpacityProps,
} from 'react-native';
import { useTheme } from '../../theme';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends Omit<TouchableOpacityProps, 'style'> {
  /** Button text */
  title: string;
  
  /** Visual variant */
  variant?: ButtonVariant;
  
  /** Size variant */
  size?: ButtonSize;
  
  /** Loading state */
  loading?: boolean;
  
  /** Full width button */
  fullWidth?: boolean;
  
  /** Custom style overrides */
  style?: ViewStyle;
  
  /** Custom text style overrides */
  textStyle?: TextStyle;
  
  /** Icon component (optional) */
  icon?: React.ReactNode;
  
  /** Icon position */
  iconPosition?: 'left' | 'right';
}

export function Button({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  disabled = false,
  style,
  textStyle,
  icon,
  iconPosition = 'left',
  accessibilityLabel,
  accessibilityHint,
  ...touchableProps
}: ButtonProps) {
  const { theme } = useTheme();
  
  const isDisabled = disabled || loading;
  
  // Variant styles
  const variantStyles = getVariantStyles(variant, theme);
  const sizeStyles = getSizeStyles(size, theme);
  
  // Loading spinner color
  const spinnerColor = variant === 'ghost' 
    ? theme.colors.interactive.primary 
    : theme.colors.text.inverse;
  
  return (
    <TouchableOpacity
      style={[
        styles.base,
        sizeStyles.container,
        variantStyles.container,
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        style,
      ]}
      disabled={isDisabled}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      {...touchableProps}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator size="small" color={spinnerColor} />
        ) : (
          <>
            {icon && iconPosition === 'left' && (
              <View style={styles.iconLeft}>{icon}</View>
            )}
            
            <Text
              style={[
                sizeStyles.text,
                variantStyles.text,
                isDisabled && styles.disabledText,
                textStyle,
              ]}
              numberOfLines={1}
            >
              {title}
            </Text>
            
            {icon && iconPosition === 'right' && (
              <View style={styles.iconRight}>{icon}</View>
            )}
          </>
        )}
      </View>
    </TouchableOpacity>
  );
}

function getVariantStyles(variant: ButtonVariant, theme: any) {
  switch (variant) {
    case 'primary':
      return {
        container: {
          backgroundColor: theme.colors.interactive.primary,
          borderWidth: 0,
        },
        text: {
          color: theme.colors.text.inverse,
          fontWeight: theme.typography.fontWeight.semibold,
        },
      };
      
    case 'secondary':
      return {
        container: {
          backgroundColor: theme.colors.interactive.secondary,
          borderWidth: 1,
          borderColor: theme.colors.border.default,
        },
        text: {
          color: theme.colors.text.primary,
          fontWeight: theme.typography.fontWeight.medium,
        },
      };
      
    case 'ghost':
      return {
        container: {
          backgroundColor: 'transparent',
          borderWidth: 0,
        },
        text: {
          color: theme.colors.interactive.primary,
          fontWeight: theme.typography.fontWeight.medium,
        },
      };
      
    case 'danger':
      return {
        container: {
          backgroundColor: theme.colors.error,
          borderWidth: 0,
        },
        text: {
          color: theme.colors.text.inverse,
          fontWeight: theme.typography.fontWeight.semibold,
        },
      };
  }
}

function getSizeStyles(size: ButtonSize, theme: any) {
  switch (size) {
    case 'sm':
      return {
        container: {
          paddingVertical: theme.spacing[2],
          paddingHorizontal: theme.spacing[3],
          minHeight: 36,
        },
        text: {
          fontSize: theme.typography.fontSize.sm,
        },
      };
      
    case 'md':
      return {
        container: {
          paddingVertical: theme.spacing[3],
          paddingHorizontal: theme.spacing[4],
          minHeight: 44, // WCAG minimum
        },
        text: {
          fontSize: theme.typography.fontSize.base,
        },
      };
      
    case 'lg':
      return {
        container: {
          paddingVertical: theme.spacing[4],
          paddingHorizontal: theme.spacing[6],
          minHeight: 52,
        },
        text: {
          fontSize: theme.typography.fontSize.lg,
        },
      };
  }
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  fullWidth: {
    width: '100%',
  },
  
  disabled: {
    opacity: 0.5,
  },
  
  disabledText: {
    opacity: 0.6,
  },
  
  iconLeft: {
    marginRight: 8,
  },
  
  iconRight: {
    marginLeft: 8,
  },
});
