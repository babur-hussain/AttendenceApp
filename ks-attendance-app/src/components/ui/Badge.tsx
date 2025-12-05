/**
 * Badge Component
 * 
 * Small status indicator with theme-aware colors.
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '../../theme';

type BadgeVariant = 'success' | 'error' | 'warning' | 'info' | 'neutral';
type BadgeSize = 'sm' | 'md' | 'lg';

interface BadgeProps {
  /** Badge label */
  label: string;
  
  /** Visual variant */
  variant?: BadgeVariant;
  
  /** Size variant */
  size?: BadgeSize;
  
  /** Custom style */
  style?: ViewStyle;
  
  /** Custom text style */
  textStyle?: TextStyle;
  
  /** Dot indicator (no label) */
  dot?: boolean;
}

export function Badge({
  label,
  variant = 'neutral',
  size = 'md',
  style,
  textStyle,
  dot = false,
}: BadgeProps) {
  const { theme } = useTheme();
  
  const variantStyle = getVariantStyle(variant, theme);
  const sizeStyle = getSizeStyle(size, theme);
  
  if (dot) {
    return (
      <View
        style={[
          styles.dot,
          { backgroundColor: variantStyle.backgroundColor },
          style,
        ]}
        accessibilityLabel={label}
        accessibilityRole="none"
      />
    );
  }
  
  return (
    <View
      style={[
        styles.badge,
        sizeStyle.container,
        {
          backgroundColor: variantStyle.backgroundColor,
          borderColor: variantStyle.borderColor,
        },
        style,
      ]}
      accessibilityLabel={label}
      accessibilityRole="none"
    >
      <Text
        style={[
          sizeStyle.text,
          { color: variantStyle.textColor },
          textStyle,
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

function getVariantStyle(variant: BadgeVariant, theme: any) {
  switch (variant) {
    case 'success':
      return {
        backgroundColor: theme.colors.toast.successBg,
        borderColor: theme.colors.success,
        textColor: theme.colors.success,
      };
    case 'error':
      return {
        backgroundColor: theme.colors.toast.errorBg,
        borderColor: theme.colors.error,
        textColor: theme.colors.error,
      };
    case 'warning':
      return {
        backgroundColor: theme.colors.toast.warningBg,
        borderColor: theme.colors.warning,
        textColor: theme.colors.warning,
      };
    case 'info':
      return {
        backgroundColor: theme.colors.toast.infoBg,
        borderColor: theme.colors.info,
        textColor: theme.colors.info,
      };
    case 'neutral':
      return {
        backgroundColor: theme.colors.background.secondary,
        borderColor: theme.colors.border.default,
        textColor: theme.colors.text.secondary,
      };
  }
}

function getSizeStyle(size: BadgeSize, theme: any) {
  switch (size) {
    case 'sm':
      return {
        container: {
          paddingHorizontal: theme.spacing[2],
          paddingVertical: theme.spacing[1],
        },
        text: {
          fontSize: theme.typography.fontSize.xs,
          fontWeight: theme.typography.fontWeight.medium,
        },
      };
    case 'md':
      return {
        container: {
          paddingHorizontal: theme.spacing[3],
          paddingVertical: theme.spacing[1],
        },
        text: {
          fontSize: theme.typography.fontSize.sm,
          fontWeight: theme.typography.fontWeight.medium,
        },
      };
    case 'lg':
      return {
        container: {
          paddingHorizontal: theme.spacing[4],
          paddingVertical: theme.spacing[2],
        },
        text: {
          fontSize: theme.typography.fontSize.base,
          fontWeight: theme.typography.fontWeight.medium,
        },
      };
  }
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 12,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
