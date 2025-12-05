/**
 * StatusBadge - Status Badge Component
 * 
 * Color-coded badge for attendance status with accessibility
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export type StatusType = 'PRESENT' | 'ABSENT' | 'ON_BREAK' | 'LEFT' | 'PENDING' | 'LATE' | 'OVER_BREAK';

interface StatusBadgeProps {
  status: StatusType;
  size?: 'small' | 'medium' | 'large';
}

const STATUS_CONFIG: Record<StatusType, { color: string; bg: string; label: string }> = {
  PRESENT: { color: '#1B5E20', bg: '#C8E6C9', label: 'Present' },
  ABSENT: { color: '#B71C1C', bg: '#FFCDD2', label: 'Absent' },
  ON_BREAK: { color: '#F57C00', bg: '#FFE0B2', label: 'On Break' },
  LEFT: { color: '#424242', bg: '#E0E0E0', label: 'Left' },
  PENDING: { color: '#F57F17', bg: '#FFF9C4', label: 'Pending' },
  LATE: { color: '#E65100', bg: '#FFE0B2', label: 'Late' },
  OVER_BREAK: { color: '#D84315', bg: '#FFCCBC', label: 'Over Break' },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'medium' }) => {
  const config = STATUS_CONFIG[status];
  
  const sizeStyle = size === 'small' ? styles.small : size === 'large' ? styles.large : styles.medium;

  return (
    <View
      style={[styles.badge, { backgroundColor: config.bg }, sizeStyle]}
      accessibilityLabel={`Status: ${config.label}`}
      accessibilityRole="text"
    >
      <Text style={[styles.text, { color: config.color }, sizeStyle]}>{config.label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  text: {
    fontWeight: '600',
  },
  small: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    fontSize: 10,
  },
  medium: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 12,
  },
  large: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 14,
  },
});
