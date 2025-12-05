/**
 * MetricChip - Metric Display Chip Component
 * 
 * Displays a metric with icon, value, and label
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface MetricChipProps {
  icon: string;
  value: string | number;
  label: string;
  color?: string;
  backgroundColor?: string;
}

export const MetricChip: React.FC<MetricChipProps> = ({
  icon,
  value,
  label,
  color = '#1976D2',
  backgroundColor = '#E3F2FD',
}) => {
  return (
    <View style={[styles.container, { backgroundColor }]} accessibilityLabel={`${label}: ${value}`}>
      <Text style={[styles.icon, { color }]}>{icon}</Text>
      <View style={styles.content}>
        <Text style={[styles.value, { color }]}>{value}</Text>
        <Text style={styles.label}>{label}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 8,
  },
  icon: {
    fontSize: 24,
  },
  content: {
    gap: 2,
  },
  value: {
    fontSize: 18,
    fontWeight: '700',
  },
  label: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
  },
});
