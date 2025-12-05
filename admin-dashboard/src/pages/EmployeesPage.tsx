import React, { useState } from 'react';
import { Card, Button } from '../components/common';
import { EmployeeFormModal, EmployeeDetailsPanel } from '../components/employees';
import { useEmployees } from '../hooks/useEmployees';
import type { Employee } from '../types/employee';

export const EmployeesPage: React.FC = () => {
  const {
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
  } = useEmployees();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [searchInput, setSearchInput] = useState('');

  const handleViewDetails = (employee: Employee) => {
    setSelectedEmployee(employee);
    setShowDetailsModal(true);
  };

  const handleEdit = (employee: Employee) => {
    setSelectedEmployee(employee);
    setShowEditModal(true);
  };

  const handleEditFromDetails = () => {
    setShowDetailsModal(false);
    setShowEditModal(true);
  };

  const handleDelete = async (employee: Employee) => {
    if (window.confirm(`Are you sure you want to delete ${employee.E2}?`)) {
      await deleteEmployee(employee.E1);
    }
  };

  const handleSearch = () => {
    search(searchInput);
  };

  const pageSize = 20;
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div>
      <h1>Employees</h1>

      {error && (
        <div style={{ padding: '12px', backgroundColor: '#ffebee', color: '#c62828', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      <Card title="Employee Management">
        <div style={{ marginBottom: '16px', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Search by name..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            style={{
              flex: 1,
              padding: '8px',
              border: '1px solid #ccc',
              borderRadius: '4px',
            }}
          />
          <Button onClick={handleSearch} disabled={loading}>
            Search
          </Button>
          <Button onClick={() => setShowAddModal(true)}>
            Add Employee
          </Button>
          <Button variant="secondary" onClick={refresh} disabled={loading}>
            {loading ? 'Loading...' : 'Refresh'}
          </Button>
        </div>

        {loading && <p>Loading employees...</p>}

        {!loading && employees.length === 0 && (
          <p style={{ textAlign: 'center', color: '#999', padding: '32px' }}>
            No employees found. {searchQuery && 'Try a different search or '}
            <button
              onClick={() => setShowAddModal(true)}
              style={{ color: '#007bff', cursor: 'pointer', border: 'none', background: 'none', textDecoration: 'underline' }}
            >
              add your first employee
            </button>
            .
          </p>
        )}

        {!loading && employees.length > 0 && (
          <>
            <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ccc' }}>
              <thead>
                <tr style={{ backgroundColor: '#f5f5f5' }}>
                  <th style={{ padding: '8px', border: '1px solid #ccc', textAlign: 'left' }}>ID (E1)</th>
                  <th style={{ padding: '8px', border: '1px solid #ccc', textAlign: 'left' }}>Name (E2)</th>
                  <th style={{ padding: '8px', border: '1px solid #ccc', textAlign: 'left' }}>Email (E3)</th>
                  <th style={{ padding: '8px', border: '1px solid #ccc', textAlign: 'left' }}>Role (E5)</th>
                  <th style={{ padding: '8px', border: '1px solid #ccc', textAlign: 'left' }}>Status (S1)</th>
                  <th style={{ padding: '8px', border: '1px solid #ccc', textAlign: 'left' }}>Biometrics</th>
                  <th style={{ padding: '8px', border: '1px solid #ccc', textAlign: 'left' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((employee) => (
                  <tr key={employee.E1}>
                    <td style={{ padding: '8px', border: '1px solid #ccc' }}>{employee.E1}</td>
                    <td style={{ padding: '8px', border: '1px solid #ccc' }}>{employee.E2}</td>
                    <td style={{ padding: '8px', border: '1px solid #ccc' }}>{employee.E3 || '-'}</td>
                    <td style={{ padding: '8px', border: '1px solid #ccc' }}>{employee.E5 || '-'}</td>
                    <td style={{ padding: '8px', border: '1px solid #ccc' }}>
                      <span
                        style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          backgroundColor: employee.S1 === 'active' ? '#d4edda' : '#f8d7da',
                          color: employee.S1 === 'active' ? '#155724' : '#721c24',
                          fontSize: '12px',
                        }}
                      >
                        {employee.S1}
                      </span>
                    </td>
                    <td style={{ padding: '8px', border: '1px solid #ccc' }}>
                      {employee.F2 && <span style={{ color: 'green', marginRight: '8px' }}>Face✓</span>}
                      {employee.FP1 && <span style={{ color: 'green' }}>Fingerprint✓</span>}
                      {!employee.F2 && !employee.FP1 && <span style={{ color: '#999' }}>None</span>}
                    </td>
                    <td style={{ padding: '8px', border: '1px solid #ccc' }}>
                      <button
                        onClick={() => handleViewDetails(employee)}
                        style={{ marginRight: '4px', padding: '4px 8px', cursor: 'pointer' }}
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleEdit(employee)}
                        style={{ marginRight: '4px', padding: '4px 8px', cursor: 'pointer' }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(employee)}
                        style={{ padding: '4px 8px', cursor: 'pointer', color: 'red' }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'center', gap: '8px', alignItems: 'center' }}>
                <Button
                  variant="secondary"
                  onClick={() => goToPage(page - 1)}
                  disabled={page === 1 || loading}
                >
                  Previous
                </Button>
                <span>
                  Page {page} of {totalPages} ({total} total)
                </span>
                <Button
                  variant="secondary"
                  onClick={() => goToPage(page + 1)}
                  disabled={page === totalPages || loading}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </Card>

      <EmployeeFormModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={addEmployee}
        mode="add"
      />

      <EmployeeFormModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedEmployee(null);
        }}
        onSave={(data) => updateEmployee(selectedEmployee?.E1 || '', data)}
        employee={selectedEmployee}
        mode="edit"
      />

      <EmployeeDetailsPanel
        employeeId={selectedEmployee?.E1 || null}
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedEmployee(null);
        }}
        onEdit={handleEditFromDetails}
      />
    </div>
  );
};
