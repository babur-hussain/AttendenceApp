/**
 * Accessibility Toolkit Barrel Export
 * 
 * Centralized exports for accessibility utilities.
 */

export {
  checkContrast,
  meetsContrastRequirement,
  checkTouchTargetSize,
  validateAccessibilityProps,
  generateA11yReport,
  logA11yIssues,
} from './a11yChecker';
export type { A11yIssue } from './a11yChecker';

export {
  useFocusTrap,
  useAnnouncement,
  useAutoFocus,
  useScreenReader,
  getFieldIds,
} from './useFocus';

export {
  hasAccessibilityLabel,
  hasAccessibilityRole,
  hasAdequateTouchTarget,
  hasProperA11yProps,
  findA11yIssues,
  toBeAccessible,
  toHaveAdequateTouchTarget,
} from './testUtils';
