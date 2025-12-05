# TOON Error Code Mapping Reference

## Overview
This document maps TOON error codes to user-friendly messages for the mobile app authentication flow.

---

## 🔐 Authentication Error Codes

### Server → Mobile Error Mapping

| TOON Code | Technical Meaning | User-Friendly Message | HTTP Status |
|-----------|-------------------|----------------------|-------------|
| `ERR1` | Invalid credentials | "Invalid email or PIN. Please try again." | 401 |
| `ERR2` | Account locked | "Your account has been locked. Please contact support." | 403 |
| `ERR3` | Missing token/field | "Missing required information. Please check your credentials." | 400 |
| `invalid_credentials` | Generic auth failure | "Invalid email or PIN. Please try again." | 401 |
| `account_locked` | Account disabled | "Your account has been locked. Please contact support." | 403 |
| `network_error` | Connection issue | "Network error. Please check your connection and try again." | - |
| `server_error` | Server failure | "Server error. Please try again later." | 500 |
| `default` | Unknown error | "Login failed. Please try again." | - |

---

## 📋 Implementation in LoginScreen

```typescript
const ERROR_MESSAGES: Record<string, string> = {
  ERR1: 'Invalid email or PIN. Please try again.',
  ERR2: 'Your account has been locked. Please contact support.',
  ERR3: 'Missing required information. Please check your credentials.',
  invalid_credentials: 'Invalid email or PIN. Please try again.',
  account_locked: 'Your account has been locked. Please contact support.',
  network_error: 'Network error. Please check your connection and try again.',
  server_error: 'Server error. Please try again later.',
  default: 'Login failed. Please try again.',
};
```

### Error Detection Flow

```typescript
try {
  await signIn(email, pin);
} catch (error) {
  if (error instanceof ToonAuthError) {
    const code = (error as any).code || '';
    message = ERROR_MESSAGES[code] || ERROR_MESSAGES.default;
  } else if (error instanceof Error) {
    if (error.message.includes('network')) {
      message = ERROR_MESSAGES.network_error;
    } else if (error.message.includes('server')) {
      message = ERROR_MESSAGES.server_error;
    }
  }
  setErrorMessage(message);
}
```

---

## 🔄 TOON Response Structure

### Success Response
```
T1=signin_response
S1=true
A1=eyJhbGc...         # Access token
A2=eyJhbGc...         # Refresh token
E1=emp_123            # User ID
U1=john@company.com   # Email
U2=John Doe           # Name
R1=EMP                # Role
EX1=3600              # Expires in (seconds)
```

### Error Response
```
T1=signin_response
S1=false
ERR=ERR1              # Error code
MSG=Invalid credentials
```

---

## 🎨 UI Error Display

### Error Container Styling
```typescript
errorContainer: {
  backgroundColor: '#fff5f5',
  borderRadius: 8,
  padding: 12,
  marginBottom: 16,
  borderLeftWidth: 4,
  borderLeftColor: '#ff3b30',
}

errorText: {
  color: '#ff3b30',
  fontSize: 14,
  fontWeight: '500',
}
```

### Input Error State
```typescript
inputError: {
  borderColor: '#ff3b30',
  backgroundColor: '#fff5f5',
}
```

---

## 🛡️ Security Considerations

### PIN Input Handling
- **Masked input:** `secureTextEntry={true}`
- **Numeric keyboard:** `keyboardType="number-pad"`
- **Max length:** `maxLength={6}`
- **No autocomplete:** `autoComplete="off"`

### Rate Limiting (Server Side)
Server should implement rate limiting to prevent brute-force attacks:
- Max 5 attempts per 15 minutes per IP
- Temporary account lock after 10 failed attempts
- CAPTCHA after 3 failed attempts (optional)

### Token Security
- Tokens stored in SecureStore (encrypted keychain)
- Never log tokens in console
- Clear tokens on signout
- Refresh before expiry

---

## 📊 Error Analytics (Future)

### Tracking Error Codes
```typescript
// Example analytics event
analytics.track('auth_error', {
  error_code: 'ERR1',
  user_action: 'login',
  timestamp: Date.now(),
  platform: Platform.OS,
});
```

### Useful Metrics
- Error code distribution (which errors are most common)
- Time to successful login after error
- Retry attempts per session
- Network error vs auth error ratio

---

## 🧪 Testing Error Scenarios

### Manual Test Cases

| Test Case | Expected Behavior |
|-----------|-------------------|
| Valid email + valid PIN | Success, navigate to home |
| Valid email + wrong PIN | Show ERR1 message |
| Wrong email + valid PIN | Show ERR1 message |
| Locked account | Show ERR2 message |
| Empty email | Show "Please enter your email" |
| Empty PIN | Show "Please enter your PIN" |
| Network offline | Show network_error message |
| Server down | Show server_error message |
| Malformed TOON response | Show default message |

### Mock Server Responses

**Success:**
```typescript
{
  success: true,
  accessToken: 'T1=access...',
  refreshToken: 'T1=refresh...',
  user: { id: '123', email: 'test@test.com', name: 'Test', role: 'EMP' },
  expiresIn: 3600,
}
```

**ERR1 (Invalid Credentials):**
```typescript
{
  success: false,
  error: { code: 'ERR1', message: 'Invalid credentials' }
}
```

**ERR2 (Account Locked):**
```typescript
{
  success: false,
  error: { code: 'ERR2', message: 'Account locked' }
}
```

---

## 🔧 Backend Requirements

### TOON Auth Endpoint: `/auth/login`

**Request:**
```
T1=signin
U1=user@company.com
U2=1234
```

**Response (Success):**
```
T1=signin_response
S1=true
A1=<access_token>
A2=<refresh_token>
E1=<user_id>
U1=<email>
U2=<name>
R1=<role>
EX1=3600
```

**Response (Error):**
```
T1=signin_response
S1=false
ERR=<error_code>
MSG=<error_message>
```

### Error Code Decision Logic

```typescript
// Pseudocode for backend
function authenticateUser(email, pin) {
  const user = findUserByEmail(email);
  
  if (!user) {
    return { success: false, error: { code: 'ERR1', message: 'Invalid credentials' } };
  }
  
  if (user.locked) {
    return { success: false, error: { code: 'ERR2', message: 'Account locked' } };
  }
  
  if (!verifyPin(user, pin)) {
    incrementFailedAttempts(user);
    if (user.failedAttempts >= 10) {
      lockAccount(user);
      return { success: false, error: { code: 'ERR2', message: 'Account locked due to too many failed attempts' } };
    }
    return { success: false, error: { code: 'ERR1', message: 'Invalid credentials' } };
  }
  
  resetFailedAttempts(user);
  const tokens = generateTokens(user);
  return { success: true, ...tokens, user };
}
```

---

## 📱 Mobile Implementation Files

- **Error Mapping:** `src/screens/auth/LoginScreen.tsx`
- **Error Types:** `src/errors/ToonError.ts`
- **Auth Service:** `src/services/AuthService.ts`
- **TOON Client:** `src/services/api/ToonClient.ts`

---

## 🚨 Common Pitfalls

### ❌ Don't Do This
```typescript
// Leaking error details to user
setErrorMessage(error.message); // Might expose internal details

// Logging sensitive data
console.log('Login failed:', email, pin); // Never log credentials
```

### ✅ Do This Instead
```typescript
// Map to user-friendly message
const message = ERROR_MESSAGES[code] || ERROR_MESSAGES.default;
setErrorMessage(message);

// Log safely
console.log('Login failed for user:', email.substring(0, 3) + '***');
```

---

## 📞 Support Contact

For error code questions or new error scenarios:
- **Backend Team:** Check server logs for detailed error context
- **Mobile Team:** Update ERROR_MESSAGES constant in LoginScreen
- **QA Team:** Add test cases to error scenario suite

---

Last Updated: 2024
