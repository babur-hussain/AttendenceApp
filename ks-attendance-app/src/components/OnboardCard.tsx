import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';

export const OnboardCard: React.FC<{ title: string; subtitle?: string; style?: ViewStyle; children?: React.ReactNode; }>
= ({ title, subtitle, style, children }) => {
  return (
    <View style={[styles.card, style]}>
      <Text style={styles.title} accessibilityRole="header">{title}</Text>
      {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      <View style={styles.content}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    // className: 'bg-white rounded-2xl p-5 shadow'
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    marginTop: 6,
    color: '#6B7280',
    fontSize: 14,
  },
  content: {
    marginTop: 16,
  },
});

export default OnboardCard;
