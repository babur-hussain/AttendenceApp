/**
 * Charts - Attendance Analytics Charts Screen
 * 
 * Displays: Weekly Hours, Monthly Punctuality, Break Usage, Overtime
 * Uses react-native-svg placeholders (install victory-native or similar)
 */

import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Dimensions } from 'react-native';
import { useCharts } from '../../hooks/useCharts';

const { width } = Dimensions.get('window');
const CHART_WIDTH = width - 32;

export const Charts: React.FC = () => {
  const { isLoading, getWeeklyHours, getMonthlyPunctuality, getBreakUsage, getOvertimeHistogram } = useCharts();
  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const [punctualityData, setPunctualityData] = useState<any[]>([]);
  const [breakData, setBreakData] = useState<any[]>([]);
  const [overtimeData, setOvertimeData] = useState<any[]>([]);

  useEffect(() => {
    loadCharts();
  }, []);

  const loadCharts = async () => {
    const [weekly, punctuality, breaks, overtime] = await Promise.all([
      getWeeklyHours(),
      getMonthlyPunctuality(),
      getBreakUsage(),
      getOvertimeHistogram(),
    ]);

    setWeeklyData(weekly);
    setPunctualityData(punctuality);
    setBreakData(breaks);
    setOvertimeData(overtime);
  };

  if (isLoading && weeklyData.length === 0) {
    return <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 100 }} />;
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.pageTitle}>Attendance Analytics</Text>

      {/* Weekly Hours Bar Chart */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Weekly Hours</Text>
        <View style={styles.chartPlaceholder}>
          {weeklyData.map((item, i) => (
            <View key={i} style={styles.barItem}>
              <View style={[styles.bar, { height: item.hours * 10, backgroundColor: '#007AFF' }]} />
              <Text style={styles.barLabel}>{item.day}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Monthly Punctuality Line Chart */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Monthly Punctuality</Text>
        <View style={styles.chartPlaceholder}>
          <Text style={styles.mockChart}>📈 Line chart: {punctualityData.length} points</Text>
          <Text style={styles.mockText}>Average: {(punctualityData.reduce((sum, p) => sum + p.percentage, 0) / punctualityData.length || 0).toFixed(1)}%</Text>
        </View>
      </View>

      {/* Break Usage Donut */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Break Usage</Text>
        <View style={styles.chartPlaceholder}>
          {breakData.map((item) => (
            <View key={item.type} style={styles.breakRow}>
              <Text style={styles.breakType}>{item.type}</Text>
              <Text style={styles.breakValue}>{item.used}m / {item.allowed}m</Text>
              {item.over > 0 && <Text style={styles.breakOver}>+{item.over}m over</Text>}
            </View>
          ))}
        </View>
      </View>

      {/* Overtime Histogram */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Overtime Distribution</Text>
        <View style={styles.chartPlaceholder}>
          {overtimeData.map((bin) => (
            <View key={bin.range} style={styles.histogramRow}>
              <Text style={styles.histogramRange}>{bin.range} min</Text>
              <View style={[styles.histogramBar, { width: (bin.count / 10) * 100 }]} />
              <Text style={styles.histogramCount}>{bin.count}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  pageTitle: { fontSize: 24, fontWeight: 'bold', padding: 16, backgroundColor: '#fff' },
  chartCard: { backgroundColor: '#fff', margin: 16, borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 },
  chartTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 16 },
  chartPlaceholder: { minHeight: 200, justifyContent: 'center' },
  barItem: { alignItems: 'center', flex: 1 },
  bar: { width: 30, backgroundColor: '#007AFF', borderRadius: 4 },
  barLabel: { fontSize: 12, marginTop: 8, color: '#666' },
  mockChart: { textAlign: 'center', fontSize: 16, color: '#999' },
  mockText: { textAlign: 'center', fontSize: 14, color: '#666', marginTop: 8 },
  breakRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  breakType: { fontSize: 14, fontWeight: '600', color: '#333', flex: 1 },
  breakValue: { fontSize: 14, color: '#666' },
  breakOver: { fontSize: 12, color: '#FF5722', marginLeft: 8 },
  histogramRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  histogramRange: { fontSize: 14, color: '#666', width: 80 },
  histogramBar: { height: 20, backgroundColor: '#4CAF50', borderRadius: 4, marginRight: 8 },
  histogramCount: { fontSize: 14, fontWeight: '600', color: '#333' },
});
