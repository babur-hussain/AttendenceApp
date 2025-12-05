/**
 * BadgeLegend - Calendar Badge Legend Component
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export const BadgeLegend: React.FC = () => {
  const badges = [
    { color: '#4CAF50', label: 'Present' },
    { color: '#FF9800', label: 'Late' },
    { color: '#FF5722', label: 'Over Break' },
    { color: '#2196F3', label: 'Partial' },
    { color: '#9E9E9E', label: 'Absent' },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Legend</Text>
      <View style={styles.badges}>
        {badges.map((badge) => (
          <View key={badge.label} style={styles.badge}>
            <View style={[styles.color, { backgroundColor: badge.color }]} />
            <Text style={styles.label}>{badge.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginTop: 16, marginHorizontal: 16, backgroundColor: '#fff', borderRadius: 12, padding: 16 },
  title: { fontSize: 14, fontWeight: '600', color: '#666', marginBottom: 12 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  color: { width: 16, height: 16, borderRadius: 4 },
  label: { fontSize: 12, color: '#666' },
});
