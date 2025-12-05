# Developer Guide: Authentication & Role-Based Home

## Quick Start

### Running the App

```bash
# Install dependencies (if not already done)
cd ks-attendance-app
npm install

# Start Expo dev server
npm start

# Or run on specific platform
npm run ios      # iOS simulator
npm run android  # Android emulator
npm run web      # Web browser
```

---

## 🧭 Navigation Flow

### App Launch Sequence
```
App Launch
    ↓
AuthProvider initializes
    ↓
AppNavigator checks state
    ↓
┌─────────────────────────────┐
│ !onboardingCompleted?       │ → YES → OnboardingScreen
│                              │
└──────────┬───────────────────┘
           NO
           ↓
┌─────────────────────────────┐
│ !user (not authenticated)?  │ → YES → Auth Stack (Login/ForgotPin/ResetPin)
│                              │
└──────────┬───────────────────┘
           NO (authenticated)
           ↓
┌─────────────────────────────┐
│ RoleBasedHome               │
│  - Checks user.role         │
│  - Routes to correct Home   │
└──────────┬───────────────────┘
           ↓
    ┌──────┴──────┐
    │             │
  ADMIN      MANAGER      EMP (default)
    │             │             │
AdminHome   ManagerHome   EmployeeHome
```

---

## 🔐 Using AuthService

### Sign In
```typescript
import { authService } from '../services/AuthService';

// Sign in with email and PIN
try {
  const response = await authService.signIn(email, pin);
  console.log('User:', response.user);
  console.log('Token expires in:', response.expiresIn, 'seconds');
} catch (error) {
  if (error instanceof ToonAuthError) {
    console.error('Auth error:', error.code);
  }
}
```

### Get Current User
```typescript
try {
  const user = await authService.getCurrentUser();
  console.log('Current user:', user.name, user.role);
} catch (error) {
  console.error('Failed to get user:', error);
}
```

### Request PIN Reset
```typescript
try {
  const response = await authService.requestPinReset(email);
  console.log(response.message); // "PIN reset instructions sent..."
} catch (error) {
  console.error('Reset request failed:', error);
}
```

### Reset PIN
```typescript
try {
  const response = await authService.resetPin(resetToken, newPin);
  console.log(response.message); // "PIN reset successfully..."
  // Navigate to login
} catch (error) {
  console.error('PIN reset failed:', error);
}
```

### Sign Out
```typescript
try {
  await authService.signOut();
  // User state will update automatically via AuthContext
} catch (error) {
  console.error('Sign out failed:', error);
}
```

### Check Authentication Status
```typescript
const isAuth = await authService.isAuthenticated();
if (isAuth) {
  console.log('User is authenticated');
}
```

---

## 🎣 Using Auth Hooks

### useAuth Hook
```typescript
import { useAuth } from '../context/AuthContext';

function MyComponent() {
  const { user, token, isLoading, signIn, signOut } = useAuth();
  
  if (isLoading) {
    return <LoadingSpinner />;
  }
  
  if (!user) {
    return <Text>Not authenticated</Text>;
  }
  
  return (
    <View>
      <Text>Welcome, {user.name}!</Text>
      <Button title="Sign Out" onPress={signOut} />
    </View>
  );
}
```

### useRole Hook
```typescript
import { useRole } from '../hooks/useRole';

function MyComponent() {
  const role = useRole();
  
  return (
    <View>
      {role === 'ADMIN' && <AdminPanel />}
      {role === 'MANAGER' && <ManagerPanel />}
      {role === 'EMP' && <EmployeePanel />}
    </View>
  );
}
```

---

## 🏗️ Creating New Home Screen Components

### Example: Adding a New Feature to Employee Home

```typescript
// src/screens/home/EmployeeHomeScreen.tsx

import { HomeCard, ActionTile } from '../../components/HomeComponents';

// Inside your component:
<HomeCard title="My New Feature">
  <ActionTile
    icon="🎉"
    label="New Action"
    onPress={handleNewAction}
    color="#FF9500"
  />
</HomeCard>

const handleNewAction = () => {
  // Your logic here
  navigation.navigate('SomeScreen');
};
```

### Example: Adding Stats

```typescript
import { SummaryTile } from '../../components/HomeComponents';

// Add to state
const [myStats, setMyStats] = useState({
  count: 42,
  percentage: '95%',
});

// Render
<HomeCard title="My Stats">
  <View style={styles.summaryGrid}>
    <SummaryTile
      label="Count"
      value={myStats.count}
      color="#34c759"
    />
    <SummaryTile
      label="Success Rate"
      value={myStats.percentage}
      color="#007AFF"
    />
  </View>
</HomeCard>
```

---

## 🌐 Making TOON API Calls

### Using ToonClient Directly

```typescript
import { toonClient } from '../services/api/ToonClient';

// POST request
const response = await toonClient.toonPost('/my-endpoint', {
  operation: 'my_operation',
  param1: 'value1',
});

// GET request with params
const data = await toonClient.toonGet('/my-endpoint', {
  id: '123',
});
```

### Adding New Service Methods

```typescript
// src/services/MyService.ts

import { toonClient } from './api/ToonClient';
import { API_ENDPOINTS } from './api/config';

export class MyService {
  async getMyData(id: string): Promise<MyData> {
    try {
      const request = {
        operation: 'get_data',
        id,
      };
      
      const response = await toonClient.toonPost<MyDataResponse>(
        API_ENDPOINTS.MY_ENDPOINT,
        request
      );
      
      if (!response || !response.success) {
        throw new Error('Failed to get data');
      }
      
      return response.data;
    } catch (error) {
      console.error('MyService.getMyData error:', error);
      throw error;
    }
  }
}

export const myService = new MyService();
```

---

## 🎨 Styling Guidelines

### Use Consistent Colors

```typescript
// Primary colors
const COLORS = {
  primary: '#007AFF',
  success: '#34c759',
  warning: '#FF9500',
  error: '#ff3b30',
  purple: '#5856D6',
  gray: '#8E8E93',
  background: '#f5f5f5',
  cardBg: '#fff',
  text: '#1a1a1a',
  textSecondary: '#666',
  textTertiary: '#999',
};
```

### Consistent Spacing

```typescript
const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};
```

### Shadow Helper

```typescript
const shadow = (elevation: number = 3) => ({
  // iOS
  shadowColor: '#000',
  shadowOffset: { width: 0, height: elevation / 2 },
  shadowOpacity: 0.1,
  shadowRadius: elevation * 2,
  // Android
  elevation,
});

// Usage
<View style={[styles.card, shadow(4)]} />
```

---

## 🧪 Testing Auth Flow

### Mock User for Development

```typescript
// In your test/dev component
const mockUser = {
  id: 'test_123',
  email: 'test@company.com',
  name: 'Test User',
  role: 'EMP' as UserRole,
};

// Bypass auth for testing
useEffect(() => {
  if (__DEV__) {
    // Uncomment to bypass login
    // authService.currentUser = mockUser;
  }
}, []);
```

### Test Different Roles

```typescript
// Toggle role in dev
const testRole = 'ADMIN'; // or 'MANAGER', 'EMP'

const mockUserWithRole = {
  ...mockUser,
  role: testRole,
};
```

---

## 🐛 Common Issues & Solutions

### Issue: "Token expired" error on every request

**Solution:** Check token expiration logic
```typescript
// In AuthService
const expired = await isTokenExpired();
if (expired) {
  await this.refreshToken();
}
```

### Issue: Home screen shows wrong role

**Solution:** Verify role field in TOON response
```typescript
// In AuthService.signIn()
console.log('User role from TOON:', response.user.role);
```

### Issue: Navigation doesn't update after login

**Solution:** Ensure AuthContext updates state properly
```typescript
// In AuthContext.signIn()
setAuthState({
  user: response.user,
  token: response.accessToken,
  isLoading: false, // Important!
});
```

### Issue: Logout doesn't clear user state

**Solution:** Check signOut implementation
```typescript
// Should clear all state
await clearTokens();
toonClient.clearAuthToken();
this.currentUser = null;
```

---

## 📝 Adding New Auth Screens

### 1. Create Screen Component

```typescript
// src/screens/auth/MyNewAuthScreen.tsx

import React from 'react';
import { View, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';

export const MyNewAuthScreen: React.FC = () => {
  const navigation = useNavigation();
  
  return (
    <View>
      <Text>My New Auth Screen</Text>
    </View>
  );
};
```

### 2. Export from index

```typescript
// src/screens/auth/index.ts
export { MyNewAuthScreen } from './MyNewAuthScreen';
```

### 3. Add to Navigation Types

```typescript
// src/types/navigation.ts
export type RootStackParamList = {
  // ...existing routes
  MyNewAuth: { someParam?: string };
};
```

### 4. Add to AppNavigator

```typescript
// src/navigation/AppNavigator.tsx
!user ? (
  <>
    {/* ...existing auth screens */}
    <RootStack.Screen
      name="MyNewAuth"
      component={MyNewAuthScreen}
      options={{ title: 'My Screen' }}
    />
  </>
)
```

---

## 🔄 Token Refresh Flow

### Automatic Token Refresh

```typescript
// ToonClient handles refresh automatically
try {
  const data = await toonClient.toonPost('/some-endpoint', request);
} catch (error) {
  if (error instanceof ToonTokenExpiredError) {
    // Client will call authService.refreshToken() automatically
  }
}
```

### Manual Token Refresh

```typescript
import { authService } from '../services/AuthService';

try {
  const newAccessToken = await authService.refreshToken();
  console.log('Token refreshed:', newAccessToken);
} catch (error) {
  // Refresh failed, user needs to re-login
  await authService.signOut();
  navigation.navigate('Login');
}
```

---

## 📊 State Management

### Auth State Flow

```
User opens app
    ↓
AuthProvider mounts
    ↓
Calls authService.restoreSession()
    ↓
┌──────────────────────────┐
│ Stored tokens found?     │ → NO → Set isLoading=false, user=null
└────────┬─────────────────┘
         YES
         ↓
┌──────────────────────────┐
│ Token expired?           │ → YES → Refresh token
└────────┬─────────────────┘
         NO
         ↓
Fetch current user from server
    ↓
Update state: user, token, isLoading=false
    ↓
AppNavigator re-renders with user
    ↓
RoleBasedHome routes to correct screen
```

---

## 🚀 Performance Tips

### Lazy Loading Screens

```typescript
import React, { lazy, Suspense } from 'react';

const EmployeeHomeScreen = lazy(() => 
  import('./screens/home/EmployeeHomeScreen').then(m => ({ default: m.EmployeeHomeScreen }))
);

// In component
<Suspense fallback={<LoadingSpinner />}>
  <EmployeeHomeScreen />
</Suspense>
```

### Memoize Expensive Components

```typescript
import React, { memo } from 'react';

export const ActionTile = memo<ActionTileProps>(({ icon, label, onPress }) => {
  return (
    <TouchableOpacity onPress={onPress}>
      <Text>{icon}</Text>
      <Text>{label}</Text>
    </TouchableOpacity>
  );
});
```

### Use useCallback for Handlers

```typescript
import { useCallback } from 'react';

const handleLogout = useCallback(() => {
  Alert.alert('Sign Out', 'Are you sure?', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Sign Out', onPress: signOut },
  ]);
}, [signOut]);
```

---

## 📦 Dependencies

### Required Packages

```json
{
  "dependencies": {
    "@react-navigation/native": "^6.x.x",
    "@react-navigation/native-stack": "^6.x.x",
    "react-native-screens": "^3.x.x",
    "react-native-safe-area-context": "^4.x.x",
    "expo-secure-store": "^12.x.x"
  }
}
```

### Optional (for animations)

```bash
npm install react-native-reanimated
npm install moti
npm install nativewind
```

---

## 🔍 Debugging

### Enable Debug Logging

```typescript
// In AuthService.ts
const DEBUG = __DEV__;

if (DEBUG) {
  console.log('[AuthService] Sign in request:', request);
  console.log('[AuthService] Response:', response);
}
```

### View Current Auth State

```typescript
import { useAuth } from '../context/AuthContext';

function DebugPanel() {
  const { user, token, isLoading } = useAuth();
  
  return (
    <View>
      <Text>User: {JSON.stringify(user, null, 2)}</Text>
      <Text>Token: {token?.substring(0, 20)}...</Text>
      <Text>Loading: {isLoading ? 'Yes' : 'No'}</Text>
    </View>
  );
}
```

### Check Stored Tokens

```typescript
import { getStoredTokens } from '../utils/tokenStorage';

const tokens = await getStoredTokens();
console.log('Stored tokens:', tokens);
```

---

## 📞 Need Help?

- **TypeScript errors:** Check types in `src/types/`
- **Navigation issues:** Check `src/types/navigation.ts` and `AppNavigator.tsx`
- **TOON errors:** Check `src/errors/ToonError.ts` and error mapping
- **Auth flow issues:** Add debug logs in `AuthService.ts`

---

Last Updated: 2024
