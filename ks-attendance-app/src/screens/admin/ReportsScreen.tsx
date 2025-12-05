import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type ReportType =
  | 'attendance-summary'
  | 'late-arrivals'
  | 'early-departures'
  | 'absences'
  | 'overtime'
  | 'department-stats';

interface ReportCard {
  id: ReportType;
  title: string;
  description: string;
  icon: string;
  color: string;
}

export default function ReportsScreen() {
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month' | 'custom'>('today');

  const reports: ReportCard[] = [
    {
      id: 'attendance-summary',
      title: 'Attendance Summary',
      description: 'Overall attendance statistics',
      icon: 'bar-chart-outline',
      color: '#007AFF',
    },
    {
      id: 'late-arrivals',
      title: 'Late Arrivals',
      description: 'Employees arriving late',
      icon: 'time-outline',
      color: '#FF9500',
    },
    {
      id: 'early-departures',
      title: 'Early Departures',
      description: 'Employees leaving early',
      icon: 'exit-outline',
      color: '#FF3B30',
    },
    {
      id: 'absences',
      title: 'Absences',
      description: 'Absent employees',
      icon: 'remove-circle-outline',
      color: '#8E8E93',
    },
    {
      id: 'overtime',
      title: 'Overtime',
      description: 'Extra hours worked',
      icon: 'trending-up-outline',
      color: '#34C759',
    },
    {
      id: 'department-stats',
      title: 'Department Stats',
      description: 'By department breakdown',
      icon: 'people-outline',
      color: '#5856D6',
    },
  ];

  const handleGenerateReport = (reportType: ReportType) => {
    Alert.alert(
      'Generate Report',
      `Generate ${reports.find((r) => r.id === reportType)?.title} for ${selectedPeriod}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Generate',
          onPress: () => {
            // TODO: Implement report generation with ToonClient
            Alert.alert('Success', 'Report generation started. You will be notified when ready.');
          },
        },
      ]
    );
  };

  const handleExportAll = () => {
    Alert.alert(
      'Export All Reports',
      'Export all reports as PDF for the selected period?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Export',
          onPress: () => {
            Alert.alert('Success', 'Export started. Check your downloads folder.');
          },
        },
      ]
    );
  };

  const renderPeriodButton = (period: typeof selectedPeriod, label: string) => (
    <TouchableOpacity
      style={[
        styles.periodButton,
        selectedPeriod === period && styles.periodButtonActive,
      ]}
      onPress={() => setSelectedPeriod(period)}
    >
      <Text
        style={[
          styles.periodButtonText,
          selectedPeriod === period && styles.periodButtonTextActive,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderReportCard = (report: ReportCard) => (
    <TouchableOpacity
      key={report.id}
      style={[styles.reportCard, { borderLeftColor: report.color }]}
      onPress={() => handleGenerateReport(report.id)}
    >
      <View
        style={[styles.iconContainer, { backgroundColor: report.color + '20' }]}
      >
        <Ionicons name={report.icon as any} size={28} color={report.color} />
      </View>
      <View style={styles.reportInfo}>
        <Text style={styles.reportTitle}>{report.title}</Text>
        <Text style={styles.reportDescription}>{report.description}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#999" />
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Reports</Text>
        <TouchableOpacity
          style={styles.exportButton}
          onPress={handleExportAll}
        >
          <Ionicons name="download-outline" size={20} color="#007AFF" />
          <Text style={styles.exportButtonText}>Export All</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.periodSelector}>
        {renderPeriodButton('today', 'Today')}
        {renderPeriodButton('week', 'This Week')}
        {renderPeriodButton('month', 'This Month')}
        {renderPeriodButton('custom', 'Custom')}
      </View>

      <View style={styles.quickStats}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>95%</Text>
          <Text style={styles.statLabel}>Attendance Rate</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>8.2</Text>
          <Text style={styles.statLabel}>Avg Hours/Day</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>12</Text>
          <Text style={styles.statLabel}>Late Arrivals</Text>
        </View>
      </View>

      <View style={styles.reportsSection}>
        <Text style={styles.sectionTitle}>Available Reports</Text>
        {reports.map(renderReportCard)}
      </View>

      <View style={styles.infoCard}>
        <Ionicons name="information-circle-outline" size={20} color="#007AFF" />
        <Text style={styles.infoText}>
          Reports are generated in real-time based on attendance data. Exported
          reports include detailed breakdowns and charts.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  exportButtonText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  periodSelector: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#fff',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  periodButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  periodButtonTextActive: {
    color: '#fff',
  },
  quickStats: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#007AFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  reportsSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  reportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  reportInfo: {
    flex: 1,
  },
  reportTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  reportDescription: {
    fontSize: 14,
    color: '#666',
  },
  infoCard: {
    margin: 16,
    backgroundColor: '#E3F2FD',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 12,
    color: '#1976D2',
    lineHeight: 18,
  },
});
