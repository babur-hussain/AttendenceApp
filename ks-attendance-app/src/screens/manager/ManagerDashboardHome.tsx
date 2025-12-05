/**
 * ManagerDashboardHome - Manager Dashboard Home Screen
 * 
 * Features:
 * - Team status KPIs
 * - Real-time team list with status badges
 * - Filter panel (role, status, device, thresholds)
 * - Search functionality
 * - Pull-to-refresh
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useManagerDashboard, DashboardFilters } from '../../hooks/useManagerDashboard';
import {
  ManagerKPIHeader,
  TeamStatusCard,
  RoleFilterDropdown,
  StatusBadge,
} from '../../components/manager';

interface ManagerDashboardHomeProps {
  navigation: any;
}

export const ManagerDashboardHome: React.FC<ManagerDashboardHomeProps> = ({ navigation }) => {
  const {
    data,
    loading,
    error,
    isOffline,
    filters,
    applyFilters,
    clearFilters,
    refresh,
    searchTeamMember,
  } = useManagerDashboard();

  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [localFilters, setLocalFilters] = useState<DashboardFilters>(filters);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleApplyFilters = () => {
    applyFilters(localFilters);
    setShowFilters(false);
  };

  const handleClearFilters = () => {
    setLocalFilters({});
    clearFilters();
    setShowFilters(false);
  };

  const handleMemberPress = (employeeId: string) => {
    navigation.navigate('EmployeeDetail', { employeeId });
  };

  const filteredMembers = searchQuery
    ? searchTeamMember(searchQuery)
    : data?.teamMembers || [];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Manager Dashboard</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => navigation.navigate('PendingApprovals')}
          >
            <Text style={styles.iconButtonText}>📋</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => navigation.navigate('DeviceStatus')}
          >
            <Text style={styles.iconButtonText}>📱</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Offline Indicator */}
      {isOffline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>⚠️ Offline - Showing cached data</Text>
        </View>
      )}

      {/* KPI Header */}
      {data && <ManagerKPIHeader kpis={data.kpis} />}

      {/* Search & Filter Bar */}
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or ID..."
          value={searchQuery}
          onChangeText={handleSearch}
          accessibilityLabel="Search team members"
        />
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Text style={styles.filterButtonText}>
            {Object.keys(filters).length > 0 ? `🔍 (${Object.keys(filters).length})` : '🔍'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Filter Panel */}
      {showFilters && (
        <View style={styles.filterPanel}>
          <Text style={styles.filterTitle}>Filters</Text>

          <RoleFilterDropdown
            selectedRole={localFilters.role}
            onSelectRole={(role) => setLocalFilters({ ...localFilters, role })}
          />

          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>Min Match Score:</Text>
            <TextInput
              style={styles.filterInput}
              placeholder="0.85"
              keyboardType="numeric"
              value={localFilters.minMatchScore?.toString() || ''}
              onChangeText={(text) =>
                setLocalFilters({ ...localFilters, minMatchScore: parseFloat(text) || undefined })
              }
            />
          </View>

          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>Min Liveness:</Text>
            <TextInput
              style={styles.filterInput}
              placeholder="0.80"
              keyboardType="numeric"
              value={localFilters.minLivenessScore?.toString() || ''}
              onChangeText={(text) =>
                setLocalFilters({
                  ...localFilters,
                  minLivenessScore: parseFloat(text) || undefined,
                })
              }
            />
          </View>

          <View style={styles.filterActions}>
            <TouchableOpacity style={styles.clearButton} onPress={handleClearFilters}>
              <Text style={styles.clearButtonText}>Clear</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyButton} onPress={handleApplyFilters}>
              <Text style={styles.applyButtonText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Team List */}
      {loading && !data ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1976D2" />
          <Text style={styles.loadingText}>Loading team status...</Text>
        </View>
      ) : error && !data ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>❌ {error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={refresh}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.list}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
        >
          {filteredMembers.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No team members found</Text>
            </View>
          ) : (
            filteredMembers.map((member) => (
              <TeamStatusCard
                key={member.employeeId}
                member={member}
                onPress={handleMemberPress}
              />
            ))
          )}
          <View style={styles.listFooter} />
        </ScrollView>
      )}
    </View>
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
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#212121',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E3F2FD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonText: {
    fontSize: 20,
  },
  offlineBanner: {
    backgroundColor: '#FFF3E0',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  offlineText: {
    color: '#F57C00',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#212121',
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#E3F2FD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterButtonText: {
    fontSize: 18,
  },
  filterPanel: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    gap: 12,
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#212121',
    marginBottom: 8,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  filterLabel: {
    fontSize: 14,
    color: '#757575',
    width: 120,
  },
  filterInput: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#212121',
  },
  filterActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  clearButton: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  clearButtonText: {
    color: '#757575',
    fontWeight: '600',
    fontSize: 14,
  },
  applyButton: {
    flex: 1,
    backgroundColor: '#1976D2',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  list: {
    flex: 1,
  },
  listFooter: {
    height: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 15,
    color: '#757575',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    gap: 16,
  },
  errorText: {
    fontSize: 15,
    color: '#D32F2F',
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#1976D2',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: '#9E9E9E',
  },
});
