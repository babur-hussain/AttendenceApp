import { useState, useEffect } from 'react';
import { Alert } from 'react-native';

interface Policy {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  category: 'attendance' | 'security' | 'general';
}

interface UsePoliciesReturn {
  policies: Policy[];
  loading: boolean;
  updatePolicy: (policyId: string, updates: Partial<Policy>) => Promise<void>;
  addPolicy: (policy: Omit<Policy, 'id'>) => Promise<void>;
  removePolicy: (policyId: string) => Promise<void>;
}

export function usePolicies(): UsePoliciesReturn {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPolicies();
  }, []);

  const loadPolicies = async () => {
    try {
      setLoading(true);
      
      // Mock data - replace with ToonClient call
      // const response = await PolicyService.getAllPolicies();
      
      setPolicies([
        {
          id: 'POL001',
          name: 'Late Arrival Grace Period',
          description: '15 minutes grace period before marking late arrival',
          enabled: true,
          category: 'attendance',
        },
        {
          id: 'POL002',
          name: 'Mandatory Face Recognition',
          description: 'Require face recognition for all check-ins',
          enabled: true,
          category: 'security',
        },
        {
          id: 'POL003',
          name: 'Auto Check-out',
          description: 'Automatically check out employees after 12 hours',
          enabled: false,
          category: 'attendance',
        },
        {
          id: 'POL004',
          name: 'Break Time Limit',
          description: 'Maximum 1 hour break per day',
          enabled: true,
          category: 'general',
        },
        {
          id: 'POL005',
          name: 'Liveness Detection',
          description: 'Require liveness check during face recognition',
          enabled: true,
          category: 'security',
        },
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to load policies');
    } finally {
      setLoading(false);
    }
  };

  const updatePolicy = async (policyId: string, updates: Partial<Policy>) => {
    try {
      // await PolicyService.updatePolicy(policyId, updates);
      await loadPolicies();
    } catch (error) {
      Alert.alert('Error', 'Failed to update policy');
    }
  };

  const addPolicy = async (policyData: Omit<Policy, 'id'>) => {
    try {
      // await PolicyService.createPolicy(policyData);
      await loadPolicies();
      Alert.alert('Success', 'Policy added successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to add policy');
    }
  };

  const removePolicy = async (policyId: string) => {
    try {
      // await PolicyService.deletePolicy(policyId);
      await loadPolicies();
      Alert.alert('Success', 'Policy removed successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to remove policy');
    }
  };

  return {
    policies,
    loading,
    updatePolicy,
    addPolicy,
    removePolicy,
  };
}
