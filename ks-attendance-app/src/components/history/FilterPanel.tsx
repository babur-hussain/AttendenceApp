/**
 * FilterPanel - Multi-filter Component for History
 * 
 * Filters: date range, employee, device, score thresholds
 */

import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { HistoryFilters } from '../../hooks/useHistory';

interface FilterPanelProps {
  filters: HistoryFilters;
  onFiltersChange: (filters: HistoryFilters) => void;
  showEmployeeFilter?: boolean;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
  filters,
  onFiltersChange,
  showEmployeeFilter = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleFilterChange = (key: keyof HistoryFilters, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFiltersChange({});
  };

  const activeFilterCount = Object.keys(filters).length;

  return (
    <View style={styles.container}>
      {/* Filter Toggle Button */}
      <TouchableOpacity
        style={styles.toggleButton}
        onPress={() => setIsExpanded(!isExpanded)}
      >
        <Text style={styles.toggleText}>
          Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
        </Text>
        <Text style={styles.chevron}>{isExpanded ? '▼' : '▶'}</Text>
      </TouchableOpacity>

      {/* Expanded Filters */}
      {isExpanded && (
        <View style={styles.filtersContent}>
          {/* Date Range */}
          <View style={styles.filterRow}>
            <Text style={styles.label}>From Date</Text>
            <TextInput
              style={styles.input}
              value={filters.fromDate || ''}
              onChangeText={(text) => handleFilterChange('fromDate', text)}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.filterRow}>
            <Text style={styles.label}>To Date</Text>
            <TextInput
              style={styles.input}
              value={filters.toDate || ''}
              onChangeText={(text) => handleFilterChange('toDate', text)}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#999"
            />
          </View>

          {/* Employee (for managers) */}
          {showEmployeeFilter && (
            <View style={styles.filterRow}>
              <Text style={styles.label}>Employee ID</Text>
              <TextInput
                style={styles.input}
                value={filters.employeeId || ''}
                onChangeText={(text) => handleFilterChange('employeeId', text)}
                placeholder="EMP001"
                placeholderTextColor="#999"
              />
            </View>
          )}

          {/* Event Type */}
          <View style={styles.filterRow}>
            <Text style={styles.label}>Event Type</Text>
            <View style={styles.chipGroup}>
              {['IN', 'OUT', 'BREAK_START', 'BREAK_END'].map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.chip,
                    filters.eventType === type && styles.chipActive,
                  ]}
                  onPress={() =>
                    handleFilterChange('eventType', filters.eventType === type ? undefined : type)
                  }
                >
                  <Text
                    style={[
                      styles.chipText,
                      filters.eventType === type && styles.chipTextActive,
                    ]}
                  >
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Device */}
          <View style={styles.filterRow}>
            <Text style={styles.label}>Device ID</Text>
            <TextInput
              style={styles.input}
              value={filters.deviceId || ''}
              onChangeText={(text) => handleFilterChange('deviceId', text)}
              placeholder="MOBILE_001"
              placeholderTextColor="#999"
            />
          </View>

          {/* Match Score Threshold */}
          <View style={styles.filterRow}>
            <Text style={styles.label}>Min Match Score</Text>
            <TextInput
              style={styles.input}
              value={filters.minMatchScore?.toString() || ''}
              onChangeText={(text) =>
                handleFilterChange('minMatchScore', text ? parseFloat(text) : undefined)
              }
              placeholder="0.0 - 1.0"
              keyboardType="decimal-pad"
              placeholderTextColor="#999"
            />
          </View>

          {/* Liveness Threshold */}
          <View style={styles.filterRow}>
            <Text style={styles.label}>Min Liveness</Text>
            <TextInput
              style={styles.input}
              value={filters.minLiveness?.toString() || ''}
              onChangeText={(text) =>
                handleFilterChange('minLiveness', text ? parseFloat(text) : undefined)
              }
              placeholder="0.0 - 1.0"
              keyboardType="decimal-pad"
              placeholderTextColor="#999"
            />
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
              <Text style={styles.clearText}>Clear All</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  toggleButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  toggleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  chevron: {
    fontSize: 12,
    color: '#666',
  },
  filtersContent: {
    padding: 16,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  filterRow: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#333',
  },
  chipGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#fff',
  },
  chipActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  chipTextActive: {
    color: '#fff',
  },
  actions: {
    marginTop: 8,
  },
  clearButton: {
    padding: 12,
    alignItems: 'center',
  },
  clearText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF5722',
  },
});
