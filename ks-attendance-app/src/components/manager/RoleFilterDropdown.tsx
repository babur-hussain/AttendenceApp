/**
 * RoleFilterDropdown - Role Filter Dropdown Component
 * 
 * Dropdown for filtering by employee role
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';

interface RoleFilterDropdownProps {
  selectedRole: string | undefined;
  onSelectRole: (role: string | undefined) => void;
  roles?: string[];
}

const DEFAULT_ROLES = ['Manager', 'Team Lead', 'Staff', 'Intern', 'Contractor'];

export const RoleFilterDropdown: React.FC<RoleFilterDropdownProps> = ({
  selectedRole,
  onSelectRole,
  roles = DEFAULT_ROLES,
}) => {
  const [visible, setVisible] = useState(false);

  const handleSelect = (role: string | undefined) => {
    onSelectRole(role);
    setVisible(false);
  };

  return (
    <View>
      <TouchableOpacity style={styles.button} onPress={() => setVisible(true)}>
        <Text style={styles.buttonText}>
          {selectedRole ? `Role: ${selectedRole}` : 'All Roles'}
        </Text>
        <Text style={styles.arrow}>▼</Text>
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="fade">
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setVisible(false)}
        >
          <View style={styles.menu}>
            <ScrollView>
              <TouchableOpacity
                style={[styles.option, !selectedRole && styles.selectedOption]}
                onPress={() => handleSelect(undefined)}
              >
                <Text style={styles.optionText}>All Roles</Text>
              </TouchableOpacity>

              {roles.map((role) => (
                <TouchableOpacity
                  key={role}
                  style={[styles.option, selectedRole === role && styles.selectedOption]}
                  onPress={() => handleSelect(role)}
                >
                  <Text style={styles.optionText}>{role}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    gap: 8,
  },
  buttonText: {
    flex: 1,
    fontSize: 14,
    color: '#424242',
  },
  arrow: {
    fontSize: 10,
    color: '#757575',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  menu: {
    backgroundColor: '#fff',
    borderRadius: 12,
    maxHeight: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  option: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  selectedOption: {
    backgroundColor: '#E3F2FD',
  },
  optionText: {
    fontSize: 15,
    color: '#212121',
  },
});
