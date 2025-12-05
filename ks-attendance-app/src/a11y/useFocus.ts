/**
 * Focus Management Hook
 * 
 * Utilities for managing focus in modals and complex UIs.
 * Helps create accessible focus traps and restore focus.
 */

import React, { useRef, useEffect, useState } from 'react';
import { findNodeHandle, AccessibilityInfo } from 'react-native';

/**
 * Hook to manage focus trap in modals
 * 
 * @param visible - Whether the modal is visible
 * @returns Ref to attach to the modal container
 * 
 * @example
 * const modalRef = useFocusTrap(visible);
 * <View ref={modalRef}>...</View>
 */
export function useFocusTrap(visible: boolean) {
  const containerRef = useRef<any>(null);
  const previousFocusRef = useRef<any>(null);
  
  useEffect(() => {
    if (visible && containerRef.current) {
      // Store previous focus
      // Note: React Native doesn't have direct focus tracking like web
      
      // Move focus to modal
      const nodeHandle = findNodeHandle(containerRef.current);
      if (nodeHandle) {
        AccessibilityInfo.setAccessibilityFocus(nodeHandle);
      }
    } else if (!visible && previousFocusRef.current) {
      // Restore previous focus
      const nodeHandle = findNodeHandle(previousFocusRef.current);
      if (nodeHandle) {
        AccessibilityInfo.setAccessibilityFocus(nodeHandle);
      }
    }
  }, [visible]);
  
  return containerRef;
}

/**
 * Hook to announce messages to screen readers
 * 
 * @example
 * const announce = useAnnouncement();
 * 
 * // Announce a message
 * announce('Form submitted successfully');
 */
export function useAnnouncement() {
  return (message: string, options?: { delay?: number }) => {
    const delay = options?.delay || 0;
    
    setTimeout(() => {
      AccessibilityInfo.announceForAccessibility(message);
    }, delay);
  };
}

/**
 * Hook to focus an element after render
 * 
 * @param shouldFocus - Whether to focus on mount
 * @returns Ref to attach to the element
 * 
 * @example
 * const inputRef = useAutoFocus(true);
 * <TextInput ref={inputRef} />
 */
export function useAutoFocus(shouldFocus: boolean = true) {
  const ref = useRef<any>(null);
  
  useEffect(() => {
    if (shouldFocus && ref.current) {
      const nodeHandle = findNodeHandle(ref.current);
      if (nodeHandle) {
        // Small delay to ensure element is mounted
        setTimeout(() => {
          AccessibilityInfo.setAccessibilityFocus(nodeHandle);
        }, 100);
      }
    }
  }, [shouldFocus]);
  
  return ref;
}

/**
 * Hook to check if screen reader is enabled
 * 
 * @returns true if screen reader is enabled
 * 
 * @example
 * const screenReaderEnabled = useScreenReader();
 * 
 * if (screenReaderEnabled) {
 *   // Provide additional context
 * }
 */
export function useScreenReader() {
  const [enabled, setEnabled] = useState(false);
  
  useEffect(() => {
    AccessibilityInfo.isScreenReaderEnabled().then(setEnabled);
    
    const subscription = AccessibilityInfo.addEventListener(
      'screenReaderChanged',
      setEnabled
    );
    
    return () => {
      subscription?.remove();
    };
  }, []);
  
  return enabled;
}

/**
 * Utility to create accessible form field IDs
 * 
 * @param fieldName - Name of the field
 * @returns Object with label, input, error, and helper IDs
 * 
 * @example
 * const ids = getFieldIds('email');
 * <Text id={ids.label}>Email</Text>
 * <TextInput id={ids.input} accessibilityLabelledBy={ids.label} />
 * <Text id={ids.error}>Invalid email</Text>
 */
export function getFieldIds(fieldName: string) {
  return {
    label: `${fieldName}-label`,
    input: `${fieldName}-input`,
    error: `${fieldName}-error`,
    helper: `${fieldName}-helper`,
  };
}
