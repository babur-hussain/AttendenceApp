/**
 * EnrollmentDebug
 * QA and developer tools for testing enrollment flow
 * 
 * Features:
 * - View stored enrollments (embeddings masked)
 * - View queued payloads
 * - Force quality scenarios
 * - Mock mode toggles
 * - Clear local data
 * - Export logs
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { setMockMode, isMockMode } from '../../biometric/FacePipeline';

interface StoredEnrollment {
  employeeId: string;
  timestamp: number;
  embeddingLength: number;
  quality: number;
}

export const EnrollmentDebug: React.FC = () => {
  const [mockMode, setMockModeState] = useState(false);
  const [storedEnrollments, setStoredEnrollments] = useState<StoredEnrollment[]>([]);
  const [queuedPayloads, setQueuedPayloads] = useState<any[]>([]);
  const [forceScenario, setForceScenario] = useState<string>('none');

  /**
   * Load debug data on mount
   */
  useEffect(() => {
    loadDebugData();
    setMockModeState(isMockMode());
  }, []);

  /**
   * Load stored enrollments and queued payloads
   */
  const loadDebugData = async () => {
    try {
      // Load stored enrollments
      const enrollmentsJson = await SecureStore.getItemAsync('stored_enrollments');
      if (enrollmentsJson) {
        const enrollments = JSON.parse(enrollmentsJson);
        setStoredEnrollments(enrollments);
      } else {
        setStoredEnrollments([]);
      }

      // Load queued payloads
      const queueJson = await SecureStore.getItemAsync('enrollment_queue');
      if (queueJson) {
        const queue = JSON.parse(queueJson);
        setQueuedPayloads(queue);
      } else {
        setQueuedPayloads([]);
      }
    } catch (err) {
      console.error('Failed to load debug data:', err);
    }
  };

  /**
   * Toggle mock mode
   */
  const handleToggleMockMode = (value: boolean) => {
    setMockMode(value);
    setMockModeState(value);
    Alert.alert(
      'Mock Mode',
      value
        ? 'Mock mode enabled. Biometric operations will use deterministic test data.'
        : 'Mock mode disabled. Real biometric operations will be attempted.',
      [{ text: 'OK' }]
    );
  };

  /**
   * Clear all local data
   */
  const handleClearData = () => {
    Alert.alert(
      'Clear All Data',
      'This will delete all locally stored enrollments and queued payloads. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await SecureStore.deleteItemAsync('stored_enrollments');
              await SecureStore.deleteItemAsync('enrollment_queue');
              setStoredEnrollments([]);
              setQueuedPayloads([]);
              Alert.alert('Success', 'All local data cleared');
            } catch (err) {
              console.error('Failed to clear data:', err);
              Alert.alert('Error', 'Failed to clear data');
            }
          },
        },
      ]
    );
  };

  /**
   * Force quality scenario
   */
  const handleForceScenario = (scenario: string) => {
    setForceScenario(scenario);
    Alert.alert(
      'Quality Scenario',
      `Forced scenario: ${scenario}\n\nThis will affect the next capture operation.`,
      [{ text: 'OK' }]
    );
  };

  /**
   * Export logs (mock)
   */
  const handleExportLogs = () => {
    Alert.alert(
      'Export Logs',
      'Log export functionality would export enrollment logs, quality metrics, and error traces to a file.',
      [{ text: 'OK' }]
    );
  };

  /**
   * View embedding details (masked)
   */
  const handleViewEmbedding = (enrollment: StoredEnrollment) => {
    Alert.alert(
      'Embedding Details',
      `Employee ID: ${enrollment.employeeId}\nTimestamp: ${new Date(enrollment.timestamp).toLocaleString()}\nEmbedding Length: ${enrollment.embeddingLength} dimensions\nQuality: ${enrollment.quality}\n\nNote: Actual embedding data is encrypted and not displayed for security.`,
      [{ text: 'OK' }]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>🛠️ Enrollment Debug</Text>
        <Text style={styles.subtitle}>QA Tools & Developer Settings</Text>
      </View>

      {/* Mock Mode Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Mock Mode</Text>
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Use Mock Biometric Data</Text>
            <Text style={styles.settingDescription}>
              Generate deterministic test data instead of real ML operations
            </Text>
          </View>
          <Switch
            value={mockMode}
            onValueChange={handleToggleMockMode}
            trackColor={{ false: '#ccc', true: '#34c759' }}
            thumbColor="#fff"
          />
        </View>
      </View>

      {/* Stored Enrollments Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Stored Enrollments ({storedEnrollments.length})
        </Text>
        {storedEnrollments.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>No stored enrollments</Text>
          </View>
        ) : (
          storedEnrollments.map((enrollment, index) => (
            <TouchableOpacity
              key={index}
              style={styles.itemBox}
              onPress={() => handleViewEmbedding(enrollment)}
            >
              <View style={styles.itemHeader}>
                <Text style={styles.itemTitle}>{enrollment.employeeId}</Text>
                <Text style={styles.itemBadge}>Q: {enrollment.quality}</Text>
              </View>
              <Text style={styles.itemSubtitle}>
                {new Date(enrollment.timestamp).toLocaleString()}
              </Text>
              <Text style={styles.itemDetail}>
                {enrollment.embeddingLength}D embedding (encrypted)
              </Text>
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* Queued Payloads Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Queued Payloads ({queuedPayloads.length})
        </Text>
        {queuedPayloads.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>No queued payloads</Text>
          </View>
        ) : (
          queuedPayloads.map((payload, index) => (
            <View key={index} style={styles.itemBox}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemTitle}>Payload #{index + 1}</Text>
                <Text style={styles.itemBadge}>📤 Pending</Text>
              </View>
              <Text style={styles.itemDetail}>
                Created: {new Date(payload.timestamp || Date.now()).toLocaleString()}
              </Text>
            </View>
          ))
        )}
      </View>

      {/* Force Quality Scenarios */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Force Quality Scenarios</Text>
        <View style={styles.scenarioGrid}>
          <TouchableOpacity
            style={[
              styles.scenarioButton,
              forceScenario === 'none' && styles.scenarioButtonActive,
            ]}
            onPress={() => handleForceScenario('none')}
          >
            <Text style={styles.scenarioButtonText}>Normal</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.scenarioButton,
              forceScenario === 'low_light' && styles.scenarioButtonActive,
            ]}
            onPress={() => handleForceScenario('low_light')}
          >
            <Text style={styles.scenarioButtonText}>Low Light</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.scenarioButton,
              forceScenario === 'blur' && styles.scenarioButtonActive,
            ]}
            onPress={() => handleForceScenario('blur')}
          >
            <Text style={styles.scenarioButtonText}>Blur</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.scenarioButton,
              forceScenario === 'bad_pose' && styles.scenarioButtonActive,
            ]}
            onPress={() => handleForceScenario('bad_pose')}
          >
            <Text style={styles.scenarioButtonText}>Bad Pose</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.scenarioButton,
              forceScenario === 'occlusion' && styles.scenarioButtonActive,
            ]}
            onPress={() => handleForceScenario('occlusion')}
          >
            <Text style={styles.scenarioButtonText}>Occlusion</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.scenarioButton,
              forceScenario === 'perfect' && styles.scenarioButtonActive,
            ]}
            onPress={() => handleForceScenario('perfect')}
          >
            <Text style={styles.scenarioButtonText}>Perfect</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.scenarioHint}>
          Active scenario: <Text style={styles.scenarioHintBold}>{forceScenario}</Text>
        </Text>
      </View>

      {/* Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Actions</Text>
        <TouchableOpacity style={styles.actionButton} onPress={loadDebugData}>
          <Text style={styles.actionButtonText}>🔄 Refresh Data</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={handleExportLogs}>
          <Text style={styles.actionButtonText}>📋 Export Logs</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.actionButtonDanger]}
          onPress={handleClearData}
        >
          <Text style={[styles.actionButtonText, styles.actionButtonDangerText]}>
            🗑️ Clear All Data
          </Text>
        </TouchableOpacity>
      </View>

      {/* Info */}
      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          ⚠️ This screen is for QA and development only. Do not use in production.
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
    paddingBottom: 40,
  },
  
  // Header
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 24,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#666',
  },
  
  // Section
  section: {
    marginTop: 16,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  
  // Setting Row
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  settingInfo: {
    flex: 1,
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
  
  // Empty Box
  emptyBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: '#999',
  },
  
  // Item Box
  itemBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  itemBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: '#007AFF',
    backgroundColor: '#007AFF20',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  itemSubtitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  itemDetail: {
    fontSize: 11,
    color: '#999',
  },
  
  // Scenario Grid
  scenarioGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  scenarioButton: {
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  scenarioButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  scenarioButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  scenarioHint: {
    fontSize: 12,
    color: '#666',
  },
  scenarioHintBold: {
    fontWeight: '600',
    color: '#007AFF',
  },
  
  // Action Button
  actionButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  actionButtonDanger: {
    borderColor: '#ff3b30',
  },
  actionButtonDangerText: {
    color: '#ff3b30',
  },
  
  // Info Box
  infoBox: {
    marginHorizontal: 24,
    marginTop: 16,
    backgroundColor: '#FFF3CD',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#FF9500',
  },
  infoText: {
    fontSize: 12,
    color: '#856404',
    lineHeight: 18,
  },
});
