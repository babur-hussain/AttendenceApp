/**
 * HistoryHome - Main History Screen
 * 
 * Features:
 * - Month calendar with day badges
 * - KPI header (days present, total hours, overtime)
 * - Toggle: Calendar / List view
 * - Filter panel
 * - Export button
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useHistory, HistoryFilters } from '../../hooks/useHistory';
import { HistoryCalendar } from '../../components/history/HistoryCalendar';
import { FilterPanel } from '../../components/history/FilterPanel';
import { BadgeLegend } from '../../components/history';

export const HistoryHome: React.FC = () => {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [filters, setFilters] = useState<HistoryFilters>({});

  const {
    isLoading,
    isOffline,
    error,
    monthSummary,
    fetchMonthSummary,
    exportFilteredReport,
    syncCachedMonths,
  } = useHistory();

  useEffect(() => {
    fetchMonthSummary(year, month, filters);
  }, [year, month, filters]);

  const handleMonthChange = (newYear: number, newMonth: number) => {
    setYear(newYear);
    setMonth(newMonth);
  };

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    // Navigate to DayDetail screen
    console.log('[HistoryHome] Navigate to day:', date);
  };

  const handleExport = async () => {
    Alert.alert(
      'Export Report',
      'Export attendance data for current filters?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Export',
          onPress: async () => {
            const reportId = await exportFilteredReport({
              ...filters,
              fromDate: filters.fromDate || `${year}-${String(month).padStart(2, '0')}-01`,
              toDate:
                filters.toDate ||
                `${year}-${String(month).padStart(2, '0')}-${new Date(year, month, 0).getDate()}`,
            });

            if (reportId) {
              Alert.alert('Success', `Report ${reportId} ready for download`);
            }
          },
        },
      ]
    );
  };

  const handleSync = () => {
    syncCachedMonths();
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Attendance History</Text>
        {isOffline && (
          <View style={styles.offlineBadge}>
            <Text style={styles.offlineText}>Offline</Text>
            <TouchableOpacity onPress={handleSync}>
              <Text style={styles.syncText}>Sync</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* KPI Cards */}
      {monthSummary && (
        <View style={styles.kpiRow}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiValue}>{monthSummary.totalPresentDays}</Text>
            <Text style={styles.kpiLabel}>Days Present</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiValue}>{monthSummary.totalHours.toFixed(1)}h</Text>
            <Text style={styles.kpiLabel}>Total Hours</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiValue}>{monthSummary.overtimeMinutes}m</Text>
            <Text style={styles.kpiLabel}>Overtime</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiValue}>{monthSummary.punctualityPercent.toFixed(0)}%</Text>
            <Text style={styles.kpiLabel}>Punctuality</Text>
          </View>
        </View>
      )}

      {/* View Toggle */}
      <View style={styles.viewToggle}>
        <TouchableOpacity
          style={[styles.toggleBtn, viewMode === 'calendar' && styles.toggleBtnActive]}
          onPress={() => setViewMode('calendar')}
        >
          <Text style={[styles.toggleText, viewMode === 'calendar' && styles.toggleTextActive]}>
            Calendar
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, viewMode === 'list' && styles.toggleBtnActive]}
          onPress={() => setViewMode('list')}
        >
          <Text style={[styles.toggleText, viewMode === 'list' && styles.toggleTextActive]}>
            List
          </Text>
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <FilterPanel filters={filters} onFiltersChange={setFilters} showEmployeeFilter={false} />

      {/* Content */}
      {isLoading && !monthSummary ? (
        <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : viewMode === 'calendar' ? (
        <>
          <HistoryCalendar
            year={year}
            month={month}
            days={monthSummary?.days || {}}
            selectedDate={selectedDate || undefined}
            onDateSelect={handleDateSelect}
            onMonthChange={handleMonthChange}
          />
          <BadgeLegend />
        </>
      ) : (
        <View style={styles.listPlaceholder}>
          <Text style={styles.placeholderText}>List view - See AttendanceList.tsx</Text>
        </View>
      )}

      {/* Export Button */}
      <TouchableOpacity style={styles.exportButton} onPress={handleExport}>
        <Text style={styles.exportText}>📊 Export Report</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  offlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  offlineText: {
    fontSize: 12,
    color: '#FF9800',
    fontWeight: '600',
  },
  syncText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '600',
  },
  kpiRow: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  kpiValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  kpiLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  viewToggle: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
    backgroundColor: '#fff',
    padding: 4,
  },
  toggleBtn: {
    flex: 1,
    padding: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  toggleBtnActive: {
    backgroundColor: '#007AFF',
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  toggleTextActive: {
    color: '#fff',
  },
  loader: {
    marginVertical: 40,
  },
  errorContainer: {
    padding: 20,
    alignItems: 'center',
  },
  errorText: {
    color: '#F44336',
    fontSize: 14,
  },
  listPlaceholder: {
    padding: 40,
    alignItems: 'center',
  },
  placeholderText: {
    color: '#999',
    fontSize: 14,
  },
  exportButton: {
    margin: 16,
    padding: 16,
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  exportText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
});
