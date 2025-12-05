import React from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { useEmployeeDetails } from '../../hooks/useEmployees';

interface EmployeeDetailsPanelProps {
  employeeId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: () => void;
}

export const EmployeeDetailsPanel: React.FC<EmployeeDetailsPanelProps> = ({
  employeeId,
  isOpen,
  onClose,
  onEdit,
}) => {
  const { employee, loading, error } = useEmployeeDetails(employeeId);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Employee Details">
      {loading && <p>Loading employee details...</p>}
      
      {error && (
        <div style={{ padding: '12px', backgroundColor: '#ffebee', color: '#c62828', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      {employee && !loading && (
        <div>
          <div style={{ marginBottom: '24px' }}>
            <h3>Basic Information</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                <tr style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '8px', fontWeight: 'bold' }}>Employee ID (E1)</td>
                  <td style={{ padding: '8px' }}>{employee.E1}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '8px', fontWeight: 'bold' }}>Name (E2)</td>
                  <td style={{ padding: '8px' }}>{employee.E2}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '8px', fontWeight: 'bold' }}>Email (E3)</td>
                  <td style={{ padding: '8px' }}>{employee.E3 || '-'}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '8px', fontWeight: 'bold' }}>Phone (E4)</td>
                  <td style={{ padding: '8px' }}>{employee.E4 || '-'}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '8px', fontWeight: 'bold' }}>Role (E5)</td>
                  <td style={{ padding: '8px' }}>{employee.E5 || '-'}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '8px', fontWeight: 'bold' }}>Status (S1)</td>
                  <td style={{ padding: '8px' }}>
                    <span
                      style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        backgroundColor: employee.S1 === 'active' ? '#d4edda' : '#f8d7da',
                        color: employee.S1 === 'active' ? '#155724' : '#721c24',
                      }}
                    >
                      {employee.S1}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <h3>Biometric Enrollment Status</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                <tr style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '8px', fontWeight: 'bold' }}>Face Embeddings (F2)</td>
                  <td style={{ padding: '8px' }}>
                    {employee.F2 ? (
                      <span style={{ color: 'green' }}>✓ Enrolled</span>
                    ) : (
                      <span style={{ color: 'red' }}>✗ Not Enrolled</span>
                    )}
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '8px', fontWeight: 'bold' }}>Fingerprint Data (FP1)</td>
                  <td style={{ padding: '8px' }}>
                    {employee.FP1 ? (
                      <span style={{ color: 'green' }}>✓ Enrolled</span>
                    ) : (
                      <span style={{ color: 'red' }}>✗ Not Enrolled</span>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {(employee.D1 || employee.D2) && (
            <div style={{ marginBottom: '24px' }}>
              <h3>Device Enrollment</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  {employee.D1 && (
                    <tr style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '8px', fontWeight: 'bold' }}>Device ID (D1)</td>
                      <td style={{ padding: '8px' }}>{employee.D1}</td>
                    </tr>
                  )}
                  {employee.D2 && (
                    <tr style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '8px', fontWeight: 'bold' }}>Device Type (D2)</td>
                      <td style={{ padding: '8px' }}>{employee.D2}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          <div style={{ marginBottom: '24px' }}>
            <h3>Attendance Statistics</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                <tr style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '8px', fontWeight: 'bold' }}>Total Events</td>
                  <td style={{ padding: '8px' }}>{employee.TOTAL_EVENTS || 0}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '8px', fontWeight: 'bold' }}>Last Event</td>
                  <td style={{ padding: '8px' }}>{employee.LAST_EVENT || '-'}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '8px', fontWeight: 'bold' }}>Last Attendance (M2)</td>
                  <td style={{ padding: '8px' }}>
                    {employee.M2 ? new Date(employee.M2).toLocaleString() : '-'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <h3>Metadata</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                <tr style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '8px', fontWeight: 'bold' }}>Created (M1)</td>
                  <td style={{ padding: '8px' }}>
                    {employee.M1 ? new Date(employee.M1).toLocaleString() : '-'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            {onEdit && (
              <Button onClick={onEdit}>Edit Employee</Button>
            )}
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};
