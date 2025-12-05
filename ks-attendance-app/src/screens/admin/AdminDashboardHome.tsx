/**
 * AdminDashboardHome - Main Admin Dashboard
 * Central hub for all management operations
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAdminSession } from '../../hooks';

interface DashboardCard {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  route: string;
  description: string;
}

const dashboardCards: DashboardCard[] = [
  {
    title: 'Company Users',
    icon: 'people-outline',
    color: "#007AFF",
    route: 'CompanyUsers',
    description: 'Manage admins, managers, and HR staff',
  },
  {
    title: 'Employees',
    icon: 'person-outline',
    color: "#34C759",
    route: 'EmployeesManagement',
    description: 'Add, edit, and manage employees',
  },
  {
    title: 'Face Enrollment',
    icon: 'scan-outline',
    color: "#FF9500",
    route: 'FaceEnrollment',
    description: 'Register employee faces',
  },
  {
    title: 'Devices',
    icon: 'tablet-portrait-outline',
    color: "#5AC8FA",
    route: 'DeviceManagement',
    description: 'Configure kiosk terminals',
  },
  {
    title: 'Policies',
    icon: 'document-text-outline',
    color: "#5856D6",
    route: 'Policies',
    description: 'Set attendance rules and thresholds',
  },
  {
    title: 'Reports',
    icon: 'bar-chart-outline',
    color: "#EF4444",
    route: 'Reports',
    description: 'View analytics and export data',
  },
];

export default function AdminDashboardHome() {
  const navigation = useNavigation<any>();
  const { companySession, setPinSession, clearCompanySession } = useAdminSession();

  const handleLockDashboard = async () => {
    await setPinSession(null);
    navigation.reset({ index: 0, routes: [{ name: 'FaceScannerHome' }] });
  };

  const handleCompanyLogout = async () => {
    await clearCompanySession();
    navigation.reset({ index: 0, routes: [{ name: 'CompanyLogin' }] });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={["#0051D5", "#007AFF"]}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.welcomeText}>Welcome back,</Text>
            <Text style={styles.userName}>{companySession?.managerName || 'Manager'}</Text>
            <Text style={styles.userRole}>{companySession?.companyName}</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.lockButton} onPress={handleLockDashboard}>
              <Ionicons name="lock-closed-outline" size={22} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.logoutButton} onPress={handleCompanyLogout}>
              <Ionicons name="log-out-outline" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      {/* Dashboard Cards */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.grid}>
          {dashboardCards.map((card, index) => (
            <TouchableOpacity
              key={index}
              style={styles.card}
              onPress={() => navigation.navigate(card.route as any)}
              activeOpacity={0.7}
            >
              <View style={[styles.cardIconContainer, { backgroundColor: card.color }]}>
                <Ionicons name={card.icon} size={32} color="#fff" />
              </View>
              <Text style={styles.cardTitle}>{card.title}</Text>
              <Text style={styles.cardDescription}>{card.description}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Quick Stats */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Quick Stats</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>24</Text>
              <Text style={styles.statLabel}>Active Employees</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>3</Text>
              <Text style={styles.statLabel}>Devices</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>18</Text>
              <Text style={styles.statLabel}>Present Today</Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('FaceScannerHome')}
          >
            <Ionicons name="scan-outline" size={20} color="#007AFF" />
            <Text style={styles.actionButtonText}>Back to Face Scanner</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('AttendanceHistory')}
          >
            <Ionicons name="time-outline" size={20} color="#007AFF" />
            <Text style={styles.actionButtonText}>View Attendance History</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    paddingTop: 20,
    paddingBottom: 32,
    paddingHorizontal: 24,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  welcomeText: {
    fontSize: 16,
    color: "#fff",
    opacity: 0.9,
  },
  userName: {
    fontSize: 32, fontWeight: "700",
    color: "#fff",
    marginTop: 8,
  },
  userRole: {
    fontSize: 12,
    color: "#fff",
    opacity: 0.8,
    marginTop: 4,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  lockButton: {
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 8,
  },
  logoutButton: {
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 24,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 32,
  },
  card: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: "#f5f5f5",
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  cardIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 20, fontWeight: "600",
    color: "#000",
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 12,
    color: "#999",
  },
  statsSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 24, fontWeight: "700",
    color: "#000",
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  statValue: {
    fontSize: 32, fontWeight: "700",
    color: "#007AFF",
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 12,
    color: "#999",
    textAlign: 'center',
  },
  actionsSection: {
    marginBottom: 32,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: "#f5f5f5",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  actionButtonText: {
    fontSize: 16,
    color: "#000",
    marginLeft: 16,
  },
});
