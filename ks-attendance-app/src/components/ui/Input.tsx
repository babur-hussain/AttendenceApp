/**
 * Input Component
 * 
 * Accessible text input with label, helper text, and error state.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ViewStyle,
  TextInputProps,
} from 'react-native';
import { useTheme } from '../../theme';

interface InputProps extends TextInputProps {
  /** Input label */
  label?: string;
  
  /** Helper text below input */
  helperText?: string;
  
  /** Error message (shows error state) */
  error?: string;
  
  /** Required field indicator */
  required?: boolean;
  
  /** Custom container style */
  containerStyle?: ViewStyle;
  
  /** Left icon/addon */
  leftAddon?: React.ReactNode;
  
  /** Right icon/addon */
  rightAddon?: React.ReactNode;
}

export function Input({
  label,
  helperText,
  error,
  required = false,
  containerStyle,
  leftAddon,
  rightAddon,
  editable = true,
  ...inputProps
}: InputProps) {
  const { theme } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  
  const hasError = Boolean(error);
  const isDisabled = !editable;
  
  return (
    <View style={[styles.container, containerStyle]}>
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
          {required && (
            <Text style={{ color: theme.colors.error }}> *</Text>
          )}
        </Text>
      )}
      
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: isDisabled
              ? theme.colors.input.backgroundDisabled
              : theme.colors.input.background,
            borderColor: hasError
              ? theme.colors.input.borderError
              : isFocused
              ? theme.colors.input.borderFocus
              : theme.colors.input.border,
            borderWidth: isFocused ? 2 : 1,
          },
        ]}
      >
        {leftAddon && <View style={styles.leftAddon}>{leftAddon}</View>}
        
        <TextInput
          style={[
            styles.input,
            {
              color: theme.colors.text.primary,
              fontSize: theme.typography.fontSize.base,
            },
            leftAddon ? styles.inputWithLeftAddon : undefined,
            rightAddon ? styles.inputWithRightAddon : undefined,
          ]}
          placeholderTextColor={theme.colors.input.placeholder}
          editable={editable}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          accessibilityLabel={label}
          accessibilityState={{ disabled: isDisabled }}
          {...inputProps}
        />
        
        {rightAddon && <View style={styles.rightAddon}>{rightAddon}</View>}
      </View>
      
      {(helperText || error) && (
        <Text
          style={[
            styles.helperText,
            {
              color: hasError
                ? theme.colors.error
                : theme.colors.text.secondary,
              fontSize: theme.typography.fontSize.xs,
            },
          ]}
          accessibilityLiveRegion={hasError ? 'polite' : 'none'}
        >
          {error || helperText}
        </Text>
      )}
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
  
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    minHeight: 44,
  },
  
  input: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  
  inputWithLeftAddon: {
    paddingLeft: 4,
  },
  
  inputWithRightAddon: {
    paddingRight: 4,
  },
  
  leftAddon: {
    paddingLeft: 12,
  },
  
  rightAddon: {
    paddingRight: 12,
  },
  
  helperText: {
    marginTop: 6,
    marginLeft: 4,
  },
});
