import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';

interface CompanyUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'hr';
  createdAt: string;
}

interface UseCompanyUsersReturn {
  users: CompanyUser[];
  loading: boolean;
  addUser: (user: Omit<CompanyUser, 'id' | 'createdAt'> & { password: string }) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  updateUser: (userId: string, updates: Partial<CompanyUser>) => Promise<void>;
  loadUsers: () => Promise<void>;
}

export function useCompanyUsers(): UseCompanyUsersReturn {
  const [users, setUsers] = useState<CompanyUser[]>([]);
  const [loading, setLoading] = useState(true);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      
      // Mock data - replace with ToonClient call
      // const response = await CompanyService.getUsers();
      
      setUsers([
        {
          id: '1',
          name: 'Admin User',
          email: 'admin@company.com',
          role: 'admin',
          createdAt: '2024-01-01',
        },
        {
          id: '2',
          name: 'HR Manager',
          email: 'hr@company.com',
          role: 'hr',
          createdAt: '2024-01-15',
        },
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const addUser = async (userData: Omit<CompanyUser, 'id' | 'createdAt'> & { password: string }) => {
    try {
      // await CompanyService.createUser(userData);
      await loadUsers();
      Alert.alert('Success', 'User added successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to add user');
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      // await CompanyService.deleteUser(userId);
      await loadUsers();
      Alert.alert('Success', 'User removed successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to remove user');
    }
  };

  const updateUser = async (userId: string, updates: Partial<CompanyUser>) => {
    try {
      // await CompanyService.updateUser(userId, updates);
      await loadUsers();
      Alert.alert('Success', 'User updated successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to update user');
    }
  };

  return {
    users,
    loading,
    addUser,
    deleteUser,
    updateUser,
    loadUsers,
  };
}
