/**
 * CompanyUsersScreen - Manage Company Users
 * Add/edit managers, HR, supervisors with role assignment
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCompanyUsers } from '../../hooks/useCompanyUsers';
import { colors, spacing, typography } from '../../theme';

type NewUserState = {
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'hr';
  password: string;
};

export default function CompanyUsersScreen() {
  const { users, loading, addUser, updateUser, deleteUser, loadUsers } = useCompanyUsers();
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUser, setNewUser] = useState<NewUserState>({ name: '', email: '', role: 'manager', password: '' });

  useEffect(() => {
    loadUsers();
  }, []);

  const handleAddUser = async () => {
    if (!newUser.name || !newUser.email || !newUser.password) {
      Alert.alert('Error', 'All fields are required');
      return;
    }
    await addUser(newUser);
    setShowAddModal(false);
    setNewUser({ name: '', email: '', role: 'manager', password: '' });
  };

  const handleDeleteUser = (userId: string) => {
    Alert.alert('Delete User', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteUser(userId) },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.addButton} onPress={() => setShowAddModal(true)}>
          <Ionicons name="add" size={24} color={"#fff"} />
          <Text style={styles.addButtonText}>Add User</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.userCard}>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{item.name}</Text>
              <Text style={styles.userEmail}>{item.email}</Text>
              <View style={styles.roleTag}>
                <Text style={styles.roleText}>{item.role}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => handleDeleteUser(item.id)}>
              <Ionicons name="trash-outline" size={20} color={"#EF4444"} />
            </TouchableOpacity>
          </View>
        )}
      />

      {/* Add User Modal */}
      <Modal visible={showAddModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <Text style={styles.modalTitle}>Add New User</Text>
          <TextInput
            style={styles.input}
            placeholder="Name"
            value={newUser.name}
            onChangeText={(text) => setNewUser({ ...newUser, name: text })}
          />
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={newUser.email}
            onChangeText={(text) => setNewUser({ ...newUser, email: text })}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            value={newUser.password}
            onChangeText={(text) => setNewUser({ ...newUser, password: text })}
            secureTextEntry
          />
          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => setShowAddModal(false)}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalButton, styles.saveButton]} onPress={handleAddUser}>
              <Text style={styles.buttonText}>Add User</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: { padding: 24 },
  addButton: { flexDirection: 'row', backgroundColor: "#007AFF", padding: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  addButtonText: { fontSize: 16, fontWeight: "600", color: "#fff", marginLeft: 12 },
  list: { padding: 24 },
  userCard: { flexDirection: 'row', backgroundColor: "#f5f5f5", padding: 16, borderRadius: 12, marginBottom: 12, alignItems: 'center' },
  userInfo: { flex: 1 },
  userName: { fontSize: 16, color: "#000", fontWeight: '600' },
  userEmail: { fontSize: 12, color: "#999", marginTop: 4 },
  roleTag: { backgroundColor: "#E5F0FF", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 6, marginTop: 8, alignSelf: 'flex-start' },
  roleText: { fontSize: 12, color: "#0051D5" },
  modal: { flex: 1, padding: 24, backgroundColor: "#fff" },
  modalTitle: { fontSize: 24, fontWeight: "700", color: "#000", marginBottom: 24 },
  input: { fontSize: 16, backgroundColor: "#f5f5f5", padding: 16, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: "#e0e0e0" },
  modalButtons: { flexDirection: 'row', gap: 16, marginTop: 24 },
  modalButton: { flex: 1, padding: 16, borderRadius: 12, alignItems: 'center' },
  cancelButton: { backgroundColor: "#f5f5f5" },
  saveButton: { backgroundColor: "#007AFF" },
  buttonText: { fontSize: 16, fontWeight: "600", color: "#fff" },
});
