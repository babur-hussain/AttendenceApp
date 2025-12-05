/**
 * Accessibility Checker
 * 
 * Runtime utility to check for common accessibility issues.
 * Useful for development and testing.
 */

import { Platform } from 'react-native';

export interface A11yIssue {
  type: 'missing-label' | 'low-contrast' | 'small-touch-target' | 'missing-role';
  severity: 'error' | 'warning';
  message: string;
  element?: string;
}

/**
 * Check if a component has adequate contrast
 * @param foreground - Foreground color (hex)
 * @param background - Background color (hex)
 * @returns Contrast ratio
 */
export function checkContrast(foreground: string, background: string): number {
  const rgb1 = hexToRgb(foreground);
  const rgb2 = hexToRgb(background);
  
  if (!rgb1 || !rgb2) return 0;
  
  const l1 = relativeLuminance(rgb1);
  const l2 = relativeLuminance(rgb2);
  
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Validate that contrast meets WCAG AA standards
 * @param ratio - Contrast ratio
 * @param level - 'AA' or 'AAA'
 * @returns true if passes
 */
export function meetsContrastRequirement(
  ratio: number,
  level: 'AA' | 'AAA' = 'AA'
): boolean {
  // WCAG 2.1 Level AA requires 4.5:1 for normal text, 3:1 for large text
  // AAA requires 7:1 for normal text, 4.5:1 for large text
  return level === 'AA' ? ratio >= 4.5 : ratio >= 7;
}

/**
 * Check if touch target is large enough (WCAG 2.5.5)
 * @param width - Width in pixels
 * @param height - Height in pixels
 * @returns true if adequate (44x44 minimum on iOS, 48x48 on Android)
 */
export function checkTouchTargetSize(
  width: number,
  height: number
): boolean {
  const minSize = Platform.OS === 'ios' ? 44 : 48;
  return width >= minSize && height >= minSize;
}

/**
 * Validate accessibility props on a component
 * @param props - Component props
 * @returns Array of issues found
 */
export function validateAccessibilityProps(props: any): A11yIssue[] {
  const issues: A11yIssue[] = [];
  
  // Check for accessibility label
  if (
    props.accessibilityRole &&
    ['button', 'link', 'imagebutton'].includes(props.accessibilityRole) &&
    !props.accessibilityLabel &&
    !props.children
  ) {
    issues.push({
      type: 'missing-label',
      severity: 'error',
      message: `Element with role '${props.accessibilityRole}' is missing accessibilityLabel`,
    });
  }
  
  // Check for missing role
  if (props.onPress && !props.accessibilityRole) {
    issues.push({
      type: 'missing-role',
      severity: 'warning',
      message: 'Interactive element is missing accessibilityRole',
    });
  }
  
  return issues;
}

/**
 * Generate accessibility report for a component tree
 * @param component - Component to analyze
 * @returns Array of issues
 */
export function generateA11yReport(component: any): A11yIssue[] {
  const issues: A11yIssue[] = [];
  
  // This would require traversing the component tree
  // For now, return empty array (placeholder for future implementation)
  
  return issues;
}

/**
 * Log accessibility issues to console (dev only)
 * @param issues - Array of issues
 */
export function logA11yIssues(issues: A11yIssue[]) {
  if (__DEV__ && issues.length > 0) {
    console.group('♿️ Accessibility Issues');
    issues.forEach(issue => {
      const icon = issue.severity === 'error' ? '❌' : '⚠️';
      console.log(`${icon} [${issue.type}] ${issue.message}`);
      if (issue.element) {
        console.log(`  Element: ${issue.element}`);
      }
    });
    console.groupEnd();
  }
}

// Helper functions

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

function relativeLuminance(rgb: { r: number; g: number; b: number }): number {
  const rsRGB = rgb.r / 255;
  const gsRGB = rgb.g / 255;
  const bsRGB = rgb.b / 255;
  
  const r = rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4);
  const g = gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4);
  const b = bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4);
  
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
