/**
 * Accessibility Testing Utilities
 * 
 * Jest helpers for testing accessibility in components.
 */

// Type-safe test instance (compatible without react-test-renderer)
export interface TestInstance {
  props: any;
  children?: (TestInstance | string)[];
}

/**
 * Check if element has accessibility label
 */
export function hasAccessibilityLabel(element: TestInstance): boolean {
  return Boolean(element.props.accessibilityLabel);
}

/**
 * Check if element has accessibility role
 */
export function hasAccessibilityRole(element: TestInstance): boolean {
  return Boolean(element.props.accessibilityRole);
}

/**
 * Check if element has adequate touch target size
 * @param element - Test instance
 * @param minSize - Minimum size (default: 44)
 */
export function hasAdequateTouchTarget(
  element: TestInstance,
  minSize: number = 44
): boolean {
  const style = element.props.style || {};
  const width = style.width || 0;
  const height = style.height || 0;
  
  return width >= minSize && height >= minSize;
}

/**
 * Check if interactive element has proper accessibility props
 */
export function hasProperA11yProps(element: TestInstance): {
  valid: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  
  // Check for onPress without role
  if (element.props.onPress && !element.props.accessibilityRole) {
    issues.push('Interactive element missing accessibilityRole');
  }
  
  // Check for role without label
  if (
    element.props.accessibilityRole &&
    !element.props.accessibilityLabel &&
    !element.props.children
  ) {
    issues.push('Element with role missing accessibilityLabel');
  }
  
  // Check disabled state
  if (element.props.disabled && !element.props.accessibilityState?.disabled) {
    issues.push('Disabled element missing accessibilityState');
  }
  
  return {
    valid: issues.length === 0,
    issues,
  };
}

/**
 * Find all accessibility issues in a component tree
 */
export function findA11yIssues(tree: TestInstance): string[] {
  const issues: string[] = [];
  
  const traverse = (node: TestInstance) => {
    const result = hasProperA11yProps(node);
    issues.push(...result.issues);
    
    if (node.children) {
      node.children.forEach((child: TestInstance | string) => {
        if (typeof child !== 'string' && 'props' in child) {
          traverse(child as TestInstance);
        }
      });
    }
  };
  
  traverse(tree);
  return issues;
}

/**
 * Custom Jest matcher for accessibility
 * 
 * @example
 * expect(component).toBeAccessible();
 */
export function toBeAccessible(element: TestInstance) {
  const result = hasProperA11yProps(element);
  
  return {
    pass: result.valid,
    message: () =>
      result.valid
        ? 'Element is accessible'
        : `Element has accessibility issues:\n${result.issues.join('\n')}`,
  };
}

/**
 * Custom Jest matcher for touch target size
 * 
 * @example
 * expect(button).toHaveAdequateTouchTarget();
 */
export function toHaveAdequateTouchTarget(element: TestInstance) {
  const adequate = hasAdequateTouchTarget(element);
  
  return {
    pass: adequate,
    message: () =>
      adequate
        ? 'Element has adequate touch target size'
        : 'Element has inadequate touch target size (minimum 44x44)',
  };
}

// Extend Jest matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeAccessible(): R;
      toHaveAdequateTouchTarget(): R;
    }
  }
}
