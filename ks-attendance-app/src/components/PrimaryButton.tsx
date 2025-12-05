import React from 'react';
import { Pressable, Text, StyleSheet, GestureResponderEvent, ViewStyle } from 'react-native';

type Props = {
  title: string;
  onPress: (e: GestureResponderEvent) => void;
  disabled?: boolean;
  style?: ViewStyle;
  accessibilityLabel?: string;
};

export const PrimaryButton: React.FC<Props> = ({ title, onPress, disabled, style, accessibilityLabel }) => {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      style={({ pressed }) => [
        styles.button,
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={styles.title}>{title}</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 180,
    // className: 'bg-brand-primary rounded-xl py-3 px-4'
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.5,
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default PrimaryButton;
