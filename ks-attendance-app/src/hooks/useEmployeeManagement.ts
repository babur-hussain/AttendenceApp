import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { toonClient } from '../services';
import { API_ENDPOINTS } from '../services/api/config';
import { useAdminSession } from './useAdminSession';

interface Employee {
  id: string;
  name: string;
  email: string;
  department: string;
  hasFaceEnrolled: boolean;
  createdAt: string;
}

interface UseEmployeeManagementReturn {
  employees: Employee[];
  loading: boolean;
  addEmployee: (employee: Omit<Employee, 'id' | 'createdAt' | 'hasFaceEnrolled'>) => Promise<void>;
  removeEmployee: (employeeId: string) => Promise<void>;
  updateEmployee: (employeeId: string, updates: Partial<Employee>) => Promise<void>;
}

export function useEmployeeManagement(): UseEmployeeManagementReturn {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const { companySession, pinSession } = useAdminSession();

  const buildAuthPayload = useCallback(() => {
    if (!companySession) {
      throw new Error('Company session missing');
    }
    if (!pinSession) {
      throw new Error('PIN session expired');
    }

    return {
      COMP1: companySession.companyId,
      SESSION1: companySession.sessionToken,
      PIN1: pinSession.pinSessionToken,
      U1: companySession.managerId,
    };
  }, [companySession, pinSession]);

  const loadEmployees = useCallback(async () => {
    try {
      if (!companySession || !pinSession) {
        return;
      }
      setLoading(true);

      const response: any = await toonClient.toonPost(
        API_ENDPOINTS.EMPLOYEE_LIST,
        {
          ...buildAuthPayload(),
          T1: 'EMPLOYEE_LIST',
        },
        { requireAuth: false }
      );

      const records: Employee[] = Array.isArray(response?.employees)
        ? response.employees.map((record: any) => ({
            id: record.E1 || record.id,
            name: record.E2 || record.name,
            email: record.E3 || record.email,
            department: record.E6 || record.department || 'General',
            hasFaceEnrolled: Boolean(record.ENR ?? record.hasFaceEnrolled),
            createdAt: record.CREATED_AT || record.createdAt || new Date().toISOString(),
          }))
        : [];

      setEmployees(records);
    } catch (error) {
      console.error('Failed to load employees', error);
      Alert.alert('Error', 'Failed to load employees');
    } finally {
      setLoading(false);
    }
  }, [buildAuthPayload, companySession, pinSession]);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  const addEmployee = async (employeeData: Omit<Employee, 'id' | 'createdAt' | 'hasFaceEnrolled'>) => {
    try {
      await toonClient.toonPost(
        API_ENDPOINTS.EMPLOYEE_ENROLL,
        {
          ...buildAuthPayload(),
          T1: 'EMPLOYEE_CREATE',
          E2: employeeData.name,
          E3: employeeData.email,
          E6: employeeData.department,
        },
        { requireAuth: false }
      );
      await loadEmployees();
      Alert.alert('Success', 'Employee added successfully');
    } catch (error) {
      console.error('Failed to add employee', error);
      Alert.alert('Error', 'Failed to add employee');
    }
  };

  const removeEmployee = async (employeeId: string) => {
    try {
      await toonClient.toonPost(
        API_ENDPOINTS.EMPLOYEES.DELETE(employeeId),
        {
          ...buildAuthPayload(),
          T1: 'EMPLOYEE_DELETE',
          E1: employeeId,
        },
        { requireAuth: false }
      );
      await loadEmployees();
      Alert.alert('Success', 'Employee removed successfully');
    } catch (error) {
      console.error('Failed to remove employee', error);
      Alert.alert('Error', 'Failed to remove employee');
    }
  };

  const updateEmployee = async (employeeId: string, updates: Partial<Employee>) => {
    try {
      await toonClient.toonPost(
        API_ENDPOINTS.EMPLOYEE_UPDATE,
        {
          ...buildAuthPayload(),
          T1: 'EMPLOYEE_UPDATE',
          E1: employeeId,
          updates,
        },
        { requireAuth: false }
      );
      await loadEmployees();
      Alert.alert('Success', 'Employee updated successfully');
    } catch (error) {
      console.error('Failed to update employee', error);
      Alert.alert('Error', 'Failed to update employee');
    }
  };

  return {
    employees,
    loading,
    addEmployee,
    removeEmployee,
    updateEmployee,
  };
}
