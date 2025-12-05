/**
 * Avatar Component
 * 
 * User avatar with initials fallback.
 */

import React from 'react';
import { View, Text, Image, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../../theme';

type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

interface AvatarProps {
  /** User name for initials */
  name?: string;
  
  /** Image source URL */
  source?: string;
  
  /** Size variant */
  size?: AvatarSize;
  
  /** Custom style */
  style?: ViewStyle;
  
  /** Background color */
  backgroundColor?: string;
}

export function Avatar({
  name,
  source,
  size = 'md',
  style,
  backgroundColor,
}: AvatarProps) {
  const { theme } = useTheme();
  
  const sizeStyle = getSizeStyle(size, theme);
  const initials = getInitials(name);
  const bgColor = backgroundColor || generateBackgroundColor(name, theme);
  
  return (
    <View
      style={[
        styles.avatar,
        sizeStyle.container,
        { backgroundColor: bgColor },
        style,
      ]}
      accessibilityLabel={name ? `Avatar for ${name}` : 'Avatar'}
      accessibilityRole="image"
    >
      {source ? (
        <Image
          source={{ uri: source }}
          style={[styles.image, sizeStyle.container]}
          accessibilityIgnoresInvertColors
        />
      ) : (
        <Text
          style={[
            sizeStyle.text,
            { color: theme.colors.text.inverse },
          ]}
        >
          {initials}
        </Text>
      )}
    </View>
  );
}

function getInitials(name?: string): string {
  if (!name) return '?';
  
  const parts = name.trim().split(' ');
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  
  return (
    parts[0].charAt(0).toUpperCase() + parts[parts.length - 1].charAt(0).toUpperCase()
  );
}

function generateBackgroundColor(name: string | undefined, theme: any): string {
  if (!name) return theme.colors.interactive.secondary;
  
  const colors = [
    theme.colors.info,
    theme.colors.success,
    theme.colors.warning,
    '#8b5cf6', // purple
    '#ec4899', // pink
    '#06b6d4', // cyan
  ];
  
  const hash = name.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);
  
  return colors[Math.abs(hash) % colors.length];
}

function getSizeStyle(size: AvatarSize, theme: any) {
  switch (size) {
    case 'sm':
      return {
        container: { width: 32, height: 32, borderRadius: 16 },
        text: { fontSize: theme.typography.fontSize.sm },
      };
    case 'md':
      return {
        container: { width: 40, height: 40, borderRadius: 20 },
        text: { fontSize: theme.typography.fontSize.base },
      };
    case 'lg':
      return {
        container: { width: 56, height: 56, borderRadius: 28 },
        text: { fontSize: theme.typography.fontSize.xl },
      };
    case 'xl':
      return {
        container: { width: 80, height: 80, borderRadius: 40 },
        text: { fontSize: theme.typography.fontSize['3xl'] },
      };
  }
}

const styles = StyleSheet.create({
  avatar: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  
  image: {
    width: '100%',
    height: '100%',
  },
});
