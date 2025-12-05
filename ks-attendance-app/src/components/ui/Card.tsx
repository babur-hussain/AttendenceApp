/**
 * Card Component
 * 
 * Theme-aware card container with optional header, body, and footer.
 */

import React, { ReactNode } from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '../../theme';

interface CardProps {
  /** Card content */
  children: ReactNode;
  
  /** Optional header content */
  header?: ReactNode;
  
  /** Optional footer content */
  footer?: ReactNode;
  
  /** Card title (alternative to header) */
  title?: string;
  
  /** Card subtitle */
  subtitle?: string;
  
  /** Custom style overrides */
  style?: ViewStyle;
  
  /** Remove default padding */
  noPadding?: boolean;
  
  /** Elevation level (shadow intensity) */
  elevation?: 'sm' | 'base' | 'md' | 'lg';
}

export function Card({
  children,
  header,
  footer,
  title,
  subtitle,
  style,
  noPadding = false,
  elevation = 'base',
}: CardProps) {
  const { theme } = useTheme();
  
  const shadowStyle = theme.shadows[elevation];
  
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.card.background,
          borderColor: theme.colors.card.border,
        },
        shadowStyle,
        style,
      ]}
      accessibilityRole="none"
    >
      {(header || title) && (
        <View style={[styles.header, noPadding && styles.noPadding]}>
          {header || (
            <>
              {title && (
                <Text
                  style={[
                    styles.title,
                    {
                      color: theme.colors.text.primary,
                      fontSize: theme.typography.fontSize.lg,
                      fontWeight: theme.typography.fontWeight.semibold,
                    },
                  ]}
                >
                  {title}
                </Text>
              )}
              {subtitle && (
                <Text
                  style={[
                    styles.subtitle,
                    {
                      color: theme.colors.text.secondary,
                      fontSize: theme.typography.fontSize.sm,
                    },
                  ]}
                >
                  {subtitle}
                </Text>
              )}
            </>
          )}
        </View>
      )}
      
      <View style={[styles.body, noPadding && styles.noPadding]}>
        {children}
      </View>
      
      {footer && (
        <View style={[styles.footer, noPadding && styles.noPadding]}>
          {footer}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  
  body: {
    padding: 16,
  },
  
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  
  noPadding: {
    padding: 0,
  },
  
  title: {
    marginBottom: 4,
  },
  
  subtitle: {
    marginTop: 2,
  },
});
