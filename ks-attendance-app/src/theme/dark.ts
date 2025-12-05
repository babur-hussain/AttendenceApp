/**
 * Dark Theme Configuration
 * 
 * Dark mode color mappings for the Kapoor & Sons Attendance app.
 */

import { tokens } from './tokens';

export const darkTheme = {
  name: 'dark' as const,
  
  colors: {
    // Background colors
    background: {
      primary: tokens.colors.neutral[950],
      secondary: tokens.colors.neutral[900],
      tertiary: tokens.colors.neutral[800],
      elevated: tokens.colors.neutral[900],
      overlay: 'rgba(0, 0, 0, 0.75)',
    },
    
    // Text colors
    text: {
      primary: tokens.colors.neutral[50],
      secondary: tokens.colors.neutral[300],
      tertiary: tokens.colors.neutral[400],
      disabled: tokens.colors.neutral[600],
      inverse: tokens.colors.neutral[900],
      link: tokens.colors.brand[400],
    },
    
    // Border colors
    border: {
      default: tokens.colors.neutral[700],
      light: tokens.colors.neutral[800],
      strong: tokens.colors.neutral[600],
      focus: tokens.colors.brand[400],
      error: tokens.colors.error[400],
    },
    
    // Interactive colors
    interactive: {
      primary: tokens.colors.brand[500],
      primaryHover: tokens.colors.brand[400],
      primaryActive: tokens.colors.brand[300],
      secondary: tokens.colors.neutral[800],
      secondaryHover: tokens.colors.neutral[700],
      secondaryActive: tokens.colors.neutral[600],
      disabled: tokens.colors.neutral[800],
      disabledText: tokens.colors.neutral[600],
    },
    
    // Semantic colors (slightly adjusted for dark mode)
    success: tokens.colors.success[400],
    error: tokens.colors.error[400],
    warning: tokens.colors.warning[400],
    info: tokens.colors.info[400],
    
    // Status colors
    status: {
      present: tokens.colors.success[400],
      absent: tokens.colors.error[400],
      late: tokens.colors.warning[400],
      onBreak: tokens.colors.info[400],
      overBreak: '#fb923c', // Orange-400
      left: tokens.colors.neutral[500],
      pending: tokens.colors.warning[400],
    },
    
    // Biometric confidence
    biometric: {
      high: tokens.colors.success[400],
      medium: tokens.colors.warning[400],
      low: tokens.colors.error[400],
    },
    
    // Device status
    device: {
      online: tokens.colors.success[400],
      offline: tokens.colors.error[400],
      warning: tokens.colors.warning[400],
    },
    
    // Card colors
    card: {
      background: tokens.colors.neutral[900],
      border: tokens.colors.neutral[700],
      shadow: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
      },
    },
    
    // Input colors
    input: {
      background: tokens.colors.neutral[800],
      backgroundDisabled: tokens.colors.neutral[900],
      border: tokens.colors.neutral[600],
      borderFocus: tokens.colors.brand[400],
      borderError: tokens.colors.error[400],
      placeholder: tokens.colors.neutral[500],
    },
    
    // Modal colors
    modal: {
      background: tokens.colors.neutral[900],
      overlay: 'rgba(0, 0, 0, 0.75)',
    },
    
    // Toast colors
    toast: {
      successBg: tokens.colors.success[900],
      successBorder: tokens.colors.success[400],
      errorBg: tokens.colors.error[900],
      errorBorder: tokens.colors.error[400],
      warningBg: tokens.colors.warning[900],
      warningBorder: tokens.colors.warning[400],
      infoBg: tokens.colors.info[900],
      infoBorder: tokens.colors.info[400],
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

export type DarkTheme = typeof darkTheme;
