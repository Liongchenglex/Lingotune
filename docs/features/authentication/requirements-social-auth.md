# Social Authentication Feature - Requirements

## 1. Context & Intent

### Who is this for?
- **Primary Users**: Users who want quick signup/login without creating a password
- **System Actors**: Firebase Authentication, Google OAuth provider, Apple Sign In provider, Mobile app frontend, AsyncStorage

### Problem Being Solved
Users need:
- Faster onboarding without remembering another password
- Trusted authentication via existing Google/Apple accounts
- Seamless account linking if they already have an email/password account
- Single sign-on experience across devices

### Non-Goals (Out of Scope)
- Facebook authentication - Future iteration
- Twitter/X authentication - Future iteration
- Other OAuth providers - Future iteration
- Linking multiple social providers to one account - Future iteration
- Manual account unlinking - Future iteration
- Social profile data sync (avatar, name) - Future iteration

---

## 2. Feature Breakdown

This feature covers **2 primary social login providers**:

### 2.1 Google Sign In
### 2.2 Apple Sign In

Both providers follow similar flows but have platform-specific requirements and configurations.

---

# FLOW 1: Google Sign In

## 3. Actual Flow (End-to-End)

1. User opens app (no session exists)
2. App displays Login screen
3. User taps "Continue with Google" button
4. App initiates Google OAuth flow
5. Google sign-in sheet appears (native or web-based)
6. User selects Google account
7. User grants permissions (email, profile)
8. Google returns authorization code/token
9. Firebase exchanges token for user credentials
10. **If account exists**: User is logged in immediately
11. **If new account**: Firebase creates account with Google provider
12. App stores auth token in AsyncStorage
13. App updates AuthContext with user data
14. App navigates to Home screen
15. User sees home screen with their account

## 4. Step-by-Step Behaviour

**Button Tap:**
- Show loading indicator on button
- Disable all other auth buttons
- Launch Google OAuth flow

**Google Sign-In Sheet:**
- Handled by Google SDK (native) or web popup
- User selects account or signs in
- User sees permission screen (email, basic profile)
- User approves or cancels

**On User Approval:**
- Google returns credentials to Firebase
- Firebase validates with Google servers
- Firebase creates or retrieves user account

**If Account Exists (Email Match):**
- Link Google provider to existing account
- User is logged in
- Navigate to Home

**If New Account:**
- Firebase creates new user with Google provider
- User automatically logged in
- Navigate to Home

**On User Cancellation:**
- Close Google sign-in sheet
- Return to Login screen
- Re-enable auth buttons
- No error message shown

**On Error:**
- Parse error code
- Show user-friendly error message
- Re-enable auth buttons
- Log error for debugging

## 5. Sequence Diagram

```
User → LoginScreen: Tap "Continue with Google"
LoginScreen → LoginScreen: Show loading on button
LoginScreen → GoogleAuth: Launch OAuth flow
GoogleAuth → User: Show account selection sheet

[User selects account]
User → GoogleAuth: Select account and grant permissions
GoogleAuth → GoogleServers: Validate user and get token
GoogleServers → GoogleAuth: Return auth token
GoogleAuth → FirebaseAuth: Exchange token for Firebase credentials

[Account Exists]
FirebaseAuth → FirebaseAuth: Link Google provider to existing account
FirebaseAuth → LoginScreen: Return user credentials
LoginScreen → AsyncStorage: Store auth token
LoginScreen → AuthContext: Update user state
LoginScreen → HomeScreen: Navigate

[New Account]
FirebaseAuth → FirebaseAuth: Create new user with Google provider
FirebaseAuth → LoginScreen: Return new user credentials
LoginScreen → AsyncStorage: Store auth token
LoginScreen → AuthContext: Update user state
LoginScreen → HomeScreen: Navigate

[User Cancels]
GoogleAuth → LoginScreen: Return cancellation
LoginScreen → LoginScreen: Hide loading, enable buttons
LoginScreen → User: Stay on login screen

[Error]
GoogleAuth → LoginScreen: Return error
LoginScreen → LoginScreen: Hide loading, parse error
LoginScreen → User: Show error message
```

## 6. Visual Flow

```
[Login Screen]
  - Email/Password inputs
  - Login button
  - Sign Up link
  - "Continue with Google" button ← User taps
  - "Continue with Apple" button
        ↓
[Google Account Selection]
  (Native Google sign-in sheet)
        ↓ (Success)
[Home Screen]
        ↓ (Cancel)
[Login Screen] (no error shown)
        ↓ (Error)
[Login Screen] (with error message)
```

## 7. Inputs & Outputs

### Inputs
- **User Action**: Tap "Continue with Google" button
- **User Selection**: Google account from device accounts
- **Permissions**: Email, basic profile access

### Outputs

**Success - Existing Account:**
```javascript
{
  user: {
    uid: "firebase_user_id",
    email: "user@gmail.com",
    emailVerified: true,
    displayName: "John Doe",
    photoURL: "https://lh3.googleusercontent.com/...",
    providerId: "google.com",
    providerData: [{
      providerId: "google.com",
      uid: "google_user_id",
      email: "user@gmail.com",
      displayName: "John Doe",
      photoURL: "https://..."
    }]
  },
  token: "firebase_auth_token"
}
```

**Success - New Account:**
```javascript
{
  user: {
    uid: "firebase_user_id_new",
    email: "newuser@gmail.com",
    emailVerified: true,
    displayName: "Jane Smith",
    photoURL: "https://lh3.googleusercontent.com/...",
    providerId: "google.com",
    metadata: {
      creationTime: "2026-01-05T12:00:00Z",
      lastSignInTime: "2026-01-05T12:00:00Z"
    }
  },
  token: "firebase_auth_token"
}
```

**Cancellation:**
```javascript
{
  cancelled: true
}
```

**Error:**
```javascript
{
  error: {
    code: "auth/popup-closed-by-user",
    message: "Sign-in cancelled"
  }
}
```

## 8. API Contracts & Payloads

### Firebase Auth with Google (React Native/Expo)

**Using Firebase Web SDK + Expo AuthSession:**

```javascript
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import * as Google from 'expo-auth-session/providers/google';
import { auth } from '../services/firebase';

// 1. Configure Google OAuth
const [request, response, promptAsync] = Google.useAuthRequest({
  expoClientId: 'YOUR_EXPO_CLIENT_ID',
  iosClientId: 'YOUR_IOS_CLIENT_ID',
  androidClientId: 'YOUR_ANDROID_CLIENT_ID',
  webClientId: 'YOUR_WEB_CLIENT_ID', // Firebase web client ID
});

// 2. Trigger Google sign-in
await promptAsync();

// 3. Exchange token with Firebase
const credential = GoogleAuthProvider.credential(idToken, accessToken);
const result = await signInWithCredential(auth, credential);
```

**Parameters:**
- `idToken`: Google ID token (from OAuth response)
- `accessToken`: Google access token (from OAuth response)

**Returns:** Promise<UserCredential>

### Configuration Requirements

**Firebase Console:**
- Enable Google as sign-in provider
- Add OAuth redirect URLs
- Note Web Client ID

**Google Cloud Console:**
- Create OAuth 2.0 credentials
- Configure consent screen
- Add authorized redirect URIs

**Expo app.json:**
```json
{
  "expo": {
    "android": {
      "googleServicesFile": "./google-services.json"
    },
    "ios": {
      "googleServicesFile": "./GoogleService-Info.plist"
    }
  }
}
```

## 9. Edge Cases

### 1. Google Account Not on Device
- **Scenario**: User has no Google accounts signed in to device
- **Behavior**: Google prompts for email/password login
- **Action**: Allow web-based Google login flow

### 2. Email Already Registered with Password
- **Scenario**: User tries Google sign-in with email already used for email/password auth
- **Behavior**: Firebase links Google provider to existing account
- **Action**: User can now use both methods to log in

### 3. Network Disconnection During OAuth
- **Scenario**: Network drops while exchanging token
- **Behavior**: Firebase throws network error
- **Action**: Show "Connection lost. Please try again."

### 4. User Changes Mind (Selects Wrong Account)
- **Scenario**: User selects account but wants different one
- **Behavior**: User can cancel and retry
- **Action**: Return to login screen, allow re-attempt

### 5. Restricted Account (Workspace/School)
- **Scenario**: User tries to sign in with restricted Google Workspace account
- **Behavior**: Google may block based on org policy
- **Action**: Show error "This account cannot be used. Try another account."

### 6. User Revokes App Permissions
- **Scenario**: User previously used Google sign-in, then revoked app access in Google settings
- **Behavior**: Next sign-in attempt fails with permission error
- **Action**: Prompt user to re-authorize

## 10. Failure Modes

### Google OAuth Errors

| Error Code | User Message | Cause |
|-----------|--------------|-------|
| `auth/popup-closed-by-user` | No error shown | User cancelled sign-in |
| `auth/cancelled-popup-request` | No error shown | User cancelled sign-in |
| `auth/account-exists-with-different-credential` | "This email is already registered. Please sign in with your password." | Email exists with different provider |
| `auth/invalid-credential` | "Sign-in failed. Please try again." | Invalid OAuth token |
| `auth/operation-not-allowed` | "Google sign-in is not available. Try email/password." | Google provider not enabled |
| `auth/network-request-failed` | "No internet connection. Please check and try again." | Network error |
| `auth/too-many-requests` | "Too many attempts. Please try again later." | Rate limit exceeded |

### Platform-Specific Errors

| Error | Platform | User Message |
|-------|----------|--------------|
| Missing Google Services | Android | "Google Play Services required. Please update." |
| Invalid Client ID | iOS/Android | "Configuration error. Contact support." |
| User not signed in | Both | No error (allow web login) |

## 11. Acceptance Criteria

### Functional Requirements

- [ ] **Given** user taps "Continue with Google" **when** button is tapped **then** Google sign-in sheet appears
- [ ] **Given** Google account selected **when** user approves permissions **then** account is created/linked and user is logged in
- [ ] **Given** existing email/password account **when** Google sign-in used **then** Google provider is linked to existing account
- [ ] **Given** new Google user **when** sign-in completes **then** new account is created and user is logged in
- [ ] **Given** user cancels **when** sign-in sheet is dismissed **then** user returns to login screen with no error
- [ ] **Given** network error **when** token exchange fails **then** user-friendly error is shown
- [ ] **Given** successful Google sign-in **when** app is restarted **then** user remains logged in
- [ ] **Given** Google-authenticated user **when** logout tapped **then** user is logged out (Google session persists in browser)

### UI/UX Requirements

- [ ] "Continue with Google" button has Google logo and brand colors
- [ ] Button follows Google's branding guidelines
- [ ] Loading indicator shown on button during sign-in
- [ ] All other auth buttons disabled during Google sign-in
- [ ] Native Google sign-in sheet used (not web popup when possible)
- [ ] Cancellation is graceful (no error message shown)

### Security Requirements

- [ ] OAuth tokens are never logged or stored in plain text
- [ ] Only email and basic profile permissions requested
- [ ] Firebase validates all Google tokens server-side
- [ ] Auth token stored securely in AsyncStorage
- [ ] Google sign-in uses HTTPS redirect URIs only

### Platform Requirements

- [ ] Works on iOS with Apple restrictions
- [ ] Works on Android with Google Play Services
- [ ] Works in Expo Go during development
- [ ] Works in standalone builds (EAS)

---

# FLOW 2: Apple Sign In

## 3. Actual Flow (End-to-End)

1. User opens app (no session exists)
2. App displays Login screen
3. User taps "Continue with Apple" button
4. App initiates Apple Sign In flow
5. Apple sign-in sheet appears (native)
6. User authenticates with Face ID / Touch ID / Password
7. **First time**: User chooses to share or hide email
8. **First time**: User optionally edits name
9. User taps "Continue"
10. Apple returns authorization code and identity token
11. Firebase exchanges token for user credentials
12. **If account exists**: User is logged in immediately
13. **If new account**: Firebase creates account with Apple provider
14. App stores auth token in AsyncStorage
15. App updates AuthContext with user data
16. App navigates to Home screen

## 4. Step-by-Step Behaviour

**Button Tap:**
- Show loading indicator on button
- Disable all other auth buttons
- Launch Apple Sign In flow (native iOS)

**Apple Sign-In Sheet:**
- Native iOS sheet (mandatory on iOS)
- User authenticates with biometrics or password
- First-time: Email sharing options (share real or hide with relay)
- First-time: Name editing option

**On User Approval:**
- Apple returns credentials to app
- Firebase validates with Apple servers
- Firebase creates or retrieves user account

**If Account Exists:**
- Link Apple provider to existing account
- User is logged in
- Navigate to Home

**If New Account:**
- Firebase creates new user with Apple provider
- Email may be Apple private relay email (`privaterelay.appleid.com`)
- Navigate to Home

**On User Cancellation:**
- Close Apple sign-in sheet
- Return to Login screen
- Re-enable auth buttons
- No error message shown

**On Error:**
- Parse error code
- Show user-friendly error message
- Re-enable auth buttons

## 5. Sequence Diagram

```
User → LoginScreen: Tap "Continue with Apple"
LoginScreen → LoginScreen: Show loading on button
LoginScreen → AppleAuth: Launch Apple Sign In
AppleAuth → User: Show native Apple sign-in sheet

[User authenticates]
User → AppleAuth: Authenticate (Face ID / Touch ID / Password)
AppleAuth → User: Show email/name options (first time only)
User → AppleAuth: Choose email sharing, optionally edit name
AppleAuth → AppleServers: Validate user and generate token
AppleServers → AppleAuth: Return identity token and auth code
AppleAuth → FirebaseAuth: Exchange token for Firebase credentials

[Account Exists]
FirebaseAuth → FirebaseAuth: Link Apple provider to existing account
FirebaseAuth → LoginScreen: Return user credentials
LoginScreen → AsyncStorage: Store auth token
LoginScreen → AuthContext: Update user state
LoginScreen → HomeScreen: Navigate

[New Account]
FirebaseAuth → FirebaseAuth: Create new user with Apple provider
FirebaseAuth → LoginScreen: Return new user credentials
LoginScreen → AsyncStorage: Store auth token
LoginScreen → AuthContext: Update user state
LoginScreen → HomeScreen: Navigate

[User Cancels]
AppleAuth → LoginScreen: Return cancellation
LoginScreen → LoginScreen: Hide loading, enable buttons

[Error]
AppleAuth → LoginScreen: Return error
LoginScreen → User: Show error message
```

## 6. Visual Flow

```
[Login Screen]
  - Email/Password inputs
  - "Continue with Google" button
  - "Continue with Apple" button ← User taps
        ↓
[Apple Sign-In Sheet]
  (Native iOS sheet)
  - Face ID / Touch ID
  - Email sharing option
  - Name editing
        ↓ (Success)
[Home Screen]
        ↓ (Cancel)
[Login Screen] (no error)
        ↓ (Error)
[Login Screen] (with error)
```

## 7. Inputs & Outputs

### Inputs
- **User Action**: Tap "Continue with Apple" button
- **Authentication**: Face ID / Touch ID / Password
- **Permissions**: Email (real or hidden), Name (optional)

### Outputs

**Success - With Real Email:**
```javascript
{
  user: {
    uid: "firebase_user_id",
    email: "user@icloud.com",
    emailVerified: true,
    displayName: "John Appleseed",
    photoURL: null,
    providerId: "apple.com",
    providerData: [{
      providerId: "apple.com",
      uid: "apple_user_id",
      email: "user@icloud.com"
    }]
  },
  token: "firebase_auth_token"
}
```

**Success - With Private Relay Email:**
```javascript
{
  user: {
    uid: "firebase_user_id",
    email: "abc123xyz@privaterelay.appleid.com",
    emailVerified: true,
    displayName: "User Name",
    photoURL: null,
    providerId: "apple.com"
  },
  token: "firebase_auth_token"
}
```

**Cancellation:**
```javascript
{
  cancelled: true
}
```

## 8. API Contracts & Payloads

### Firebase Auth with Apple (Expo)

```javascript
import * as AppleAuthentication from 'expo-apple-authentication';
import { OAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth } from '../services/firebase';

// 1. Trigger Apple Sign In
const credential = await AppleAuthentication.signInAsync({
  requestedScopes: [
    AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
    AppleAuthentication.AppleAuthenticationScope.EMAIL,
  ],
});

// 2. Create Firebase credential
const provider = new OAuthProvider('apple.com');
const firebaseCredential = provider.credential({
  idToken: credential.identityToken,
});

// 3. Sign in to Firebase
const result = await signInWithCredential(auth, firebaseCredential);
```

**Parameters:**
- `identityToken`: Apple identity token (JWT)
- `authorizationCode`: Apple authorization code (optional for refresh)

**Returns:** Promise<UserCredential>

### Configuration Requirements

**Firebase Console:**
- Enable Apple as sign-in provider
- Add Service ID (Bundle ID)
- Configure OAuth redirect URLs

**Apple Developer:**
- Enable "Sign in with Apple" capability
- Register App ID
- Create Service ID
- Configure redirect URLs

**Expo app.json:**
```json
{
  "expo": {
    "ios": {
      "usesAppleSignIn": true,
      "bundleIdentifier": "com.yourcompany.lingotune"
    }
  }
}
```

**iOS Only:**
- Apple Sign In only works on iOS devices (not Android)
- Required by App Store if other social login methods are offered

## 9. Edge Cases

### 1. Email Hide with Private Relay
- **Scenario**: User chooses to hide email, Apple provides `privaterelay.appleid.com` email
- **Behavior**: Firebase accepts relay email as unique identifier
- **Action**: User account created with relay email, emails forwarded by Apple

### 2. Email Already Registered
- **Scenario**: User's Apple email already exists with email/password auth
- **Behavior**: Firebase links Apple provider to existing account
- **Action**: User can use both methods to log in

### 3. Name Not Provided
- **Scenario**: User deletes their name during first sign-in
- **Behavior**: Firebase receives null or empty displayName
- **Action**: Accept empty name, can be updated later in profile

### 4. Second Sign-In (No Email/Name Prompt)
- **Scenario**: User signs in with Apple a second time
- **Behavior**: Apple does NOT show email/name options again
- **Action**: Firebase uses previously provided credentials

### 5. User Deletes Apple ID
- **Scenario**: User deletes their Apple ID after creating account
- **Behavior**: Sign-in fails, account becomes inaccessible
- **Action**: User must contact support (cannot reset password)

### 6. Android Device
- **Scenario**: User tries to use "Continue with Apple" on Android
- **Behavior**: Button should not be displayed on Android
- **Action**: Hide "Continue with Apple" on non-iOS platforms

## 10. Failure Modes

### Apple Sign-In Errors

| Error Code | User Message | Cause |
|-----------|--------------|-------|
| `ERR_CANCELED` | No error shown | User cancelled sign-in |
| `ERR_INVALID_RESPONSE` | "Sign-in failed. Please try again." | Invalid response from Apple |
| `ERR_NOT_AVAILABLE` | "Apple Sign In not available. Update your device." | iOS < 13 |
| `ERR_REQUEST_FAILED` | "Unable to connect to Apple. Check your connection." | Network error |
| `auth/invalid-credential` | "Sign-in failed. Please try again." | Invalid token |
| `auth/operation-not-allowed` | "Apple sign-in is not available. Try email/password." | Apple provider not enabled |

### Platform-Specific Issues

| Issue | Platform | Solution |
|-------|----------|----------|
| Capability not enabled | iOS | Enable "Sign in with Apple" in Xcode |
| Bundle ID mismatch | iOS | Ensure app.json bundleId matches Apple Developer |
| iOS < 13 | iOS | Show error or hide button |
| Android | Android | Hide "Continue with Apple" button entirely |

## 11. Acceptance Criteria

### Functional Requirements

- [ ] **Given** iOS user taps "Continue with Apple" **when** button is tapped **then** Apple sign-in sheet appears
- [ ] **Given** user authenticates **when** sign-in completes **then** account is created/linked and user is logged in
- [ ] **Given** existing email account **when** Apple sign-in used **then** Apple provider is linked
- [ ] **Given** new Apple user **when** sign-in completes **then** new account created with Apple provider
- [ ] **Given** user cancels **when** sheet is dismissed **then** return to login with no error
- [ ] **Given** user chooses private relay **when** email is hidden **then** account created with relay email
- [ ] **Given** successful Apple sign-in **when** app restarts **then** user remains logged in
- [ ] **Given** second sign-in **when** user signs in again **then** no email/name prompt shown

### UI/UX Requirements

- [ ] "Continue with Apple" button follows Apple's Human Interface Guidelines
- [ ] Button uses official Apple Sign In button style (black or white)
- [ ] Button only shown on iOS devices
- [ ] Loading indicator shown during sign-in
- [ ] All other auth buttons disabled during Apple sign-in
- [ ] Native Apple sheet used (not web-based)

### Security Requirements

- [ ] Identity token validated by Firebase server-side
- [ ] Only email and name scopes requested
- [ ] Tokens never logged or stored in plain text
- [ ] Private relay emails accepted and handled correctly

### Platform Requirements

- [ ] iOS 13+ required
- [ ] Works with Face ID / Touch ID
- [ ] Works with password fallback
- [ ] Works in Expo Go during development
- [ ] Works in standalone builds (EAS)
- [ ] Required for App Store approval (if Google Sign-In is offered)

---

## 12. Account Linking Scenarios

### Scenario 1: Email/Password Account → Add Google
**Flow:**
1. User creates account with email `user@gmail.com` and password
2. User logs out
3. User taps "Continue with Google" with same email
4. Firebase links Google provider to existing account
5. User can now log in with either method

**Implementation:**
- Firebase automatically links if email matches
- No user action required
- Both credentials valid

### Scenario 2: Google Account → Try Email/Password with Same Email
**Flow:**
1. User signs in with Google (`user@gmail.com`)
2. User logs out
3. User tries to sign up with email/password using `user@gmail.com`
4. Firebase returns error: "Email already in use"

**Implementation:**
- User must use Google sign-in or reset password
- Cannot create second account with same email

### Scenario 3: Apple Private Relay → No Linking
**Flow:**
1. User signs in with Apple, chooses private relay (`xyz@privaterelay.appleid.com`)
2. No automatic linking possible (email is unique)
3. Separate account created

**Implementation:**
- Private relay creates unique account
- User should use same method consistently

---

## 13. Open Questions / Assumptions (Global)

### Resolved
✅ Google Sign-In supported on both iOS and Android
✅ Apple Sign-In required on iOS if Google is offered (App Store requirement)
✅ Apple Sign-In hidden on Android
✅ Private relay emails accepted and treated as unique accounts
✅ Account linking automatic when email matches
✅ No manual provider unlinking in v1
✅ Social profile data (avatar, name) not synced to Firestore in v1

### Pending
None

---

## Summary Checklist

This requirement document includes:
- [x] Context & Intent
- [x] Actual Flow (for Google and Apple)
- [x] Step-by-Step Behaviour
- [x] Sequence Diagrams
- [x] Visual Flow
- [x] Inputs & Outputs
- [x] API Contracts
- [x] Edge Cases
- [x] Failure Modes
- [x] Acceptance Criteria
- [x] Account Linking Scenarios
- [x] Open Questions

**Status**: ✅ COMPLETE - Ready for implementation

---

## Implementation Notes

### Dependencies Required

```bash
npm install expo-auth-session expo-apple-authentication
```

### Firebase Configuration

Both Google and Apple providers must be enabled in:
- Firebase Console → Authentication → Sign-in method
- Add Web Client IDs, Service IDs as needed

### Platform-Specific Setup

**iOS:**
- Enable "Sign in with Apple" capability in Xcode
- Configure app.json with `usesAppleSignIn: true`
- Add Apple Service ID to Firebase

**Android:**
- Configure Google Cloud OAuth credentials
- Add SHA-1 fingerprint to Firebase
- Download `google-services.json`

### Testing Checklist

- [ ] Test Google sign-in on iOS
- [ ] Test Google sign-in on Android
- [ ] Test Apple sign-in on iOS (not available on Android)
- [ ] Test account linking (email match)
- [ ] Test private relay email (Apple)
- [ ] Test cancellation flows
- [ ] Test network error scenarios
- [ ] Test logout and re-login
