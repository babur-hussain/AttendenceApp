# UI Design System Runbook

Complete guide to using the Kapoor & Sons Attendance mobile app design system.

---

## 📖 Table of Contents

1. [Theme System](#theme-system)
2. [Component Library](#component-library)
3. [Motion & Animations](#motion--animations)
4. [Accessibility](#accessibility)
5. [Performance](#performance)
6. [Best Practices](#best-practices)

---

## Theme System

### Setup

Wrap your app with `ThemeProvider`:

```tsx
import { ThemeProvider } from './src/theme';

export default function App() {
  return (
    <ThemeProvider>
      <YourApp />
    </ThemeProvider>
  );
}
```

### Using Theme

```tsx
import { useTheme, useThemeColors } from './src/theme';

function MyComponent() {
  const { theme, isDark, toggleTheme } = useTheme();
  const colors = useThemeColors();
  
  return (
    <View style={{ backgroundColor: colors.background.primary }}>
      <Text style={{ color: colors.text.primary }}>Hello</Text>
      <Button title="Toggle Theme" onPress={toggleTheme} />
    </View>
  );
}
```

### Theme Tokens

#### Colors

- **Brand**: `theme.colors.brand[50-900]` - Primary brand colors
- **Neutral**: `theme.colors.neutral[50-950]` - Gray scale
- **Semantic**: `theme.colors.success`, `.error`, `.warning`, `.info`
- **Status**: `theme.colors.status.present/absent/late/onBreak/...`
- **Biometric**: `theme.colors.biometric.high/medium/low`

#### Spacing

```tsx
theme.spacing[0] // 0
theme.spacing[1] // 4px
theme.spacing[2] // 8px
theme.spacing[4] // 16px
theme.spacing[8] // 32px
```

#### Typography

```tsx
theme.typography.fontSize.xs    // 12
theme.typography.fontSize.base  // 16
theme.typography.fontSize.xl    // 20

theme.typography.fontWeight.normal    // 400
theme.typography.fontWeight.semibold  // 600
```

#### Shadows

```tsx
<View style={[styles.card, theme.shadows.md]}>
  {/* Card with medium shadow */}
</View>
```

---

## Component Library

### Button

```tsx
import { Button } from './src/components/ui';

<Button
  title="Click Me"
  variant="primary"  // primary | secondary | ghost | danger
  size="md"          // sm | md | lg
  loading={isLoading}
  fullWidth
  onPress={handlePress}
/>
```

### Card

```tsx
import { Card } from './src/components/ui';

<Card
  title="Card Title"
  subtitle="Subtitle"
  elevation="base"  // sm | base | md | lg
>
  <Text>Card content</Text>
</Card>
```

### Input

```tsx
import { Input } from './src/components/ui';

<Input
  label="Email"
  placeholder="Enter email"
  value={email}
  onChangeText={setEmail}
  error={emailError}
  helperText="We'll never share your email"
  required
/>
```

### Modal

```tsx
import { Modal } from './src/components/ui';

<Modal
  visible={isOpen}
  onClose={() => setIsOpen(false)}
  title="Modal Title"
  size="md"  // sm | md | lg | full
  footer={
    <>
      <Button title="Cancel" variant="ghost" onPress={onClose} />
      <Button title="Save" onPress={onSave} />
    </>
  }
>
  <Text>Modal content</Text>
</Modal>
```

### Badge

```tsx
import { Badge } from './src/components/ui';

<Badge
  label="New"
  variant="success"  // success | error | warning | info | neutral
  size="md"         // sm | md | lg
/>

<Badge label="Online" dot />
```

### Avatar

```tsx
import { Avatar } from './src/components/ui';

<Avatar
  name="John Doe"
  source="https://..."
  size="md"  // sm | md | lg | xl
/>
```

### IconButton

```tsx
import { IconButton } from './src/components/ui';

<IconButton
  icon={<Text>🔍</Text>}
  variant="ghost"
  size="md"
  accessibilityLabel="Search"
  onPress={handleSearch}
/>
```

### Toast

```tsx
import { useToast } from './src/components/ui';

function MyComponent() {
  const { showToast } = useToast();
  
  const handleSuccess = () => {
    showToast({
      type: 'success',
      title: 'Success!',
      message: 'Operation completed',
      duration: 3000,
    });
  };
  
  return <Button title="Show Toast" onPress={handleSuccess} />;
}
```

### Select

```tsx
import { Select } from './src/components/ui';

<Select
  label="Choose Role"
  value={selectedRole}
  onChange={setSelectedRole}
  options={[
    { label: 'Admin', value: 'admin' },
    { label: 'Manager', value: 'manager' },
    { label: 'Employee', value: 'employee' },
  ]}
  placeholder="Select a role"
/>
```

---

## Motion & Animations

### Animation Presets

```tsx
import { AnimatedView } from './src/motion';

<AnimatedView animation="fadeInUp" delay={100}>
  <Text>This will fade in from bottom</Text>
</AnimatedView>
```

Available presets:
- `fadeIn`, `fadeOut`, `fadeInUp`, `fadeInDown`
- `scaleIn`, `scaleOnPress`
- `slideInLeft`, `slideInRight`, `slideUp`
- `bounceIn`, `pulse`, `spin`, `shake`

### Animated Pressable

```tsx
import { AnimatedPressable } from './src/motion';

<AnimatedPressable scaleOnPress={0.95}>
  <Text>Tap me!</Text>
</AnimatedPressable>
```

### Reduced Motion

```tsx
import { useReducedMotion } from './src/motion';

function MyComponent() {
  const reducedMotion = useReducedMotion();
  
  return (
    <View>
      {!reducedMotion && <AnimatedView animation="fadeIn">...</AnimatedView>}
      {reducedMotion && <View>...</View>}
    </View>
  );
}
```

---

## Accessibility

### Accessibility Props

Always provide:

```tsx
<TouchableOpacity
  accessibilityRole="button"
  accessibilityLabel="Submit form"
  accessibilityHint="Double tap to submit"
  accessibilityState={{ disabled: isDisabled }}
>
  <Text>Submit</Text>
</TouchableOpacity>
```

### Focus Management

```tsx
import { useFocusTrap, useAnnouncement } from './src/a11y';

function Modal({ visible }) {
  const modalRef = useFocusTrap(visible);
  const announce = useAnnouncement();
  
  useEffect(() => {
    if (visible) {
      announce('Modal opened');
    }
  }, [visible]);
  
  return <View ref={modalRef}>...</View>;
}
```

### Contrast Checking

```tsx
import { checkContrast, meetsContrastRequirement } from './src/a11y';

const ratio = checkContrast('#ffffff', '#0ea5e9');
console.log('Contrast ratio:', ratio); // 2.79:1

if (!meetsContrastRequirement(ratio, 'AA')) {
  console.warn('Contrast does not meet WCAG AA');
}
```

### Touch Target Size

Minimum touch target: **44x44 pixels** (iOS) or **48x48 pixels** (Android)

All interactive elements in this design system meet these requirements.

---

## Performance

### Performance Logging

```tsx
import { perfLogger, useComponentPerf } from './src/perf';

function MyComponent() {
  useComponentPerf('MyComponent'); // Logs mount time
  
  const handleFetch = async () => {
    await perfLogger.measure('fetchData', async () => {
      return await api.get('/data');
    });
  };
  
  return <View>...</View>;
}
```

### Bundle Analysis

```bash
cd ks-attendance-app
./scripts/analyzeBundle.sh
```

### Asset Optimization

```bash
cd ks-attendance-app
node scripts/optimizeAssets.js
```

This converts PNG/JPG → WebP with 80% quality.

---

## Best Practices

### 1. Always Use Theme Tokens

❌ **Bad:**
```tsx
<View style={{ backgroundColor: '#ffffff' }}>
```

✅ **Good:**
```tsx
<View style={{ backgroundColor: theme.colors.background.primary }}>
```

### 2. Provide Accessibility Labels

❌ **Bad:**
```tsx
<TouchableOpacity onPress={handlePress}>
  <Text>Submit</Text>
</TouchableOpacity>
```

✅ **Good:**
```tsx
<TouchableOpacity
  onPress={handlePress}
  accessibilityRole="button"
  accessibilityLabel="Submit form"
>
  <Text>Submit</Text>
</TouchableOpacity>
```

### 3. Respect Reduced Motion

❌ **Bad:**
```tsx
<AnimatedView animation="fadeIn">...</AnimatedView>
```

✅ **Good:**
```tsx
const reducedMotion = useReducedMotion();
{!reducedMotion && <AnimatedView animation="fadeIn">...</AnimatedView>}
{reducedMotion && <View>...</View>}
```

### 4. Use Semantic Components

❌ **Bad:**
```tsx
<View style={styles.button}>
  <Text>Click</Text>
</View>
```

✅ **Good:**
```tsx
<Button title="Click" onPress={handleClick} />
```

### 5. Measure Performance

```tsx
import { perfLogger } from './src/perf';

const fetchData = async () => {
  await perfLogger.measure('API_FETCH', async () => {
    return await api.get('/data');
  });
};
```

---

## Quick Reference

### Component Sizes

| Size | Height | Font Size | Use Case |
|------|--------|-----------|----------|
| sm   | 36px   | 14px      | Compact UIs, tables |
| md   | 44px   | 16px      | Default (WCAG compliant) |
| lg   | 52px   | 18px      | Primary actions |

### Shadow Elevations

| Elevation | Use Case |
|-----------|----------|
| sm        | Subtle depth |
| base      | Default cards |
| md        | Elevated panels |
| lg        | Modals, popovers |
| xl        | Critical overlays |

### Animation Durations

| Duration | Value | Use Case |
|----------|-------|----------|
| fast     | 150ms | Micro-interactions |
| base     | 250ms | Default animations |
| slow     | 350ms | Page transitions |
| slower   | 500ms | Dramatic effects |

---

## Support

For questions or issues:
- Check component prop types (TypeScript IntelliSense)
- Review examples in `/src/components/ui/*.tsx`
- Run accessibility tests with Jest

---

**Last Updated:** December 2025  
**Version:** 1.0.0
