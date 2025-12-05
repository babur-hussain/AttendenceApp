import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { AttendanceService } from '../services';

interface Employee {
  id: string;
  name: string;
  email: string;
  department: string;
  photo?: string;
}

interface TodayAttendance {
  checkIn?: string;
  checkOut?: string;
  breaks: Array<{ start: string; end?: string }>;
  status: 'not-started' | 'checked-in' | 'on-break' | 'checked-out';
}

interface UseEmployeeProfileReturn {
  employee: Employee | null;
  todayAttendance: TodayAttendance | null;
  loading: boolean;
  checkIn: () => Promise<void>;
  checkOut: () => Promise<void>;
  startBreak: () => Promise<void>;
  endBreak: () => Promise<void>;
}

export function useEmployeeProfile(employeeId: string): UseEmployeeProfileReturn {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [todayAttendance, setTodayAttendance] = useState<TodayAttendance | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEmployeeData();
  }, [employeeId]);

  const loadEmployeeData = async () => {
    try {
      setLoading(true);
      
      // Mock data - replace with ToonClient calls
      setEmployee({
        id: employeeId,
        name: 'John Doe',
        email: 'john.doe@company.com',
        department: 'Engineering',
      });

      setTodayAttendance({
        checkIn: '09:00 AM',
        breaks: [],
        status: 'checked-in',
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to load employee data');
    } finally {
      setLoading(false);
    }
  };

  const checkIn = async () => {
    try {
      // await AttendanceService.checkIn(employeeId);
      await loadEmployeeData();
      Alert.alert('Success', 'Checked in successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to check in');
    }
  };

  const checkOut = async () => {
    try {
      // await AttendanceService.checkOut(employeeId);
      await loadEmployeeData();
      Alert.alert('Success', 'Checked out successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to check out');
    }
  };

  const startBreak = async () => {
    try {
      // await AttendanceService.startBreak(employeeId);
      await loadEmployeeData();
      Alert.alert('Success', 'Break started');
    } catch (error) {
      Alert.alert('Error', 'Failed to start break');
    }
  };

  const endBreak = async () => {
    try {
      // await AttendanceService.endBreak(employeeId);
      await loadEmployeeData();
      Alert.alert('Success', 'Break ended');
    } catch (error) {
      Alert.alert('Error', 'Failed to end break');
    }
  };

  return {
    employee,
    todayAttendance,
    loading,
    checkIn,
    checkOut,
    startBreak,
    endBreak,
  };
}
