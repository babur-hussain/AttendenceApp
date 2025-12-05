/**
 * Light Theme Configuration
 * 
 * Light mode color mappings for the Kapoor & Sons Attendance app.
 */

import { tokens } from './tokens';

export const lightTheme = {
  name: 'light' as const,
  
  colors: {
    // Background colors
    background: {
      primary: '#ffffff',
      secondary: tokens.colors.neutral[50],
      tertiary: tokens.colors.neutral[100],
      elevated: '#ffffff',
      overlay: 'rgba(0, 0, 0, 0.5)',
    },
    
    // Text colors
    text: {
      primary: tokens.colors.neutral[900],
      secondary: tokens.colors.neutral[600],
      tertiary: tokens.colors.neutral[500],
      disabled: tokens.colors.neutral[400],
      inverse: '#ffffff',
      link: tokens.colors.brand[600],
    },
    
    // Border colors
    border: {
      default: tokens.colors.neutral[200],
      light: tokens.colors.neutral[100],
      strong: tokens.colors.neutral[300],
      focus: tokens.colors.brand[500],
      error: tokens.colors.error[500],
    },
    
    // Interactive colors
    interactive: {
      primary: tokens.colors.brand[500],
      primaryHover: tokens.colors.brand[600],
      primaryActive: tokens.colors.brand[700],
      secondary: tokens.colors.neutral[100],
      secondaryHover: tokens.colors.neutral[200],
      secondaryActive: tokens.colors.neutral[300],
      disabled: tokens.colors.neutral[100],
      disabledText: tokens.colors.neutral[400],
    },
    
    // Semantic colors
    success: tokens.colors.success[500],
    error: tokens.colors.error[500],
    warning: tokens.colors.warning[500],
    info: tokens.colors.info[500],
    
    // Status colors
    status: {
      present: tokens.colors.attendance.present,
      absent: tokens.colors.attendance.absent,
      late: tokens.colors.attendance.late,
      onBreak: tokens.colors.attendance.onBreak,
      overBreak: tokens.colors.attendance.overBreak,
      left: tokens.colors.attendance.left,
      pending: tokens.colors.attendance.pending,
    },
    
    // Biometric confidence
    biometric: {
      high: tokens.colors.biometric.high,
      medium: tokens.colors.biometric.medium,
      low: tokens.colors.biometric.low,
    },
    
    // Device status
    device: {
      online: tokens.colors.device.online,
      offline: tokens.colors.device.offline,
      warning: tokens.colors.device.warning,
    },
    
    // Card colors
    card: {
      background: '#ffffff',
      border: tokens.colors.neutral[200],
      shadow: tokens.shadows.base,
    },
    
    // Input colors
    input: {
      background: '#ffffff',
      backgroundDisabled: tokens.colors.neutral[50],
      border: tokens.colors.neutral[300],
      borderFocus: tokens.colors.brand[500],
      borderError: tokens.colors.error[500],
      placeholder: tokens.colors.neutral[400],
    },
    
    // Modal colors
    modal: {
      background: '#ffffff',
      overlay: 'rgba(0, 0, 0, 0.5)',
    },
    
    // Toast colors
    toast: {
      successBg: tokens.colors.success[50],
      successBorder: tokens.colors.success[500],
      errorBg: tokens.colors.error[50],
      errorBorder: tokens.colors.error[500],
      warningBg: tokens.colors.warning[50],
      warningBorder: tokens.colors.warning[500],
      infoBg: tokens.colors.info[50],
      infoBorder: tokens.colors.info[500],
    },
  },
  
  // Inherit all other tokens
  spacing: tokens.spacing,
  typography: tokens.typography,
  borderRadius: tokens.borderRadius,
  shadows: tokens.shadows,
  opacity: tokens.opacity,
  zIndex: tokens.zIndex,
  layout: tokens.layout,
  animation: tokens.animation,
} as const;

export type LightTheme = typeof lightTheme;
