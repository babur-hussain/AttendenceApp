import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePolicies } from '../../hooks';

interface Policy {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  category: 'attendance' | 'security' | 'general';
}

export default function PoliciesScreen() {
  const { policies, loading, updatePolicy } = usePolicies();

  const handleTogglePolicy = async (policyId: string, enabled: boolean) => {
    Alert.alert(
      enabled ? 'Enable Policy' : 'Disable Policy',
      'Are you sure you want to change this policy?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            await updatePolicy(policyId, { enabled });
          },
        },
      ]
    );
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'attendance':
        return 'time-outline';
      case 'security':
        return 'shield-checkmark-outline';
      case 'general':
        return 'settings-outline';
      default:
        return 'document-outline';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'attendance':
        return '#007AFF';
      case 'security':
        return '#FF3B30';
      case 'general':
        return '#34C759';
      default:
        return '#666';
    }
  };

  const renderPolicy = ({ item }: { item: Policy }) => (
    <View style={styles.policyCard}>
      <View style={styles.policyHeader}>
        <View
          style={[
            styles.categoryIcon,
            { backgroundColor: getCategoryColor(item.category) + '20' },
          ]}
        >
          <Ionicons
            name={getCategoryIcon(item.category) as any}
            size={24}
            color={getCategoryColor(item.category)}
          />
        </View>
        <View style={styles.policyInfo}>
          <Text style={styles.policyName}>{item.name}</Text>
          <Text style={styles.policyCategory}>{item.category}</Text>
        </View>
        <Switch
          value={item.enabled}
          onValueChange={(value) => handleTogglePolicy(item.id, value)}
          trackColor={{ false: '#ddd', true: '#007AFF' }}
          thumbColor="#fff"
        />
      </View>
      <Text style={styles.policyDescription}>{item.description}</Text>
    </View>
  );

  const renderCategoryHeader = (category: string) => (
    <View style={styles.categoryHeader}>
      <Text style={styles.categoryTitle}>{category.toUpperCase()}</Text>
    </View>
  );

  const groupedPolicies = policies.reduce((acc, policy) => {
    if (!acc[policy.category]) {
      acc[policy.category] = [];
    }
    acc[policy.category].push(policy);
    return acc;
  }, {} as Record<string, Policy[]>);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Policies</Text>
        <View style={styles.statsContainer}>
          <Text style={styles.statsText}>
            {policies.filter((p) => p.enabled).length} / {policies.length} active
          </Text>
        </View>
      </View>

      {loading ? (
        <Text style={styles.loadingText}>Loading policies...</Text>
      ) : (
        <FlatList
          data={Object.keys(groupedPolicies)}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.listContent}
          renderItem={({ item: category }) => (
            <View>
              {renderCategoryHeader(category)}
              {groupedPolicies[category].map((policy) => (
                <View key={policy.id}>{renderPolicy({ item: policy })}</View>
              ))}
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No policies configured</Text>
          }
        />
      )}

      <View style={styles.infoCard}>
        <Ionicons name="information-circle-outline" size={20} color="#007AFF" />
        <Text style={styles.infoText}>
          Policies control attendance rules, security settings, and general system behavior.
          Changes take effect immediately.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
  },
  statsContainer: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    color: '#666',
  },
  listContent: {
    padding: 16,
    paddingBottom: 80,
  },
  categoryHeader: {
    marginTop: 16,
    marginBottom: 8,
  },
  categoryTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#999',
    letterSpacing: 1,
  },
  policyCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  policyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  policyInfo: {
    flex: 1,
    marginLeft: 12,
  },
  policyName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  policyCategory: {
    fontSize: 12,
    color: '#666',
    textTransform: 'capitalize',
  },
  policyDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 16,
    color: '#999',
  },
  infoCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#E3F2FD',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 12,
    color: '#1976D2',
    lineHeight: 18,
  },
});
