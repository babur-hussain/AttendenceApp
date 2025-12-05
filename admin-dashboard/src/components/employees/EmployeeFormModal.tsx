import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import type { Employee, EmployeeFormData } from '../../types/employee';

interface EmployeeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: EmployeeFormData) => Promise<boolean>;
  employee?: Employee | null;
  mode: 'add' | 'edit';
}

export const EmployeeFormModal: React.FC<EmployeeFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  employee,
  mode,
}) => {
  const [formData, setFormData] = useState<EmployeeFormData>({
    E2: '',
    E3: '',
    E4: '',
    E5: '',
    S1: 'active',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (mode === 'edit' && employee) {
      setFormData({
        E2: employee.E2 || '',
        E3: employee.E3 || '',
        E4: employee.E4 || '',
        E5: employee.E5 || '',
        S1: employee.S1 || 'active',
      });
    } else {
      setFormData({
        E2: '',
        E3: '',
        E4: '',
        E5: '',
        S1: 'active',
      });
    }
    setError('');
  }, [mode, employee, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.E2.trim()) {
      setError('Name is required');
      return;
    }

    setSaving(true);
    try {
      const success = await onSave(formData);
      if (success) {
        onClose();
      } else {
        setError('Failed to save employee');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save employee');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof EmployeeFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'add' ? 'Add New Employee' : 'Edit Employee'}
    >
      <form onSubmit={handleSubmit}>
        {error && (
          <div style={{ padding: '12px', backgroundColor: '#ffebee', color: '#c62828', marginBottom: '16px' }}>
            {error}
          </div>
        )}

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
            Name (E2) *
          </label>
          <input
            type="text"
            value={formData.E2}
            onChange={(e) => handleChange('E2', e.target.value)}
            style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
            required
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
            Email (E3)
          </label>
          <input
            type="email"
            value={formData.E3}
            onChange={(e) => handleChange('E3', e.target.value)}
            style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
            Phone (E4)
          </label>
          <input
            type="tel"
            value={formData.E4}
            onChange={(e) => handleChange('E4', e.target.value)}
            style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
            Role (E5)
          </label>
          <input
            type="text"
            value={formData.E5}
            onChange={(e) => handleChange('E5', e.target.value)}
            style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
            placeholder="e.g., Manager, Developer, Staff"
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
            Status (S1)
          </label>
          <select
            value={formData.S1}
            onChange={(e) => handleChange('S1', e.target.value)}
            style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
