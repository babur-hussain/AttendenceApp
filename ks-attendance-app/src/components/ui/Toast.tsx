/**
 * Toast Notification System
 * 
 * Global toast notifications with theme-aware styling.
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { useTheme } from '../../theme';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextValue {
  showToast: (toast: Omit<Toast, 'id'>) => void;
  hideToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  
  const showToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = `toast-${Date.now()}`;
    const newToast: Toast = {
      id,
      duration: 4000,
      ...toast,
    };
    
    setToasts(prev => [...prev, newToast]);
    
    // Auto-dismiss
    if (newToast.duration) {
      setTimeout(() => {
        hideToast(id);
      }, newToast.duration);
    }
  }, []);
  
  const hideToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);
  
  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={hideToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}) {
  return (
    <View style={styles.container} pointerEvents="box-none">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </View>
  );
}

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: (id: string) => void;
}) {
  const { theme } = useTheme();
  const [opacity] = useState(new Animated.Value(0));
  
  React.useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);
  
  const handleDismiss = () => {
    Animated.timing(opacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      onDismiss(toast.id);
    });
  };
  
  const typeStyle = getTypeStyle(toast.type, theme);
  
  return (
    <Animated.View style={[styles.toast, { opacity }]}>
      <View
        style={[
          styles.toastInner,
          {
            backgroundColor: typeStyle.backgroundColor,
            borderColor: typeStyle.borderColor,
          },
          theme.shadows.md,
        ]}
      >
        <View style={styles.content}>
          <Text
            style={[
              styles.title,
              {
                color: theme.colors.text.primary,
                fontSize: theme.typography.fontSize.base,
                fontWeight: theme.typography.fontWeight.semibold,
              },
            ]}
          >
            {getIcon(toast.type)} {toast.title}
          </Text>
          
          {toast.message && (
            <Text
              style={[
                styles.message,
                {
                  color: theme.colors.text.secondary,
                  fontSize: theme.typography.fontSize.sm,
                },
              ]}
            >
              {toast.message}
            </Text>
          )}
        </View>
        
        <TouchableOpacity
          onPress={handleDismiss}
          style={styles.closeButton}
          accessibilityLabel="Dismiss"
          accessibilityRole="button"
        >
          <Text style={[styles.closeText, { color: theme.colors.text.secondary }]}>
            ✕
          </Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

function getTypeStyle(type: ToastType, theme: any) {
  switch (type) {
    case 'success':
      return {
        backgroundColor: theme.colors.toast.successBg,
        borderColor: theme.colors.toast.successBorder,
      };
    case 'error':
      return {
        backgroundColor: theme.colors.toast.errorBg,
        borderColor: theme.colors.toast.errorBorder,
      };
    case 'warning':
      return {
        backgroundColor: theme.colors.toast.warningBg,
        borderColor: theme.colors.toast.warningBorder,
      };
    case 'info':
      return {
        backgroundColor: theme.colors.toast.infoBg,
        borderColor: theme.colors.toast.infoBorder,
      };
  }
}

function getIcon(type: ToastType): string {
  switch (type) {
    case 'success':
      return '✓';
    case 'error':
      return '✕';
    case 'warning':
      return '⚠';
    case 'info':
      return 'ℹ';
  }
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    zIndex: 9999,
  },
  
  toast: {
    marginBottom: 12,
  },
  
  toastInner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  
  content: {
    flex: 1,
  },
  
  title: {
    marginBottom: 4,
  },
  
  message: {
    marginTop: 2,
  },
  
  closeButton: {
    padding: 4,
    marginLeft: 12,
  },
  
  closeText: {
    fontSize: 16,
  },
});
