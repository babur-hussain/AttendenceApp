/**
 * TeamStatusCard - Team Member Status Card Component
 * 
 * Displays individual team member status with match/liveness badges
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { TeamMemberStatus } from '../../hooks/useManagerDashboard';
import { StatusBadge } from './StatusBadge';

interface TeamStatusCardProps {
  member: TeamMemberStatus;
  onPress: (employeeId: string) => void;
}

export const TeamStatusCard: React.FC<TeamStatusCardProps> = ({ member, onPress }) => {
  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatTime = (timestamp: string | null): string => {
    if (!timestamp) return '--:--';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const getScoreBadgeColor = (score: number | null): string => {
    if (score === null) return '#9E9E9E';
    if (score >= 0.85) return '#4CAF50';
    if (score >= 0.70) return '#FF9800';
    return '#F44336';
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(member.employeeId)}
      accessibilityLabel={`${member.name}, ${member.role}, ${member.status}`}
      accessibilityRole="button"
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.initials}>{getInitials(member.name)}</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.name}>{member.name}</Text>
          <Text style={styles.role}>{member.role}</Text>
        </View>
        <StatusBadge status={member.status} size="small" />
      </View>

      <View style={styles.details}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Last Event:</Text>
          <Text style={styles.detailValue}>{formatTime(member.lastEventTime)}</Text>
        </View>

        {member.matchScore !== null && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Match Score:</Text>
            <View style={[styles.scoreBadge, { backgroundColor: getScoreBadgeColor(member.matchScore) }]}>
              <Text style={styles.scoreText}>{(member.matchScore * 100).toFixed(0)}%</Text>
            </View>
          </View>
        )}

        {member.livenessScore !== null && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Liveness:</Text>
            <View style={[styles.scoreBadge, { backgroundColor: getScoreBadgeColor(member.livenessScore) }]}>
              <Text style={styles.scoreText}>{(member.livenessScore * 100).toFixed(0)}%</Text>
            </View>
          </View>
        )}

        {member.lateMinutes > 0 && (
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, styles.warningText]}>⏰ Late by:</Text>
            <Text style={[styles.detailValue, styles.warningText]}>{member.lateMinutes} min</Text>
          </View>
        )}

        {member.breakOverMinutes > 0 && (
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, styles.errorText]}>⏱️ Over Break:</Text>
            <Text style={[styles.detailValue, styles.errorText]}>{member.breakOverMinutes} min</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1976D2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  initials: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 2,
  },
  role: {
    fontSize: 13,
    color: '#757575',
  },
  details: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detailLabel: {
    fontSize: 13,
    color: '#757575',
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#424242',
  },
  scoreBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  scoreText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  warningText: {
    color: '#F57C00',
  },
  errorText: {
    color: '#D32F2F',
  },
});
