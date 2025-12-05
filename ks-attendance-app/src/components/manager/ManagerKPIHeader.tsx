/**
 * ManagerKPIHeader - KPI Header Component
 * 
 * Displays team-level KPIs (Present, Absent, Late, Over-Break)
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { DashboardKPIs } from '../../hooks/useManagerDashboard';
import { MetricChip } from './MetricChip';

interface ManagerKPIHeaderProps {
  kpis: DashboardKPIs;
}

export const ManagerKPIHeader: React.FC<ManagerKPIHeaderProps> = ({ kpis }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Team Overview</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll}>
        <View style={styles.chips}>
          <MetricChip
            icon="✅"
            value={kpis.presentCount}
            label="Present"
            color="#2E7D32"
            backgroundColor="#C8E6C9"
          />
          <MetricChip
            icon="❌"
            value={kpis.absentCount}
            label="Absent"
            color="#C62828"
            backgroundColor="#FFCDD2"
          />
          <MetricChip
            icon="⏰"
            value={kpis.lateCount}
            label="Late"
            color="#F57C00"
            backgroundColor="#FFE0B2"
          />
          <MetricChip
            icon="⏱️"
            value={kpis.overBreakCount}
            label="Over Break"
            color="#D84315"
            backgroundColor="#FFCCBC"
          />
          <MetricChip
            icon="👥"
            value={kpis.totalTeamSize}
            label="Total Team"
            color="#1976D2"
            backgroundColor="#E3F2FD"
          />
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#212121',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  scroll: {
    paddingHorizontal: 16,
  },
  chips: {
    flexDirection: 'row',
    gap: 12,
  },
});
