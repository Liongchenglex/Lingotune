# Authentication Feature - Requirements

## 1. Context & Intent

### Who is this for?
- **Primary Users**: New users wanting to create an account and returning users wanting to access their learning progress
- **System Actors**: Firebase Authentication service, Mobile app frontend, AsyncStorage

### Problem Being Solved
Users need a secure way to:
- Create and manage their learning account
- Access their personalized learning data across sessions and devices
- Recover access if they forget credentials
- Trust that their learning progress is protected

### Non-Goals (Out of Scope)
- Multi-factor authentication (MFA) - Future iteration
- Email verification during signup - Future iteration
- Account deletion - Separate feature
- Profile management (username, avatar) - Separate feature
- Third-party OAuth providers beyond Apple/Google - Future iteration

---

## 2. Feature Breakdown

This feature covers **4 primary flows**:

### 2.1 Email/Password Registration (Sign Up)
### 2.2 Email/Password Login (Sign In)
### 2.3 Password Reset (Forgot Password)
### 2.4 Session Management & Logout

Social login (Apple/Google) will be documented separately as it requires different flows and configurations.

---

# FLOW 1: Email/Password Registration

## 3. Actual Flow (End-to-End)

1. User opens app for first time (no session exists)
2. App displays Login screen with "Sign Up" option
3. User taps "Sign Up" / "Create Account"
4. App navigates to Sign Up screen
5. User enters email address
6. User enters password
7. User confirms password
8. User taps "Create Account" button
9. Frontend validates inputs (email format, password strength, passwords match)
10. Frontend calls Firebase Auth `createUserWithEmailAndPassword()`
11. Firebase creates account and returns user credentials
12. App stores authentication token in AsyncStorage
13. App updates AuthContext with user data
14. App navigates to Home screen
15. User sees home screen with their new account

## 4. Step-by-Step Behaviour

**Input Validation (Client-side):**
- Email must match regex: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
- Password must be >= 8 characters
- Password must contain at least 1 uppercase, 1 lowercase, 1 number
- Confirm password must exactly match password field
- All fields are required

**If validation fails:**
- Show error message below the relevant field
- Disable "Create Account" button
- Do NOT call Firebase

**If validation passes:**
- Enable "Create Account" button
- Show loading indicator when button is tapped
- Call Firebase Auth API

**On Firebase Success:**
- User object returned with `uid`, `email`, `emailVerified`
- Store auth state in AuthContext
- Navigate to Home screen immediately
- No email verification required (out of scope for v1)

**On Firebase Failure:**
- Display user-friendly error message based on error code
- Remove loading indicator
- Keep user on Sign Up screen
- Clear password fields for security

## 5. Sequence Diagram

```
User → SignUpScreen: Enter email, password, confirm password
SignUpScreen → SignUpScreen: Validate inputs (format, strength, match)
SignUpScreen → User: Show validation errors (if any)

[If validation passes]
User → SignUpScreen: Tap "Create Account"
SignUpScreen → SignUpScreen: Show loading indicator
SignUpScreen → FirebaseAuth: createUserWithEmailAndPassword(email, password)

[Success Path]
FirebaseAuth → SignUpScreen: Return user credentials (uid, email, token)
SignUpScreen → AsyncStorage: Store auth token
SignUpScreen → AuthContext: Update user state
SignUpScreen → HomeScreen: Navigate
HomeScreen → User: Display home with user data

[Error Path]
FirebaseAuth → SignUpScreen: Return error (email-already-in-use, weak-password, etc)
SignUpScreen → SignUpScreen: Hide loading, parse error
SignUpScreen → User: Show error message
```

## 6. Visual Flow

```
[Welcome/Login Screen]
        ↓ (Tap "Sign Up")
[Sign Up Screen]
  - Email input
  - Password input
  - Confirm Password input
  - Create Account button
        ↓ (Success)
[Home Screen]
        ↓ (Error)
[Sign Up Screen] (with error message)
```

## 7. Inputs & Outputs

### Inputs (Required)
- `email` (string): User's email address
- `password` (string): User's chosen password (min 8 chars)
- `confirmPassword` (string): Password confirmation

### Validation Rules
```javascript
{
  email: {
    required: true,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    errorMessage: "Please enter a valid email address"
  },
  password: {
    required: true,
    minLength: 8,
    pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/,
    errorMessage: "Password must be at least 8 characters with uppercase, lowercase, and number"
  },
  confirmPassword: {
    required: true,
    matchField: "password",
    errorMessage: "Passwords do not match"
  }
}
```

### Outputs

**Success Response:**
```javascript
{
  user: {
    uid: "firebase_user_id",
    email: "user@example.com",
    emailVerified: false,
    createdAt: "2026-01-05T12:00:00Z"
  },
  token: "firebase_auth_token"
}
```

**Error Response:**
```javascript
{
  error: {
    code: "auth/email-already-in-use",
    message: "This email is already registered. Try logging in instead."
  }
}
```

## 8. API Contracts & Payloads

### Firebase Auth Method
```javascript
// Firebase Web SDK
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../services/firebase';

createUserWithEmailAndPassword(auth, email, password)
```

**Parameters:**
- `auth`: Firebase Auth instance
- `email`: string
- `password`: string

**Returns:** Promise<UserCredential>

**UserCredential Structure:**
```typescript
{
  user: {
    uid: string;
    email: string | null;
    emailVerified: boolean;
    displayName: string | null;
    photoURL: string | null;
    metadata: {
      creationTime: string;
      lastSignInTime: string;
    }
  };
  providerId: string;
  operationType: string;
}
```

## 9. Edge Cases

### 1. Email Already Registered
- **Scenario**: User tries to sign up with an email that already exists
- **Behavior**: Show error "This email is already registered. Try logging in instead."
- **Action**: Provide link/button to navigate to Login screen

### 2. Network Offline
- **Scenario**: No internet connection during signup
- **Behavior**: Firebase throws network error
- **Action**: Show "No internet connection. Please check your connection and try again."

### 3. Rapid Re-submission
- **Scenario**: User taps "Create Account" multiple times quickly
- **Behavior**: Disable button after first tap until response received
- **Action**: Prevent duplicate API calls

### 4. Special Characters in Email
- **Scenario**: Email contains valid special chars (+ . _ -)
- **Behavior**: Accept as valid if matches email regex
- **Action**: Process normally

### 5. Password Field Auto-fill
- **Scenario**: Password manager fills password fields
- **Behavior**: Accept auto-filled values
- **Action**: Run validation on blur or submit

### 6. App Backgrounded During Signup
- **Scenario**: User switches apps while signup is in progress
- **Behavior**: Maintain loading state, wait for response
- **Action**: On app resume, complete flow or show timeout error

## 10. Failure Modes

### Client-Side Validation Errors

| Error | Code | User Message | Action |
|-------|------|--------------|--------|
| Invalid email format | `validation/invalid-email` | "Please enter a valid email address" | Show inline error |
| Weak password | `validation/weak-password` | "Password must be at least 8 characters with uppercase, lowercase, and number" | Show inline error |
| Passwords don't match | `validation/password-mismatch` | "Passwords do not match" | Show inline error |
| Empty field | `validation/required` | "This field is required" | Show inline error |

### Firebase Auth Errors

| Error Code | User Message | HTTP Status |
|-----------|--------------|-------------|
| `auth/email-already-in-use` | "This email is already registered. Try logging in instead." | 400 |
| `auth/invalid-email` | "Please enter a valid email address" | 400 |
| `auth/weak-password` | "Please choose a stronger password (min 8 characters)" | 400 |
| `auth/network-request-failed` | "No internet connection. Please check your connection and try again." | N/A |
| `auth/too-many-requests` | "Too many attempts. Please try again later." | 429 |
| `auth/operation-not-allowed` | "Sign up is currently unavailable. Please try again later." | 403 |

### System Errors

| Error | User Message | Retry Behavior |
|-------|--------------|----------------|
| AsyncStorage write failure | "Unable to save your session. Please try again." | Allow immediate retry |
| Context update failure | "Something went wrong. Please restart the app." | No auto-retry |
| Navigation failure | "Unable to proceed. Please restart the app." | No retry |

## 11. Acceptance Criteria

### Functional Requirements

- [ ] **Given** valid email and password **when** user taps "Create Account" **then** account is created and user is logged in
- [ ] **Given** invalid email format **when** user leaves email field **then** inline error message is displayed
- [ ] **Given** password < 8 characters **when** user leaves password field **then** error message is displayed
- [ ] **Given** mismatched passwords **when** user leaves confirm password field **then** error message is displayed
- [ ] **Given** all valid inputs **when** user taps "Create Account" **then** loading indicator is shown
- [ ] **Given** successful signup **when** account is created **then** user is navigated to Home screen
- [ ] **Given** email already registered **when** signup attempted **then** error message with login link is shown
- [ ] **Given** network error **when** signup attempted **then** user-friendly network error is shown
- [ ] **Given** successful signup **when** app is restarted **then** user remains logged in

### UI/UX Requirements

- [ ] Email field has keyboard type "email-address"
- [ ] Password fields have secure text entry enabled
- [ ] Password visibility toggle is available
- [ ] "Create Account" button is disabled during validation errors
- [ ] Loading spinner overlays the button during API call
- [ ] Error messages appear below their respective fields
- [ ] Error messages are red (#EF4444)
- [ ] Success navigation happens immediately (no delay)

### Security Requirements

- [ ] Password is never logged or displayed in plain text
- [ ] Password fields are cleared on error
- [ ] Auth token is stored securely in AsyncStorage
- [ ] No sensitive data is stored in plain text
- [ ] Session persists across app restarts

## 12. Open Questions / Assumptions

### Resolved Assumptions

✅ **Email verification**: Not required for v1 (users can sign up without verifying)
✅ **Password strength**: Minimum 8 chars with uppercase, lowercase, number
✅ **Auto-login**: Users are automatically logged in after successful signup
✅ **Session persistence**: Sessions persist indefinitely until explicit logout
✅ **Social signup**: Separate flow, not part of this requirement

### Open Questions

None - all assumptions documented and resolved.

---

# FLOW 2: Email/Password Login

## 3. Actual Flow (End-to-End)

1. User opens app (no active session)
2. App displays Login screen
3. User enters email address
4. User enters password
5. User optionally enables "Remember me"
6. User taps "Login" button
7. Frontend validates inputs (email format, non-empty password)
8. Frontend calls Firebase Auth `signInWithEmailAndPassword()`
9. Firebase validates credentials and returns user data
10. App stores auth token in AsyncStorage
11. App updates AuthContext with user data
12. App navigates to Home screen
13. User sees home screen with their data

## 4. Step-by-Step Behaviour

**Input Validation:**
- Email must match email regex
- Password must not be empty (no strength check on login)
- Both fields required

**If validation fails:**
- Show inline error
- Disable login button

**If validation passes:**
- Enable login button
- On tap, show loading state
- Call Firebase Auth

**On Firebase Success:**
- Store auth token
- Update AuthContext
- Navigate to Home

**On Firebase Failure:**
- Parse error code
- Show user-friendly message
- Clear password field
- Keep email field populated

## 5. Sequence Diagram

```
User → LoginScreen: Enter email and password
LoginScreen → LoginScreen: Validate inputs
LoginScreen → User: Show validation errors (if any)

[If validation passes]
User → LoginScreen: Tap "Login"
LoginScreen → LoginScreen: Show loading indicator
LoginScreen → FirebaseAuth: signInWithEmailAndPassword(email, password)

[Success Path]
FirebaseAuth → LoginScreen: Return user credentials
LoginScreen → AsyncStorage: Store auth token
LoginScreen → AuthContext: Update user state
LoginScreen → HomeScreen: Navigate
HomeScreen → User: Display home

[Error Path]
FirebaseAuth → LoginScreen: Return error (user-not-found, wrong-password, etc)
LoginScreen → LoginScreen: Hide loading, clear password
LoginScreen → User: Show error message
```

## 6. Visual Flow

```
[Login Screen]
  - Email input
  - Password input
  - Remember me checkbox
  - Login button
  - Forgot password link
  - Sign up link
        ↓ (Success)
[Home Screen]
        ↓ (Error)
[Login Screen] (with error message, password cleared)
```

## 7. Inputs & Outputs

### Inputs
- `email` (string, required)
- `password` (string, required)
- `rememberMe` (boolean, optional, default: true)

### Outputs

**Success:**
```javascript
{
  user: {
    uid: string,
    email: string,
    emailVerified: boolean
  },
  token: string
}
```

**Error:**
```javascript
{
  error: {
    code: string,
    message: string
  }
}
```

## 8. API Contracts

```javascript
import { signInWithEmailAndPassword } from 'firebase/auth';

signInWithEmailAndPassword(auth, email, password)
```

Returns: Promise<UserCredential>

## 9. Edge Cases

1. **Caps Lock On**: No warning shown (Firebase handles case-sensitive passwords)
2. **Spaces in Password**: Preserved and sent to Firebase
3. **Remember Me Disabled**: Session still persists (handled by Firebase, not custom logic)
4. **Account Exists but Wrong Password**: Generic error to prevent email enumeration
5. **Session Already Active**: Navigate directly to Home

## 10. Failure Modes

| Error Code | User Message |
|-----------|--------------|
| `auth/user-not-found` | "Invalid email or password" |
| `auth/wrong-password` | "Invalid email or password" |
| `auth/invalid-email` | "Please enter a valid email address" |
| `auth/user-disabled` | "This account has been disabled. Contact support." |
| `auth/too-many-requests` | "Too many failed attempts. Try again later or reset your password." |
| `auth/network-request-failed` | "No internet connection. Please check and try again." |

## 11. Acceptance Criteria

- [ ] **Given** valid credentials **when** login tapped **then** user navigates to Home
- [ ] **Given** invalid credentials **when** login tapped **then** error shown
- [ ] **Given** wrong password **when** login attempted **then** generic error shown (no email enumeration)
- [ ] **Given** successful login **when** app restarts **then** user remains logged in
- [ ] **Given** network error **when** login attempted **then** network error shown
- [ ] **Given** too many attempts **when** login attempted **then** lockout message shown
- [ ] Password field is cleared on error
- [ ] Email field is preserved on error
- [ ] Loading indicator shown during authentication
- [ ] Forgot password link is visible and functional

---

# FLOW 3: Password Reset

## 3. Actual Flow

1. User on Login screen taps "Forgot Password"
2. App navigates to Password Reset screen
3. User enters email address
4. User taps "Send Reset Link"
5. Frontend validates email format
6. Frontend calls Firebase Auth `sendPasswordResetEmail()`
7. Firebase sends password reset email
8. App shows success message
9. User receives email with reset link
10. User clicks link in email
11. Browser/app opens Firebase password reset page
12. User enters new password
13. Firebase updates password
14. User can now log in with new password

## 4. Step-by-Step Behaviour

**Input Validation:**
- Email must match email regex
- Email is required

**If validation fails:**
- Show inline error
- Disable "Send Reset Link" button

**If validation passes:**
- Call Firebase `sendPasswordResetEmail()`
- Always show success message (even if email doesn't exist - prevents enumeration)

**On Success:**
- Show "If this email exists, you'll receive a reset link"
- Provide button to return to login

**On Error:**
- Show generic network error if applicable
- Don't reveal if email exists or not

## 5. Sequence Diagram

```
User → LoginScreen: Tap "Forgot Password"
LoginScreen → PasswordResetScreen: Navigate

User → PasswordResetScreen: Enter email
PasswordResetScreen → PasswordResetScreen: Validate email format
PasswordResetScreen → User: Show validation error (if invalid)

[If valid]
User → PasswordResetScreen: Tap "Send Reset Link"
PasswordResetScreen → FirebaseAuth: sendPasswordResetEmail(email)
FirebaseAuth → Email Service: Send reset link to email
FirebaseAuth → PasswordResetScreen: Success (always, even if email not found)
PasswordResetScreen → User: Show "Check your email" message

[User receives email]
User → Email: Click reset link
Email → Browser/App: Open Firebase reset page
User → Firebase Reset Page: Enter new password
Firebase Reset Page → FirebaseAuth: Update password
FirebaseAuth → Firebase Reset Page: Success
Firebase Reset Page → User: Show success, prompt to log in
```

## 6. Visual Flow

```
[Login Screen]
        ↓ (Tap "Forgot Password")
[Password Reset Screen]
  - Email input
  - Send Reset Link button
  - Back to Login link
        ↓
[Success Message Screen]
  "Check your email for reset link"
  - Back to Login button
```

## 7. Inputs & Outputs

### Input
- `email` (string, required)

### Output
**Always Success (prevents email enumeration):**
```javascript
{
  success: true,
  message: "If this email exists, you'll receive a password reset link."
}
```

## 8. API Contract

```javascript
import { sendPasswordResetEmail } from 'firebase/auth';

sendPasswordResetEmail(auth, email)
```

Returns: Promise<void>

## 9. Edge Cases

1. **Email Doesn't Exist**: Still show success message
2. **Multiple Reset Requests**: Each request sends a new email (old links still valid until used)
3. **Reset Link Expiration**: Firebase handles (typically 1 hour)
4. **User Resets Then Tries to Login with Old Password**: Shows wrong password error

## 10. Failure Modes

| Error | User Message |
|-------|--------------|
| `auth/invalid-email` | "Please enter a valid email address" |
| `auth/network-request-failed` | "Unable to send reset email. Check your connection." |
| Any other error | "If this email exists, you'll receive a reset link." |

## 11. Acceptance Criteria

- [ ] **Given** valid email **when** reset requested **then** success message shown
- [ ] **Given** invalid email **when** reset requested **then** validation error shown
- [ ] **Given** non-existent email **when** reset requested **then** generic success shown (no enumeration)
- [ ] **Given** reset email sent **when** user checks inbox **then** email with reset link received
- [ ] **Given** expired reset link **when** clicked **then** Firebase shows expired error
- [ ] **Given** password reset **when** user logs in **then** new password works
- [ ] Success message includes "Back to Login" button
- [ ] Email field preserved after sending (in case user wants to resend)

---

# FLOW 4: Session Management & Logout

## 3. Actual Flow - Session Persistence

1. User successfully logs in or signs up
2. Firebase returns auth token
3. App stores token in AsyncStorage
4. App updates AuthContext with user state
5. User closes app
6. User reopens app
7. App reads token from AsyncStorage on mount
8. Firebase validates token automatically
9. If valid: App shows Home screen
10. If invalid/expired: App shows Login screen

## 4. Step-by-Step Behaviour - Session

**On App Launch:**
- Check AsyncStorage for auth token
- If found: Firebase auto-validates
- If valid: Navigate to Home
- If invalid: Navigate to Login
- If not found: Navigate to Login

**Session Refresh:**
- Firebase handles token refresh automatically
- No manual refresh needed
- Token valid until explicit logout

## 5. Sequence Diagram - Session

```
App Launch → AsyncStorage: Check for auth token
AsyncStorage → App: Return token (or null)

[If token exists]
App → FirebaseAuth: Validate token
FirebaseAuth → App: Token valid/invalid
App → HomeScreen: Navigate (if valid)
App → LoginScreen: Navigate (if invalid)

[If no token]
App → LoginScreen: Navigate
```

## 3. Actual Flow - Logout

1. User on Home screen taps profile/menu
2. User taps "Logout"
3. App calls Firebase Auth `signOut()`
4. Firebase clears auth session
5. App clears AsyncStorage token
6. App resets AuthContext to null
7. App navigates to Login screen

## 4. Step-by-Step Behaviour - Logout

**No Confirmation Prompt (v1):**
- Direct logout on tap
- Instant feedback

**Logout Process:**
1. Call Firebase signOut()
2. Clear AsyncStorage
3. Reset AuthContext
4. Navigate to Login

**If Logout Fails:**
- Still clear local state
- Navigate to Login
- Log error for debugging

## 5. Sequence Diagram - Logout

```
User → HomeScreen: Tap "Logout"
HomeScreen → FirebaseAuth: signOut()
FirebaseAuth → HomeScreen: Success
HomeScreen → AsyncStorage: Clear token
HomeScreen → AuthContext: Set user to null
HomeScreen → LoginScreen: Navigate
LoginScreen → User: Show login screen
```

## 6. Visual Flow

```
[Home Screen]
        ↓ (Tap Logout)
[Login Screen]
```

## 7. Inputs & Outputs

### Logout
**Input**: None
**Output**:
```javascript
{
  success: true
}
```

## 8. API Contract

```javascript
import { signOut } from 'firebase/auth';

signOut(auth)
```

Returns: Promise<void>

## 9. Edge Cases

1. **Logout During Network Failure**: Still logout locally and navigate to login
2. **Multiple Logout Calls**: Idempotent (safe to call multiple times)
3. **Session Expired**: Auto-logout, navigate to login

## 10. Failure Modes

| Scenario | Behavior |
|----------|----------|
| Firebase signOut fails | Clear local state anyway, navigate to login |
| AsyncStorage clear fails | Log error, still navigate to login |
| Already logged out | No-op, navigate to login |

## 11. Acceptance Criteria

### Session Persistence
- [ ] **Given** logged in user **when** app is closed and reopened **then** user remains logged in
- [ ] **Given** expired session **when** app opens **then** user sees login screen
- [ ] **Given** no session **when** app opens **then** user sees login screen
- [ ] Session persists across device restarts

### Logout
- [ ] **Given** logged in user **when** logout tapped **then** user navigates to login screen
- [ ] **Given** logged out **when** app is restarted **then** login screen is shown
- [ ] **Given** network error during logout **when** logout attempted **then** still logs out locally
- [ ] AuthContext is reset to null after logout
- [ ] AsyncStorage is cleared after logout
- [ ] User cannot navigate back to Home after logout

---

## 13. Open Questions / Assumptions (Global)

### Resolved
✅ Email verification not required for v1
✅ No MFA for v1
✅ No logout confirmation prompt for v1
✅ Sessions persist indefinitely until logout
✅ Password reset handled by Firebase hosted page
✅ Social login (Apple/Google) documented separately

### Pending
None

---

## Summary Checklist

This requirement document includes:
- [x] Context & Intent
- [x] Actual Flow (for all 4 flows)
- [x] Step-by-Step Behaviour
- [x] Sequence Diagrams
- [x] Visual Flow
- [x] Inputs & Outputs
- [x] API Contracts
- [x] Edge Cases
- [x] Failure Modes
- [x] Acceptance Criteria
- [x] Open Questions

**Status**: ✅ COMPLETE - Ready for implementation
