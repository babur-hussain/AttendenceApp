/**
 * Select Component
 * 
 * Accessible dropdown select with modal picker.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { useTheme } from '../../theme';

export interface SelectOption {
  label: string;
  value: string;
}

interface SelectProps {
  /** Current value */
  value?: string;
  
  /** Change handler */
  onChange: (value: string) => void;
  
  /** Available options */
  options: SelectOption[];
  
  /** Label */
  label?: string;
  
  /** Placeholder text */
  placeholder?: string;
  
  /** Disabled state */
  disabled?: boolean;
  
  /** Custom style */
  style?: ViewStyle;
  
  /** Error state */
  error?: string;
}

export function Select({
  value,
  onChange,
  options,
  label,
  placeholder = 'Select an option',
  disabled = false,
  style,
  error,
}: SelectProps) {
  const { theme } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);
  
  const selectedOption = options.find(opt => opt.value === value);
  const hasError = Boolean(error);
  
  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setModalVisible(false);
  };
  
  return (
    <View style={[styles.container, style]}>
      {label && (
        <Text
          style={[
            styles.label,
            {
              color: theme.colors.text.primary,
              fontSize: theme.typography.fontSize.sm,
              fontWeight: theme.typography.fontWeight.medium,
            },
          ]}
        >
          {label}
        </Text>
      )}
      
      <TouchableOpacity
        style={[
          styles.select,
          {
            backgroundColor: disabled
              ? theme.colors.input.backgroundDisabled
              : theme.colors.input.background,
            borderColor: hasError
              ? theme.colors.input.borderError
              : theme.colors.input.border,
          },
        ]}
        onPress={() => !disabled && setModalVisible(true)}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint="Opens selection menu"
        accessibilityState={{ disabled }}
      >
        <Text
          style={[
            styles.selectText,
            {
              color: selectedOption
                ? theme.colors.text.primary
                : theme.colors.input.placeholder,
              fontSize: theme.typography.fontSize.base,
            },
          ]}
          numberOfLines={1}
        >
          {selectedOption?.label || placeholder}
        </Text>
        
        <Text style={[styles.arrow, { color: theme.colors.text.secondary }]}>
          ▼
        </Text>
      </TouchableOpacity>
      
      {error && (
        <Text
          style={[
            styles.error,
            {
              color: theme.colors.error,
              fontSize: theme.typography.fontSize.xs,
            },
          ]}
        >
          {error}
        </Text>
      )}
      
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <View
            style={[
              styles.modalContent,
              {
                backgroundColor: theme.colors.modal.background,
                borderColor: theme.colors.border.default,
              },
              theme.shadows.lg,
            ]}
          >
            <View
              style={[
                styles.modalHeader,
                { borderBottomColor: theme.colors.border.light },
              ]}
            >
              <Text
                style={[
                  styles.modalTitle,
                  {
                    color: theme.colors.text.primary,
                    fontSize: theme.typography.fontSize.lg,
                    fontWeight: theme.typography.fontWeight.semibold,
                  },
                ]}
              >
                {label || 'Select Option'}
              </Text>
            </View>
            
            <FlatList
              data={options}
              keyExtractor={item => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.option,
                    item.value === value && {
                      backgroundColor: theme.colors.interactive.secondary,
                    },
                  ]}
                  onPress={() => handleSelect(item.value)}
                  accessibilityRole="button"
                  accessibilityLabel={item.label}
                  accessibilityState={{ selected: item.value === value }}
                >
                  <Text
                    style={[
                      styles.optionText,
                      {
                        color: theme.colors.text.primary,
                        fontSize: theme.typography.fontSize.base,
                      },
                      item.value === value && {
                        fontWeight: theme.typography.fontWeight.semibold,
                      },
                    ]}
                  >
                    {item.label}
                  </Text>
                  
                  {item.value === value && (
                    <Text style={{ color: theme.colors.interactive.primary }}>
                      ✓
                    </Text>
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  
  label: {
    marginBottom: 8,
  },
  
  select: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 44,
  },
  
  selectText: {
    flex: 1,
  },
  
  arrow: {
    marginLeft: 8,
    fontSize: 10,
  },
  
  error: {
    marginTop: 6,
    marginLeft: 4,
  },
  
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  
  modalContent: {
    maxHeight: '70%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
  },
  
  modalHeader: {
    padding: 20,
    borderBottomWidth: 1,
  },
  
  modalTitle: {},
  
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  
  optionText: {},
});
