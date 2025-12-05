import { useState, useEffect, useCallback } from 'react';
import { ToonClient } from '../toon';
import type { Employee, EmployeeDetails, EmployeeFormData } from '../types/employee';

const toonClient = new ToonClient({ baseURL: '/api' });

/**
 * Hook for managing employees list
 */
export function useEmployees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');

  const loadEmployees = useCallback(async (currentPage: number = page, search: string = searchQuery) => {
    setLoading(true);
    setError('');

    try {
      // Build query params as TOON
      const queryParams = new URLSearchParams();
      queryParams.set('PAGE', currentPage.toString());
      queryParams.set('PAGE_SIZE', '20');
      if (search) {
        queryParams.set('SEARCH', search);
      }

      const response = await toonClient.toonGet(`/employees?${queryParams.toString()}`);
      
      // Parse response
      const employeesData: Employee[] = [];
      
      if (response.EMPLOYEES) {
        // EMPLOYEES is a batch of employee records separated by ||
        const employeeStrings = response.EMPLOYEES.split('||');
        for (const empStr of employeeStrings) {
          if (empStr.trim()) {
            const emp = parseEmployeeFromToon(empStr);
            employeesData.push(emp);
          }
        }
      }

      setEmployees(employeesData);
      setTotal(response.TOTAL || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load employees');
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery]);

  const addEmployee = async (formData: EmployeeFormData): Promise<boolean> => {
    try {
      const response = await toonClient.toonPost('/employees', formData);
      if (response.E1) {
        await loadEmployees();
        return true;
      }
      throw new Error(response.ERR || 'Failed to add employee');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add employee');
      return false;
    }
  };

  const updateEmployee = async (id: string, formData: EmployeeFormData): Promise<boolean> => {
    try {
      const response = await toonClient.toonPut(`/employees/${id}`, formData);
      if (response.E1) {
        await loadEmployees();
        return true;
      }
      throw new Error(response.ERR || 'Failed to update employee');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update employee');
      return false;
    }
  };

  const deleteEmployee = async (id: string): Promise<boolean> => {
    try {
      const response = await toonClient.toonPost(`/employees/${id}/delete`, {});
      if (response.S1 === 'deleted') {
        await loadEmployees();
        return true;
      }
      throw new Error(response.ERR || 'Failed to delete employee');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete employee');
      return false;
    }
  };

  const refresh = () => {
    loadEmployees(page, searchQuery);
  };

  const search = (query: string) => {
    setSearchQuery(query);
    setPage(1);
    loadEmployees(1, query);
  };

  const goToPage = (newPage: number) => {
    setPage(newPage);
    loadEmployees(newPage, searchQuery);
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  return {
    employees,
    loading,
    error,
    total,
    page,
    searchQuery,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    refresh,
    search,
    goToPage,
  };
}

/**
 * Hook for managing single employee details
 */
export function useEmployeeDetails(employeeId: string | null) {
  const [employee, setEmployee] = useState<EmployeeDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const loadEmployee = useCallback(async (id: string) => {
    setLoading(true);
    setError('');

    try {
      const response = await toonClient.toonGet(`/employees/${id}`);
      setEmployee(response as EmployeeDetails);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load employee details');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (employeeId) {
      loadEmployee(employeeId);
    } else {
      setEmployee(null);
    }
  }, [employeeId, loadEmployee]);

  return { employee, loading, error, refresh: () => employeeId && loadEmployee(employeeId) };
}

/**
 * Helper to parse employee from TOON string
 */
function parseEmployeeFromToon(toonStr: string): Employee {
  const tokens = toonStr.split('|');
  const employee: any = {};

  for (const token of tokens) {
    const [key, value] = token.split(':');
    if (key && value !== undefined) {
      // Parse booleans
      if (value === 'true') employee[key] = true;
      else if (value === 'false') employee[key] = false;
      else employee[key] = value;
    }
  }

  return employee as Employee;
}
