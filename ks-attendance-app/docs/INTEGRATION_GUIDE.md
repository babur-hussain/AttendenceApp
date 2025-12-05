# Design System Integration Guide

Complete guide to integrate the new design system into your Kapoor & Sons Attendance app.

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [Provider Setup](#provider-setup)
3. [Migrating Components](#migrating-components)
4. [Screen Updates](#screen-updates)
5. [Testing Integration](#testing-integration)
6. [Troubleshooting](#troubleshooting)

---

## Quick Start

### 1. Install Dependencies

```bash
cd ks-attendance-app
npm install react-native-reanimated
npm install sharp --save-dev  # For asset optimization
```

### 2. Configure Reanimated (Optional)

If using animations, add to `babel.config.js`:

```javascript
module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: ['react-native-reanimated/plugin'], // Add this
  };
};
```

### 3. Wrap App with Providers

**Before:**
```typescript
// App.tsx
import { NavigationContainer } from '@react-navigation/native';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <NavigationContainer>
      <AppNavigator />
    </NavigationContainer>
  );
}
```

**After:**
```typescript
// App.tsx
import { NavigationContainer } from '@react-navigation/native';
import { ThemeProvider } from './src/theme';
import { ToastProvider } from './src/components/ui';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
      </ToastProvider>
    </ThemeProvider>
  );
}
```

---

## Provider Setup

### Theme Provider

The `ThemeProvider` enables:
- Light/dark theme switching
- Theme persistence (AsyncStorage)
- System theme detection

**Usage:**
```typescript
import { useTheme, useThemeColors } from '../theme';

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

### Toast Provider

The `ToastProvider` enables notifications:

**Usage:**
```typescript
import { useToast } from '../components/ui';

function MyComponent() {
  const { showToast } = useToast();
  
  const handleSuccess = () => {
    showToast({
      type: 'success',
      title: 'Success!',
      message: 'Attendance marked successfully',
      duration: 3000,
    });
  };
  
  return <Button title="Mark" onPress={handleSuccess} />;
}
```

---

## Migrating Components

### Step 1: Update Imports

**Before:**
```typescript
import { View, Text, TouchableOpacity, TextInput } from 'react-native';
```

**After:**
```typescript
import { View, Text } from 'react-native';
import { Button, Card, Input } from '../components/ui';
import { useThemeColors } from '../theme';
```

### Step 2: Replace Components

#### Buttons

**Before:**
```typescript
<TouchableOpacity 
  style={styles.button}
  onPress={handlePress}
>
  <Text style={styles.buttonText}>Submit</Text>
</TouchableOpacity>
```

**After:**
```typescript
<Button
  title="Submit"
  variant="primary"
  size="md"
  onPress={handlePress}
  loading={isLoading}
/>
```

#### Text Inputs

**Before:**
```typescript
<View>
  <Text style={styles.label}>Email</Text>
  <TextInput
    style={styles.input}
    value={email}
    onChangeText={setEmail}
    placeholder="Enter email"
  />
  {error && <Text style={styles.error}>{error}</Text>}
</View>
```

**After:**
```typescript
<Input
  label="Email"
  value={email}
  onChangeText={setEmail}
  placeholder="Enter email"
  error={error}
  required
/>
```

#### Cards

**Before:**
```typescript
<View style={styles.card}>
  <Text style={styles.title}>Employee Details</Text>
  <Text style={styles.subtitle}>ID: 12345</Text>
  <View style={styles.content}>
    {/* content */}
  </View>
</View>
```

**After:**
```typescript
<Card
  title="Employee Details"
  subtitle="ID: 12345"
  elevation="md"
>
  {/* content */}
</Card>
```

---

## Screen Updates

### Example: LoginScreen

**Before:**
```typescript
// src/screens/LoginScreen.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    // ... login logic
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login</Text>
      
      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        placeholder="Email"
      />
      
      <TextInput
        style={styles.input}
        value={password}
        onChangeText={setPassword}
        placeholder="Password"
        secureTextEntry
      />
      
      <TouchableOpacity 
        style={styles.button}
        onPress={handleLogin}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Loading...' : 'Login'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  input: { borderWidth: 1, padding: 10, marginBottom: 10 },
  button: { backgroundColor: '#007AFF', padding: 15, borderRadius: 8 },
  buttonText: { color: 'white', textAlign: 'center' },
});
```

**After:**
```typescript
// src/screens/LoginScreen.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Card, Input, Button } from '../components/ui';
import { useTheme, useThemeColors, useSpacing } from '../theme';
import { useToast } from '../components/ui';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({ email: '', password: '' });
  
  const colors = useThemeColors();
  const spacing = useSpacing();
  const { showToast } = useToast();

  const handleLogin = async () => {
    // Validation
    const newErrors = { email: '', password: '' };
    if (!email) newErrors.email = 'Email is required';
    if (!password) newErrors.password = 'Password is required';
    
    if (newErrors.email || newErrors.password) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      // ... login logic
      showToast({
        type: 'success',
        title: 'Welcome!',
        message: 'Logged in successfully',
      });
      navigation.navigate('Home');
    } catch (error) {
      showToast({
        type: 'error',
        title: 'Login Failed',
        message: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background.primary }]}
      contentContainerStyle={{ padding: spacing[4] }}
    >
      <Card elevation="lg">
        <Text style={[styles.title, { 
          color: colors.text.primary,
          fontSize: theme.typography.fontSize['3xl'],
          fontWeight: theme.typography.fontWeight.bold,
        }]}>
          Login to Kapoor & Sons
        </Text>
        
        <View style={{ marginTop: spacing[6] }}>
          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="employee@ksfashion.com"
            keyboardType="email-address"
            autoCapitalize="none"
            error={errors.email}
            required
          />
          
          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            secureTextEntry
            error={errors.password}
            required
          />
          
          <Button
            title="Login"
            variant="primary"
            size="lg"
            onPress={handleLogin}
            loading={loading}
            fullWidth
          />
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    textAlign: 'center',
  },
});
```

### Example: HomeScreen with Theme Toggle

```typescript
// src/screens/HomeScreen.tsx
import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Card, Button, Badge, Avatar, IconButton } from '../components/ui';
import { useTheme, useThemeColors, useSpacing } from '../theme';

export default function HomeScreen({ navigation }) {
  const { theme, isDark, toggleTheme } = useTheme();
  const colors = useThemeColors();
  const spacing = useSpacing();

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background.primary }]}>
      <View style={[styles.header, { padding: spacing[4] }]}>
        <View style={styles.headerLeft}>
          <Avatar name="John Doe" size="lg" />
          <View style={{ marginLeft: spacing[3] }}>
            <Text style={[styles.name, { color: colors.text.primary }]}>
              John Doe
            </Text>
            <Badge label="Manager" variant="success" size="sm" />
          </View>
        </View>
        
        <IconButton
          icon={isDark ? '☀️' : '🌙'}
          variant="ghost"
          onPress={toggleTheme}
          accessibilityLabel="Toggle theme"
        />
      </View>

      <View style={{ padding: spacing[4] }}>
        <Card title="Today's Attendance" subtitle="March 15, 2024" elevation="md">
          <View style={styles.stats}>
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: colors.success }]}>45</Text>
              <Text style={[styles.statLabel, { color: colors.text.secondary }]}>Present</Text>
            </View>
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: colors.error }]}>3</Text>
              <Text style={[styles.statLabel, { color: colors.text.secondary }]}>Absent</Text>
            </View>
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: colors.warning }]}>2</Text>
              <Text style={[styles.statLabel, { color: colors.text.secondary }]}>Late</Text>
            </View>
          </View>
        </Card>

        <Card 
          title="Quick Actions" 
          elevation="md"
          style={{ marginTop: spacing[4] }}
        >
          <Button
            title="Mark Attendance"
            variant="primary"
            size="lg"
            onPress={() => navigation.navigate('MarkAttendance')}
            fullWidth
          />
          <Button
            title="View Reports"
            variant="secondary"
            size="md"
            onPress={() => navigation.navigate('Reports')}
            fullWidth
            style={{ marginTop: spacing[3] }}
          />
        </Card>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center' 
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  name: { fontSize: 20, fontWeight: '600', marginBottom: 4 },
  stats: { 
    flexDirection: 'row', 
    justifyContent: 'space-around',
    marginTop: 16,
  },
  stat: { alignItems: 'center' },
  statValue: { fontSize: 32, fontWeight: 'bold' },
  statLabel: { fontSize: 14, marginTop: 4 },
});
```

---

## Testing Integration

### 1. Visual Testing

```bash
# Start app
npm start

# Test checklist:
# ✅ Theme switches between light/dark
# ✅ All buttons have proper touch feedback
# ✅ Inputs show focus states
# ✅ Toasts appear and dismiss
# ✅ Cards have proper elevation
# ✅ Text is readable in both themes
```

### 2. Accessibility Testing

```typescript
// Enable accessibility inspector
import { a11yChecker } from '../a11y';

// In development
if (__DEV__) {
  // Check contrast
  const ratio = a11yChecker.checkContrast('#000000', '#FFFFFF');
  console.log('Contrast ratio:', ratio); // Should be ≥ 4.5:1
  
  // Validate component
  const issues = a11yChecker.validateAccessibilityProps({
    accessibilityLabel: 'Submit button',
    accessibilityRole: 'button',
  });
  console.log('A11y issues:', issues); // Should be empty
}
```

### 3. Performance Testing

```typescript
import { PerformanceLogger } from '../perf';

const perfLogger = new PerformanceLogger();

function MyScreen() {
  useEffect(() => {
    perfLogger.start('screen-mount');
    return () => {
      perfLogger.end('screen-mount');
    };
  }, []);
  
  // ... component
}
```

### 4. Run Unit Tests

```bash
npm test src/__tests__/ui.test.tsx
```

---

## Troubleshooting

### Theme not working

**Problem:** Components not respecting theme
**Solution:** Ensure `ThemeProvider` wraps entire app in `App.tsx`

```typescript
// ✅ Correct
<ThemeProvider>
  <NavigationContainer>
    <AppNavigator />
  </NavigationContainer>
</ThemeProvider>

// ❌ Wrong
<NavigationContainer>
  <ThemeProvider>
    <AppNavigator />
  </ThemeProvider>
</NavigationContainer>
```

### Toasts not showing

**Problem:** `useToast()` returns undefined
**Solution:** Wrap app with `ToastProvider`

```typescript
<ThemeProvider>
  <ToastProvider> {/* Add this */}
    <NavigationContainer>
      <AppNavigator />
    </NavigationContainer>
  </ToastProvider>
</ThemeProvider>
```

### Animations not working

**Problem:** AnimatedView/AnimatedPressable not animating
**Solution:** 
1. Check if `react-native-reanimated` is installed
2. Verify Babel plugin is configured
3. Check if reduced motion is enabled (animations disabled for accessibility)

```typescript
import { useReducedMotion } from '../motion';

function MyComponent() {
  const reducedMotion = useReducedMotion();
  console.log('Reduced motion:', reducedMotion); // Should be false
}
```

### Import errors

**Problem:** Cannot find module './theme' or './components/ui'
**Solution:** Check import paths are relative to current file

```typescript
// From screens folder
import { useTheme } from '../theme';
import { Button } from '../components/ui';

// From components folder
import { useTheme } from '../../theme';
```

### TypeScript errors

**Problem:** Type errors with component props
**Solution:** Check prop types in component files or refer to `docs/UI_RUNBOOK.md`

```typescript
// ✅ Correct
<Button title="Submit" variant="primary" size="md" />

// ❌ Wrong variant
<Button title="Submit" variant="blue" size="md" />
//                               ^ Type error: "blue" not valid
```

---

## Next Steps

1. **Migrate gradually**: Start with one screen at a time
2. **Remove old styles**: Delete unused StyleSheet code
3. **Run accessibility audit**: Test with VoiceOver/TalkBack
4. **Optimize assets**: Run `node scripts/optimizeAssets.js`
5. **Monitor performance**: Use `PerformanceLogger` in critical paths
6. **Read documentation**:
   - `docs/UI_RUNBOOK.md` - Complete component reference
   - `docs/ASSETS_GUIDE.md` - Asset optimization guide
   - `docs/RELEASE_UI_CHECKLIST.md` - Pre-release QA checklist

---

## Support

For issues or questions:
1. Check `docs/UI_RUNBOOK.md` for usage examples
2. Review TypeScript types in component files
3. Test with minimal example to isolate issue
4. Check console for warnings (a11y, performance)
