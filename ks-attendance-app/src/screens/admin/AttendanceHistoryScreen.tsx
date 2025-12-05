import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface AttendanceRecord {
  id: string;
  employeeName: string;
  employeeId: string;
  date: string;
  checkIn: string;
  checkOut?: string;
  status: 'present' | 'late' | 'absent' | 'on-leave';
  totalHours?: number;
}

export default function AttendanceHistoryScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Mock data - replace with actual ToonClient fetch
  const attendanceRecords: AttendanceRecord[] = [
    {
      id: '1',
      employeeName: 'John Doe',
      employeeId: 'EMP001',
      date: '2024-01-15',
      checkIn: '09:00 AM',
      checkOut: '05:30 PM',
      status: 'present',
      totalHours: 8.5,
    },
    {
      id: '2',
      employeeName: 'Jane Smith',
      employeeId: 'EMP002',
      date: '2024-01-15',
      checkIn: '09:15 AM',
      checkOut: '05:00 PM',
      status: 'late',
      totalHours: 7.75,
    },
    {
      id: '3',
      employeeName: 'Bob Johnson',
      employeeId: 'EMP003',
      date: '2024-01-15',
      checkIn: '-',
      status: 'absent',
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present':
        return '#34C759';
      case 'late':
        return '#FF9500';
      case 'absent':
        return '#FF3B30';
      case 'on-leave':
        return '#5856D6';
      default:
        return '#8E8E93';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present':
        return 'checkmark-circle';
      case 'late':
        return 'time';
      case 'absent':
        return 'close-circle';
      case 'on-leave':
        return 'calendar';
      default:
        return 'help-circle';
    }
  };

  const filteredRecords = attendanceRecords.filter((record) => {
    const matchesSearch =
      record.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.employeeId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter =
      filterStatus === 'all' || record.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const renderFilterButton = (status: string, label: string) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        filterStatus === status && styles.filterButtonActive,
      ]}
      onPress={() => setFilterStatus(status)}
    >
      <Text
        style={[
          styles.filterButtonText,
          filterStatus === status && styles.filterButtonTextActive,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderRecord = ({ item }: { item: AttendanceRecord }) => (
    <View style={styles.recordCard}>
      <View style={styles.recordHeader}>
        <View>
          <Text style={styles.employeeName}>{item.employeeName}</Text>
          <Text style={styles.employeeId}>{item.employeeId}</Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(item.status) + '20' },
          ]}
        >
          <Ionicons
            name={getStatusIcon(item.status) as any}
            size={16}
            color={getStatusColor(item.status)}
          />
          <Text
            style={[styles.statusText, { color: getStatusColor(item.status) }]}
          >
            {item.status}
          </Text>
        </View>
      </View>

      <View style={styles.recordDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="calendar-outline" size={16} color="#666" />
          <Text style={styles.detailText}>{item.date}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="enter-outline" size={16} color="#34C759" />
          <Text style={styles.detailText}>{item.checkIn}</Text>
        </View>
        {item.checkOut && (
          <View style={styles.detailRow}>
            <Ionicons name="exit-outline" size={16} color="#FF3B30" />
            <Text style={styles.detailText}>{item.checkOut}</Text>
          </View>
        )}
        {item.totalHours && (
          <View style={styles.detailRow}>
            <Ionicons name="time-outline" size={16} color="#007AFF" />
            <Text style={styles.detailText}>{item.totalHours}h</Text>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Attendance History</Text>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color="#999" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or ID..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.filters}>
        {renderFilterButton('all', 'All')}
        {renderFilterButton('present', 'Present')}
        {renderFilterButton('late', 'Late')}
        {renderFilterButton('absent', 'Absent')}
        {renderFilterButton('on-leave', 'On Leave')}
      </View>

      <FlatList
        data={filteredRecords}
        keyExtractor={(item) => item.id}
        renderItem={renderRecord}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No records found</Text>
        }
      />

      <TouchableOpacity style={styles.exportButton}>
        <Ionicons name="download-outline" size={20} color="#fff" />
        <Text style={styles.exportButtonText}>Export History</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
  },
  filters: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  listContent: {
    padding: 16,
  },
  recordCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  employeeName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  employeeId: {
    fontSize: 12,
    color: '#666',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  recordDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 16,
    color: '#999',
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    margin: 16,
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
  },
  exportButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
