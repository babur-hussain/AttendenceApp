/**
 * Home Screen Components
 * Reusable UI components for role-based home screens
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

/**
 * HomeCard
 * Card component for home screen sections
 */
interface HomeCardProps {
  title: string;
  children: React.ReactNode;
  headerAction?: React.ReactNode;
}

export const HomeCard: React.FC<HomeCardProps> = ({ title, children, headerAction }) => {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{title}</Text>
        {headerAction}
      </View>
      <View style={styles.cardContent}>{children}</View>
    </View>
  );
};

/**
 * ActionTile
 * Clickable action tile with icon and label
 */
interface ActionTileProps {
  icon: string;
  label: string;
  onPress: () => void;
  color?: string;
  disabled?: boolean;
}

export const ActionTile: React.FC<ActionTileProps> = ({
  icon,
  label,
  onPress,
  color = '#007AFF',
  disabled = false,
}) => {
  return (
    <TouchableOpacity
      style={[styles.tile, disabled && styles.tileDisabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <View style={[styles.tileIcon, { backgroundColor: `${color}20` }]}>
        <Text style={[styles.tileIconText, { color }]}>{icon}</Text>
      </View>
      <Text style={styles.tileLabel}>{label}</Text>
    </TouchableOpacity>
  );
};

/**
 * SummaryTile
 * Display tile for summary information
 */
interface SummaryTileProps {
  label: string;
  value: string | number;
  subtitle?: string;
  color?: string;
}

export const SummaryTile: React.FC<SummaryTileProps> = ({
  label,
  value,
  subtitle,
  color = '#007AFF',
}) => {
  return (
    <View style={styles.summaryTile}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={[styles.summaryValue, { color }]}>{value}</Text>
      {subtitle && <Text style={styles.summarySubtitle}>{subtitle}</Text>}
    </View>
  );
};

/**
 * WelcomeHeader
 * Welcome message header with user name
 */
interface WelcomeHeaderProps {
  userName: string;
  subtitle?: string;
}

export const WelcomeHeader: React.FC<WelcomeHeaderProps> = ({ userName, subtitle }) => {
  return (
    <View style={styles.welcomeHeader}>
      <Text style={styles.welcomeTitle}>Welcome back,</Text>
      <Text style={styles.welcomeName}>{userName}</Text>
      {subtitle && <Text style={styles.welcomeSubtitle}>{subtitle}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  // Card styles
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    // Shadow for iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    // Shadow for Android
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  cardContent: {
    // Container for card children
  },

  // Action Tile styles
  tile: {
    flex: 1,
    aspectRatio: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    margin: 6,
    justifyContent: 'center',
    alignItems: 'center',
    // Shadow for iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    // Shadow for Android
    elevation: 3,
  },
  tileDisabled: {
    opacity: 0.5,
  },
  tileIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  tileIconText: {
    fontSize: 28,
  },
  tileLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },

  // Summary Tile styles
  summaryTile: {
    flex: 1,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    margin: 6,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
    textAlign: 'center',
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  summarySubtitle: {
    fontSize: 11,
    color: '#999',
    textAlign: 'center',
  },

  // Welcome Header styles
  welcomeHeader: {
    marginBottom: 24,
  },
  welcomeTitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 4,
  },
  welcomeName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: '#999',
  },
});
