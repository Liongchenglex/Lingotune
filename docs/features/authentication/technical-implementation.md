# Authentication Feature - Technical Implementation

## Overview

This document describes the technical implementation of the authentication feature.

## Tech Stack

- **Firebase Authentication** - Backend authentication service
- **React Context API** - State management for auth
- **AsyncStorage** - Persistent session storage
- **Expo** - Mobile framework

## Architecture

### Files Created

```
src/
├── utils/
│   └── validation.ts          # Email/password validation utilities
├── contexts/
│   └── AuthContext.tsx        # Authentication state management (existing, to be enhanced)
├── screens/
│   └── auth/
│       ├── SignUpScreen.tsx   # (In progress)
│       ├── LoginScreen.tsx    # (In progress)
│       └── ForgotPasswordScreen.tsx  # (In progress)
└── services/
    └── firebase.ts            # Firebase configuration (existing)
```

### Data Flow

```
User Input → Validation (validation.ts) → AuthContext → Firebase Auth → AsyncStorage → UI Update
```

## Implementation Details

### 1. Validation Utilities (✅ Complete)

**File:** `src/utils/validation.ts`

Implements client-side validation per requirements:

- **validateEmail()**: Email format validation using regex `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
- **validatePassword()**: Password strength (min 8 chars, uppercase, lowercase, number)
- **validatePasswordMatch()**: Confirm password matches
- **validateLoginPassword()**: Simple non-empty check for login

**Returns:** `{ isValid: boolean, error?: string }`

**Usage Example:**
```typescript
const emailResult = validateEmail('user@example.com');
if (!emailResult.isValid) {
  // Show error: emailResult.error
}
```

### 2. AuthContext Enhancement (✅ Complete)

**File:** `src/contexts/AuthContext.tsx`

Added `resetPassword` method and Firestore user document creation to existing context.

**Methods:**
- `signUp(email, password)` - Creates account with Firebase Auth AND Firestore user document
- `signIn(email, password)` - Authenticates user
- `signOut()` - Logs out user
- `resetPassword(email)` - Sends password reset email

**State:**
- `user`: Current user object or null
- `loading`: Initial auth state loading

**User Document Creation (Updated 2026-01-05):**

When a user signs up, the `signUp` function now:
1. Creates Firebase Authentication account
2. Creates a user document in Firestore at `/users/{uid}` with:
   - `uid` - User's unique ID
   - `email` - User's email address
   - `createdAt` - Server timestamp of account creation
   - `updatedAt` - Server timestamp (initially same as createdAt)

**Error Handling:**
If the Firestore document creation fails, the Firebase Auth account is automatically deleted to maintain data consistency. This prevents orphaned auth accounts without corresponding user documents.

```typescript
const signUp = async (email: string, password: string) => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;

  try {
    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      email: user.email,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    // Rollback: Delete auth account if Firestore write fails
    await user.delete();
    throw error;
  }
};
```

### 3. SignUp Screen (✅ Complete)

**File:** `src/screens/auth/SignUpScreen.tsx`

**Features Implemented:**
- ✅ Email, password, confirm password inputs
- ✅ Real-time validation on blur
- ✅ Password visibility toggles
- ✅ Loading state during signup
- ✅ Disabled button when validation fails
- ✅ Firebase error mapping to user-friendly messages
- ✅ Clear passwords on error (security)
- ✅ Link to login screen

**Error Handling:**
| Firebase Error | User Message |
|---|---|
| `auth/email-already-in-use` | "This email is already registered. Try logging in instead." |
| `auth/invalid-email` | "Please enter a valid email address" |
| `auth/weak-password` | "Please choose a stronger password (min 8 characters)" |
| `auth/network-request-failed` | "No internet connection. Please check your connection and try again." |
| `auth/too-many-requests` | "Too many attempts. Please try again later." |

**UI/UX:**
- Email keyboard type
- Secure text entry for passwords
- Password visibility toggle (👁️)
- Inline error messages (red)
- Disabled button when invalid
- Loading spinner on button

### 4. Login Screen (✅ Complete)

**File:** `src/screens/auth/LoginScreen.tsx`

**Features Implemented:**
- ✅ Email and password inputs
- ✅ Validation on blur
- ✅ Password visibility toggle
- ✅ Loading state during login
- ✅ Generic error messages for wrong password/user-not-found (prevents email enumeration)
- ✅ Clears password on error, preserves email
- ✅ Forgot password link
- ✅ Sign up link

**Error Handling:**
| Firebase Error | User Message |
|---|---|
| `auth/user-not-found` | "Invalid email or password" (generic) |
| `auth/wrong-password` | "Invalid email or password" (generic) |
| `auth/invalid-email` | "Please enter a valid email address" |
| `auth/user-disabled` | "This account has been disabled. Contact support." |
| `auth/too-many-requests` | "Too many failed attempts. Try again later or reset your password." |
| `auth/network-request-failed` | "No internet connection. Please check and try again." |

### 5. Forgot Password Screen (✅ Complete)

**File:** `src/screens/auth/ForgotPasswordScreen.tsx`

**Features Implemented:**
- ✅ Email input with validation
- ✅ Sends password reset email via Firebase
- ✅ Always shows success message (prevents email enumeration)
- ✅ Success banner when email sent
- ✅ Resend functionality
- ✅ Back to login link

**Security Feature:**
- Shows generic success message even if email doesn't exist
- Only reveals errors for network/validation issues
- Prevents email enumeration attacks

**Message:**
> "If this email exists, you'll receive a password reset link."

### 6. App Navigation (✅ Complete)

**File:** `App.tsx`

**Navigation Logic:**
```typescript
if (loading) return <LoadingScreen />;
if (user) return <HomeScreen />;

// Auth screens with state management
authScreen === 'login' → LoginScreen
authScreen === 'signup' → SignUpScreen
authScreen === 'forgot-password' → ForgotPasswordScreen
```

**State Management:**
- Simple `useState` for auth screen navigation
- AuthContext `user` state determines authenticated state
- Automatic navigation to Home when user signs up/in

**Screen Transitions:**
- Login ↔ Sign Up
- Login → Forgot Password → Login
- Any Auth Screen → Home (on successful auth)

## Security Considerations

### 1. Password Security
- ✅ Passwords never logged or stored in plain text
- ✅ Secure text entry enabled on all password fields
- ✅ Password fields cleared on authentication errors
- ✅ Password strength enforced client-side (signup only)

### 2. Email Enumeration Prevention
- ✅ Login: Generic "Invalid email or password" for wrong password AND user not found
- ✅ Password Reset: Generic success message even if email doesn't exist
- ✅ No distinction between existing and non-existing emails in error messages

### 3. Session Management
- ✅ Firebase handles token refresh automatically
- ✅ Tokens stored securely (Firebase SDK manages this)
- ✅ `onAuthStateChanged` listener persists session across app restarts
- ✅ Logout clears session completely

### 4. Input Validation
- ✅ Client-side validation prevents invalid data from reaching Firebase
- ✅ Firebase provides server-side validation as second layer
- ✅ All error messages are user-friendly (no technical details exposed)

### 5. Rate Limiting
- ✅ Firebase automatically rate limits authentication attempts
- ✅ Too many requests shows clear error to user

## Testing

### Manual Testing Checklist

#### Sign Up Flow
- [ ] Valid email and password creates account
- [ ] **User document created in Firestore `/users/{uid}` collection** (Updated 2026-01-05)
- [ ] **User document contains: uid, email, createdAt, updatedAt** (Updated 2026-01-05)
- [ ] Invalid email shows error
- [ ] Weak password shows error
- [ ] Mismatched passwords show error
- [ ] Email already in use shows error with login link
- [ ] Successful signup navigates to Home
- [ ] Password fields cleared on error
- [ ] App restart maintains logged-in session
- [ ] **If Firestore write fails, auth account is deleted (rollback)** (Updated 2026-01-05)

#### Login Flow
- [ ] Valid credentials log in successfully
- [ ] Invalid credentials show generic error
- [ ] Wrong password shows generic error (not "wrong password")
- [ ] User not found shows generic error (not "user not found")
- [ ] Password field cleared on error
- [ ] Email field preserved on error
- [ ] Forgot password link navigates correctly
- [ ] Sign up link navigates correctly

#### Forgot Password Flow
- [ ] Valid email sends reset email
- [ ] Invalid email format shows validation error
- [ ] Non-existent email shows success (security)
- [ ] Success message displays after sending
- [ ] Can resend email
- [ ] Back to login navigates correctly

#### Session Persistence
- [ ] Close and reopen app → user still logged in
- [ ] Force quit app → user still logged in
- [ ] Logout → app restart shows login screen

#### Error Handling
- [ ] Network offline shows appropriate error
- [ ] Too many requests shows rate limit error
- [ ] All errors are user-friendly

### Test Accounts

Create test Firebase accounts for each scenario:
- Valid user: `test@example.com` / `Test1234`
- Disabled account: (disable in Firebase Console)
- Non-existent email: `doesnotexist@example.com`

## Implementation Status

| Component | Status | File |
|-----------|--------|------|
| Validation Utils | ✅ Complete | `src/utils/validation.ts` |
| AuthContext | ✅ Complete | `src/contexts/AuthContext.tsx` |
| SignUp Screen | ✅ Complete | `src/screens/auth/SignUpScreen.tsx` |
| Login Screen | ✅ Complete | `src/screens/auth/LoginScreen.tsx` |
| Forgot Password | ✅ Complete | `src/screens/auth/ForgotPasswordScreen.tsx` |
| App Navigation | ✅ Complete | `App.tsx` |
| Session Persistence | ✅ Complete | Built into Firebase/AuthContext |
| **Security Rules** | ✅ Complete | `firestore.rules`, `storage.rules` |

**Overall Status:** ✅ **READY FOR TESTING**

---

## Security Implementation (Added 2026-01-05)

### Firebase Security Rules

To comply with the security-playbook.md requirements, Firebase Security Rules have been implemented to protect user data.

#### Firestore Security Rules

**File:** `firestore.rules`

**Key Features:**
- ✅ Deny all by default (fail closed)
- ✅ Per-user data scoping enforced
- ✅ Users can only access their own data
- ✅ Public content (lessons, courses) is read-only for authenticated users
- ✅ Admin operations isolated (use Admin SDK, not client)

**Protected Collections:**

1. **User Data** (`/users/{userId}`)
   - Read/write only by owner (request.auth.uid == userId)
   - Prevents cross-user data access
   - Private subcollections scoped to owner

2. **Learning Progress** (`/progress/{userId}`)
   - Per-user progress tracking
   - Subcollections for lessons and vocabulary
   - Owner-only access

3. **User Achievements** (`/achievements/{userId}`)
   - Owner-only read/write access

4. **User Notes** (`/notes/{noteId}`)
   - Scoped by userId field in document
   - Owner must match authenticated user

5. **Public Content** (lessons, courses, vocabulary)
   - Read-only for authenticated users
   - Writes only via Admin SDK (not from client)

**Example Rule:**
```javascript
match /users/{userId} {
  allow read: if request.auth != null && request.auth.uid == userId;
  allow create: if request.auth != null && request.auth.uid == userId;
  allow update: if request.auth != null && request.auth.uid == userId;
}
```

#### Firebase Storage Security Rules

**File:** `storage.rules`

**Key Features:**
- ✅ Deny all by default (fail closed)
- ✅ User files scoped to user ID
- ✅ File size limits enforced
- ✅ File type validation (images, audio)

**Protected Paths:**

1. **Profile Pictures** (`/users/{userId}/profile/`)
   - Read: Any authenticated user
   - Write: Owner only
   - Max size: 5MB
   - Type: Images only

2. **Audio Recordings** (`/users/{userId}/audio/`)
   - Read/write: Owner only
   - Max size: 10MB
   - Type: Audio only

3. **Private Files** (`/users/{userId}/files/`)
   - Read/write: Owner only
   - Max size: 20MB

4. **Public Content** (`/content/`)
   - Read: Authenticated users
   - Write: Admin SDK only

**Example Rule:**
```javascript
match /users/{userId}/profile/{fileName} {
  allow read: if request.auth != null;
  allow write: if request.auth != null
               && request.auth.uid == userId
               && request.resource.contentType.matches('image/.*')
               && request.resource.size < 5 * 1024 * 1024;
}
```

#### Deployment Status

**Staging Environment (`lingoleap---staging`):**
- ✅ Firestore rules deployed (2026-01-05)
- ⚠️ Storage rules pending - Storage needs initialization in Firebase Console

**Production Environment (`lingoleap-56ead`):**
- ⏳ Firestore rules ready for deployment
- ⏳ Storage rules ready for deployment

**Deployment Commands:**
```bash
# Deploy to staging
firebase deploy --only firestore:rules --project staging

# Deploy to production (when ready)
firebase deploy --only firestore:rules --project production
```

**Storage Setup Required:**
Before deploying Storage rules, Firebase Storage must be initialized in the Firebase Console:
1. Visit: https://console.firebase.google.com/project/lingoleap---staging/storage
2. Click "Get Started" and select a location
3. Then deploy: `firebase deploy --only storage:rules --project staging`

#### Security Compliance

These rules address the critical security blockers identified in the security review:

1. ✅ **Authorization (AuthZ)** - Per-user data scoping enforced via security rules
2. ✅ **Data Access** - Database rules prevent unauthorized access
3. ✅ **Ownership Validation** - Rules check request.auth.uid matches resource owner
4. ✅ **Cross-user Access Prevention** - Impossible by default (deny all, then whitelist owner)

**References:**
- Full security review: `docs/features/authentication/security-review.md`
- Deployment guide: `SECURITY_RULES_DEPLOYMENT.md`
- Security playbook: `security-playbook.md`
