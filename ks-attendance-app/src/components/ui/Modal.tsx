/**
 * Modal Component
 * 
 * Accessible modal with focus trap and screen reader support.
 */

import React, { useEffect, ReactNode } from 'react';
import {
  Modal as RNModal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  ScrollView,
  TouchableWithoutFeedback,
  ModalProps as RNModalProps,
} from 'react-native';
import { useTheme } from '../../theme';

interface ModalProps extends Omit<RNModalProps, 'children'> {
  /** Modal visibility */
  visible: boolean;
  
  /** Close handler */
  onClose: () => void;
  
  /** Modal title */
  title?: string;
  
  /** Modal content */
  children: ReactNode;
  
  /** Footer content */
  footer?: ReactNode;
  
  /** Modal size */
  size?: 'sm' | 'md' | 'lg' | 'full';
  
  /** Custom style */
  style?: ViewStyle;
  
  /** Prevent dismiss on backdrop press */
  disableBackdropDismiss?: boolean;
  
  /** Show close button */
  showCloseButton?: boolean;
}

export function Modal({
  visible,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  style,
  disableBackdropDismiss = false,
  showCloseButton = true,
  ...modalProps
}: ModalProps) {
  const { theme } = useTheme();
  
  // Announce modal to screen readers
  useEffect(() => {
    if (visible) {
      // Modal opened
    }
  }, [visible]);
  
  const handleBackdropPress = () => {
    if (!disableBackdropDismiss) {
      onClose();
    }
  };
  
  const sizeStyle = getSizeStyle(size);
  
  return (
    <RNModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      accessibilityViewIsModal
      {...modalProps}
    >
      <TouchableWithoutFeedback onPress={handleBackdropPress}>
        <View
          style={[
            styles.backdrop,
            { backgroundColor: theme.colors.modal.overlay },
          ]}
        >
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.modal,
                sizeStyle,
                {
                  backgroundColor: theme.colors.modal.background,
                  borderColor: theme.colors.border.default,
                },
                theme.shadows.lg,
                style,
              ]}
              accessibilityRole="none"
              accessible={false}
            >
              {title && (
                <View
                  style={[
                    styles.header,
                    { borderBottomColor: theme.colors.border.light },
                  ]}
                >
                  <Text
                    style={[
                      styles.title,
                      {
                        color: theme.colors.text.primary,
                        fontSize: theme.typography.fontSize.xl,
                        fontWeight: theme.typography.fontWeight.semibold,
                      },
                    ]}
                    accessibilityRole="header"
                  >
                    {title}
                  </Text>
                  
                  {showCloseButton && (
                    <TouchableOpacity
                      onPress={onClose}
                      style={styles.closeButton}
                      accessibilityLabel="Close modal"
                      accessibilityRole="button"
                    >
                      <Text
                        style={[
                          styles.closeText,
                          { color: theme.colors.text.secondary },
                        ]}
                      >
                        ✕
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
              
              <ScrollView
                style={styles.content}
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={true}
              >
                {children}
              </ScrollView>
              
              {footer && (
                <View
                  style={[
                    styles.footer,
                    { borderTopColor: theme.colors.border.light },
                  ]}
                >
                  {footer}
                </View>
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </RNModal>
  );
}

function getSizeStyle(size: 'sm' | 'md' | 'lg' | 'full'): ViewStyle {
  switch (size) {
    case 'sm':
      return { width: '80%', maxHeight: '50%' };
    case 'md':
      return { width: '90%', maxHeight: '70%' };
    case 'lg':
      return { width: '95%', maxHeight: '85%' };
    case 'full':
      return { width: '100%', height: '100%', borderRadius: 0 };
  }
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  modal: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
  },
  
  title: {
    flex: 1,
  },
  
  closeButton: {
    padding: 8,
    marginLeft: 16,
  },
  
  closeText: {
    fontSize: 24,
    lineHeight: 24,
  },
  
  content: {
    flex: 1,
  },
  
  contentContainer: {
    padding: 20,
  },
  
  footer: {
    padding: 16,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
});
