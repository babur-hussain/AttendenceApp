/**
 * EmployeesManagementScreen - Employee CRUD
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useEmployeeManagement } from '../../hooks';

export default function EmployeesManagementScreen() {
  const { employees, loading, addEmployee, removeEmployee } = useEmployeeManagement();
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('General');

  const resetForm = () => {
    setName('');
    setEmail('');
    setDepartment('General');
  };

  const handleAddEmployee = async () => {
    if (!name.trim()) {
      Alert.alert('Missing info', 'Employee name is required');
      return;
    }
    try {
      await addEmployee({ name: name.trim(), email: email.trim(), department: department.trim() });
      resetForm();
      setShowModal(false);
    } catch (error) {
      console.error('Add employee failed', error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Employees ({employees.length})</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => setShowModal(true)}>
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.addButtonText}>Add</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loaderText}>Loading employees…</Text>
        </View>
      ) : (
        <FlatList
          data={employees}
          keyExtractor={(item) => item.id}
          contentContainerStyle={employees.length === 0 ? styles.emptyList : styles.list}
          ListEmptyComponent={() => (
            <View style={styles.emptyState}>
              <Ionicons name="people-circle-outline" size={56} color="#C0C0C0" />
              <Text style={styles.emptyTitle}>No employees yet</Text>
              <Text style={styles.emptySubtitle}>Add your first employee to get started.</Text>
            </View>
          )}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.content}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.email}>{item.email || 'No email'}</Text>
                <View style={styles.row}>
                  <Text style={styles.label}>Department: {item.department || 'General'}</Text>
                  <Text style={styles.label}>Status: {item.hasFaceEnrolled ? 'Enrolled' : 'Pending'}</Text>
                </View>
              </View>
              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={() => console.log('Navigate to face enrollment for', item.id)}
                >
                  <Ionicons name="scan-outline" size={22} color="#007AFF" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={() =>
                    Alert.alert('Remove employee', `Remove ${item.name}?`, [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Remove',
                        style: 'destructive',
                        onPress: () => removeEmployee(item.id),
                      },
                    ])
                  }
                >
                  <Ionicons name="trash-outline" size={22} color="#FF3B30" />
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      <Modal visible={showModal} animationType="slide" transparent onRequestClose={() => setShowModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Employee</Text>
            <TextInput
              placeholder="Full name"
              value={name}
              onChangeText={setName}
              style={styles.input}
            />
            <TextInput
              placeholder="Email (optional)"
              value={email}
              onChangeText={setEmail}
              style={styles.input}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TextInput
              placeholder="Department"
              value={department}
              onChangeText={setDepartment}
              style={styles.input}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => { setShowModal(false); resetForm(); }}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryButton} onPress={handleAddEmployee}>
                <Text style={styles.primaryText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', paddingTop: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 8 },
  title: { fontSize: 20, fontWeight: '700', color: '#0f172a' },
  addButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#007AFF', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, gap: 6 },
  addButtonText: { color: '#fff', fontWeight: '600' },
  list: { padding: 16 },
  emptyList: { flexGrow: 1, justifyContent: 'center', padding: 32 },
  card: { flexDirection: 'row', backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12, alignItems: 'center' },
  content: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600', color: '#000' },
  email: { fontSize: 14, color: '#666', marginTop: 4 },
  row: { flexDirection: 'row', gap: 16, marginTop: 8, flexWrap: 'wrap' },
  label: { fontSize: 12, color: '#666' },
  actions: { flexDirection: 'row', gap: 12, marginLeft: 12 },
  iconButton: { padding: 4 },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loaderText: { marginTop: 12, color: '#6b7280' },
  emptyState: { alignItems: 'center', gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#111827' },
  emptySubtitle: { fontSize: 14, color: '#6b7280' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 16, padding: 20, gap: 12 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 8 },
  cancelButton: { paddingHorizontal: 16, paddingVertical: 10 },
  cancelText: { color: '#6b7280', fontWeight: '600' },
  primaryButton: { backgroundColor: '#007AFF', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
  primaryText: { color: '#fff', fontWeight: '600' },
});
