# Dashboard Requirements

---

## 1. Context & Intent

### Who is this for?
- **Primary Users**: Users who have completed (or are in progress of completing) onboarding for at least one language
- **System Actors**:
  - Firebase Authentication (user identity)
  - Firestore Database (`users` collection, `onboardingTests` collection)
  - Firebase Callable Functions (`generateProfile`)
  - OnboardingContext (React Context for state management)

### Problem Being Solved
Users need:
- **Central hub** to view their learning progress and access learning features
- **Visibility into onboarding status** - Clear indication of completed vs in-progress onboarding
- **Access to AI-generated profile** - View personalized learning diagnosis and goals
- **Recovery mechanism** - Ability to regenerate profile if initial generation fails
- **Quick resume** - One-tap access to continue incomplete onboarding

This replaces:
- Confusion about whether onboarding is complete
- Dead-end state when profile generation fails
- Hidden profile information with no access point

### Non-Goals (Out of Scope)
- **Multi-language dashboard switching** - Dashboard shows all languages, no per-language view toggle
- **Profile editing** - Users cannot manually edit AI-generated profiles
- **Test retaking from dashboard** - Future iteration (currently must add new language)
- **Historical profile versions** - Only current profile is displayed
- **Social features** - No sharing or comparing dashboards
- **Offline access** - Dashboard requires internet for profile regeneration
- **Custom dashboard layout** - Fixed layout, no user customization

---

## 2. Feature Breakdown

This feature covers **3 primary flows** (Features 1-2 implemented, Features 3-5 planned):

### 2.1 Onboarding Status Display (IMPLEMENTED)
Dashboard shows visual indicators for completed vs in-progress onboarding, with resume functionality.

### 2.2 AI Profile Viewing & Regeneration (IMPLEMENTED)
Users can view their AI-generated profile and manually regenerate it if generation fails or times out.

### 2.3 Music Selection (PLANNED - See Brain Dump)
Users select songs in their target language for vocabulary learning.

### 2.4 Vocabulary Tracking (PLANNED - See Brain Dump)
Users track learned vocabulary from songs and other sources.

### 2.5 Add Another Language (PLANNED - See Brain Dump)
Users can add additional languages with proper navigation back to dashboard.

---

# FEATURE 1: Onboarding Status Display (IMPLEMENTED)

## 3. Actual Flow (End-to-End)

### Scenario A: User Has In-Progress Onboarding

1. User opens app after quitting mid-onboarding (e.g., quit at Question 5)
2. App checks `user.languages[].onboardingStatus`
3. System finds at least one language with `onboardingStatus === 'in_progress'`
4. App navigates to Dashboard Screen
5. Dashboard displays orange resume banner with:
   - Icon: ⏸️ (pause symbol)
   - Title: "Complete Your Onboarding"
   - Description: "Resume where you left off and unlock all features"
   - Arrow indicator: →
6. User taps resume banner
7. App navigates to onboarding test screen (restarts from Question 1, not resuming mid-test)

### Scenario B: User Has Completed Onboarding for At Least One Language

1. User opens app after completing onboarding
2. App checks `user.languages[].onboardingStatus`
3. System finds at least one language with `onboardingStatus === 'completed'`
4. App navigates to Dashboard Screen
5. Dashboard displays:
   - Green success card with checkmark (✅)
   - Title: "Onboarding Complete!"
   - Message: "Your personalized learning path is ready"
6. Dashboard shows language cards for each completed language with:
   - Language name and flag emoji
   - Proficiency level (e.g., "Intermediate")
   - Profile preview (goals displayed if available)
   - "View Profile" button (enabled)

### Scenario C: User Has Multiple Languages (Mixed States)

1. User has 2 languages: Korean (completed), Japanese (in-progress)
2. Dashboard shows:
   - Resume banner for Japanese (in-progress state takes priority)
   - Language card for Korean (fully enabled with "View Profile" button)
   - Language card for Japanese (shows "Complete Onboarding First" on disabled button)

---

## 4. Step-by-Step Behaviour (Deterministic)

### On Dashboard Mount

1. `DashboardScreen` component reads `userProfile` from `OnboardingContext`
2. System checks: `userProfile?.languages.some(lang => lang.onboardingStatus === 'completed')`
   - **If TRUE**: Set `hasCompletedLanguage = true`
   - **If FALSE**: Set `hasCompletedLanguage = false`
3. System checks: `!!onResumeOnboarding` callback is provided
   - **If TRUE**: Set `hasInProgressOnboarding = true` (resume banner should show)
   - **If FALSE**: Set `hasInProgressOnboarding = false`
4. Filter active languages: `activeLanguages = userProfile.languages.filter(lang => lang.onboardingStatus === 'completed')`

### Resume Banner Logic

**Display Conditions:**
- Show resume banner if: `hasInProgressOnboarding === true`
- Banner is tappable (calls `onResumeOnboarding()` callback)
- Banner appears **above** all other dashboard content

**Styling:**
- Background: Orange (`#FFA500` or similar)
- Icon: ⏸️
- Arrow: → (indicates forward action)

### Success Card Logic

**Display Conditions:**
- Show success card if: `hasCompletedLanguage === true`
- Card appears **below** resume banner (if resume banner exists)
- Card is non-interactive (purely informational)

**Styling:**
- Background: Green (#4CAF50 or similar)
- Icon: ✅

### Language Card Logic

**For Each Language in `activeLanguages`:**

1. **Display Language Info:**
   - Language name: `language.languageName`
   - Flag emoji: Based on `language.languageCode`
   - Proficiency: `language.proficiencyLevel` (e.g., "Beginner", "Intermediate", "Advanced")

2. **Display Profile Preview (if available):**
   - Check: `language.currentProfile` exists
   - **If TRUE**: Show first 3 goals from `language.goals` array
   - **If FALSE**: Show placeholder text: "🔄 Your personalized learning profile is being generated..."

3. **Action Button State:**
   - Check: `hasInProgressOnboarding === true`
   - **If TRUE**: Button disabled, text = "Complete Onboarding First"
   - **If FALSE**: Button enabled, text = "View Profile" OR "🔄 Regenerate Profile" (based on profile status)

---

## 5. Sequence Diagram

### Scenario: User Resumes In-Progress Onboarding

```
User → App: Opens app
App → Firestore: Fetch user document
Firestore → App: User data (with languages array)
App → DashboardScreen: Render with userProfile
DashboardScreen → OnboardingContext: Read onboardingStatus
OnboardingContext → DashboardScreen: Returns 'in_progress' for Korean
DashboardScreen → User: Display orange resume banner
User → DashboardScreen: Tap resume banner
DashboardScreen → OnboardingContext: Call onResumeOnboarding()
OnboardingContext → Navigation: Navigate to TestScreen (Question 1)
```

### Scenario: User Views Completed Onboarding Status

```
User → App: Opens app
App → Firestore: Fetch user document
Firestore → App: User data (languages[0].onboardingStatus = 'completed')
App → DashboardScreen: Render with userProfile
DashboardScreen → DashboardScreen: Check onboardingStatus === 'completed'
DashboardScreen → User: Display green success card
DashboardScreen → User: Display language card with "View Profile" button
```

---

## 6. Visual Flow

```
[App Launch]
        ↓
[Check user.languages[].onboardingStatus]
        ↓
   ┌────┴────┐
   │         │
[In-Progress] [Completed]
   │         │
   ↓         ↓
[Dashboard with Resume Banner] [Dashboard with Success Card]
   - Orange banner (tappable)    - Green success card
   - "Complete Your Onboarding"  - "Onboarding Complete!"
   - Dashboard content visible   - Language cards (enabled)
   - Features disabled           - "View Profile" buttons
        ↓
[User taps resume banner]
        ↓
[Navigate to TestScreen]
   - Restart from Question 1
   - Previous progress cleared
```

---

## 7. Inputs & Outputs

### Inputs

**From OnboardingContext:**
- `userProfile: UserProfile | null`
  - `languages: UserLanguage[]`
    - `languageCode: string` (e.g., "ko", "ja")
    - `languageName: string` (e.g., "Korean", "Japanese")
    - `onboardingStatus: 'not_started' | 'in_progress' | 'completed'`
    - `proficiencyLevel?: string` (e.g., "Beginner", "Intermediate")
    - `currentProfile?: string` (AI-generated profile text)
    - `goals?: string[]` (AI-extracted learning goals)
- `onResumeOnboarding?: () => void` (callback to resume onboarding)

**No User Inputs Required** - Dashboard is read-only for status display

### Outputs

**Visual Indicators:**
- Resume banner (conditional)
- Success card (conditional)
- Language cards (one per completed language)

**User Actions:**
- Tap resume banner → Navigate to onboarding test
- Tap language card → Navigate to ProfileViewScreen (see Feature 2)

---

## 8. API Contracts & Payloads

**No API calls** - This feature is purely client-side rendering based on OnboardingContext state.

**Firestore Data Read (via OnboardingContext):**

Collection: `users/{userId}`

```typescript
{
  uid: string,
  email: string,
  displayName?: string,
  photoURL?: string,
  languages: [
    {
      languageCode: "ko",
      languageName: "Korean",
      onboardingStatus: "completed",
      proficiencyLevel: "Intermediate",
      currentProfile: "You demonstrate strong foundational skills...",
      goals: [
        "Master advanced grammar patterns",
        "Expand vocabulary for daily conversations",
        "Improve listening comprehension"
      ],
      testHistory: ["test123"],
      createdAt: Timestamp,
      updatedAt: Timestamp
    }
  ],
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

---

## 9. Edge Cases

### Edge Case 1: User Has No Languages

**Scenario**: User account exists but `languages` array is empty

**Expected Behavior**:
- Dashboard shows empty state (no resume banner, no success card, no language cards)
- Display message: "Get started by adding your first language"
- Show "Add Language" button

**Current Implementation**: ❓ **Needs Verification**

---

### Edge Case 2: User Has Only `not_started` Languages

**Scenario**: `languages` array exists but all have `onboardingStatus === 'not_started'`

**Expected Behavior**:
- No resume banner (no in-progress onboarding)
- No success card (no completed languages)
- Display empty state with "Start your onboarding" CTA

**Current Implementation**: ❓ **Needs Verification**

---

### Edge Case 3: Profile Exists But Goals Array Is Empty

**Scenario**: `currentProfile` text exists but `goals` array is `[]` or `undefined`

**Expected Behavior**:
- Show profile preview section (don't hide it)
- Display message: "Your learning focus will be determined as you progress"
- OR: Parse `currentProfile` text to extract goals on-the-fly

**Current Implementation**: Shows empty goals container (DashboardScreen.tsx:272-282)

---

### Edge Case 4: Multiple In-Progress Languages

**Scenario**: User started onboarding for Korean (quit at Q5) and Japanese (quit at Q10)

**Expected Behavior**:
- Resume banner shows generic message (not language-specific)
- Tapping banner resumes **most recently started** onboarding (or prompt user to choose)

**Current Implementation**: ❓ **Needs Clarification** - Which language is resumed?

---

### Edge Case 5: User Completes Onboarding But Profile Not Yet Generated

**Scenario**: `onboardingStatus === 'completed'` but `currentProfile` is `null`

**Expected Behavior**:
- Show success card (onboarding is complete)
- Language card shows placeholder: "🔄 Your personalized learning profile is being generated..."
- "View Profile" button is **disabled** (or shows "Regenerate Profile")

**Current Implementation**: ✅ **Implemented** (DashboardScreen.tsx:285-291)

---

## 10. Failure Modes

### Failure 1: OnboardingContext Not Available

**Scenario**: `userProfile` is `null` or `undefined`

**Expected Behavior**:
- Show loading spinner
- OR: Show error message: "Unable to load your profile. Please try again."

**Current Implementation**: ❓ **Needs Verification**

---

### Failure 2: Network Failure (Cannot Fetch User Data)

**Scenario**: Firestore read fails due to network issue

**Expected Behavior**:
- Show cached data (if available via AsyncStorage)
- Display error banner: "Unable to sync. Showing cached data."
- Retry button available

**Current Implementation**: ❓ **Needs Verification**

---

### Failure 3: Corrupted User Data (Missing Required Fields)

**Scenario**: User document exists but `languages` field is malformed (not an array)

**Expected Behavior**:
- Log error to console/monitoring
- Show error message: "We encountered an issue loading your profile. Please contact support."
- Prevent app crash (graceful fallback)

**Current Implementation**: ❓ **Needs Verification**

---

## 11. Acceptance Criteria

### AC1: Resume Banner Display
- **Given** user has `onboardingStatus === 'in_progress'` for at least one language
- **When** dashboard loads
- **Then** orange resume banner is displayed with:
  - ⏸️ icon
  - Title: "Complete Your Onboarding"
  - Description: "Resume where you left off and unlock all features"
  - Arrow indicator (→)
  - Banner is tappable

### AC2: Resume Banner Action
- **Given** resume banner is displayed
- **When** user taps the banner
- **Then** app navigates to onboarding test screen (Question 1)

### AC3: Success Card Display
- **Given** user has `onboardingStatus === 'completed'` for at least one language
- **When** dashboard loads
- **Then** green success card is displayed with:
  - ✅ icon
  - Title: "Onboarding Complete!"
  - Message about personalized learning path

### AC4: Language Card Display (Completed Language)
- **Given** user has `onboardingStatus === 'completed'` for language X
- **When** dashboard loads
- **Then** language card shows:
  - Language name and flag
  - Proficiency level (e.g., "Intermediate")
  - Profile preview (first 3 goals) OR placeholder if profile not ready
  - "View Profile" button (enabled if no in-progress onboarding)

### AC5: Language Card Display (Profile Not Ready)
- **Given** `onboardingStatus === 'completed'` but `currentProfile` is `null`
- **When** language card renders
- **Then** placeholder text is shown: "🔄 Your personalized learning profile is being generated..."

### AC6: Disabled Features During In-Progress Onboarding
- **Given** user has `onboardingStatus === 'in_progress'` for at least one language
- **When** user views a completed language card
- **Then** action buttons show "Complete Onboarding First" (disabled state)

### AC7: Empty State (No Completed Languages)
- **Given** user has no languages with `onboardingStatus === 'completed'`
- **When** dashboard loads
- **Then** no success card is shown
- **Then** empty state message or resume banner is shown (if in-progress exists)

---

# FEATURE 2: AI Profile Viewing & Regeneration (IMPLEMENTED)

## 3. Actual Flow (End-to-End)

### Scenario A: User Views Profile (Success Case)

1. User completes onboarding test
2. System calls `generateProfile` Firebase Function
3. Function successfully generates profile using OpenAI GPT-4o
4. Profile saved to Firestore: `onboardingTests/{testId}.aiProfile` and `users/{userId}.languages[n].currentProfile`
5. User lands on ProfileSummaryScreen, sees AI-generated diagnosis
6. User taps "Start Learning" → Navigates to Dashboard
7. Dashboard shows language card with profile preview (goals)
8. User taps "View Profile" button
9. App navigates to ProfileViewScreen
10. ProfileViewScreen displays:
    - Language name and flag
    - Full `currentProfile` text
    - Goals list (if available)

### Scenario B: User Regenerates Profile (Failure Recovery)

1. User completed onboarding test, but profile generation failed (both OpenAI and Claude timed out)
2. `profileStatus === 'failed'` in `onboardingTests/{testId}`
3. User navigates to Dashboard
4. Dashboard shows language card with:
   - Status badge: "❌ Generation Failed" (red)
   - Button text: "🔄 Regenerate Profile"
5. User taps "🔄 Regenerate Profile" button
6. System checks cooldown timer:
   - **If cooldown active**: Show alert "Please Wait - You can regenerate again in X seconds"
   - **If cooldown expired**: Proceed to step 7
7. Button shows loading spinner (ActivityIndicator)
8. System calls `generateProfileForTest(testId)` (client wrapper for Firebase Function)
9. Function attempts OpenAI → Claude fallback chain
10. **Success Path**:
    - Profile saved to Firestore
    - `profileStatus` updated to `'completed'`
    - Alert shown: "Success! Your profile has been generated successfully."
    - Status badge disappears
    - Profile text appears on language card
    - Cooldown timer starts (30 seconds)
11. **Failure Path**:
    - `profileStatus` remains `'failed'`
    - Alert shown: "Error - Failed to generate profile. Please try again later."
    - Status badge remains "❌ Generation Failed"
    - Cooldown timer starts (20 seconds)
    - User can retry again after cooldown

### Scenario C: User Regenerates Profile (Pending Case)

1. User completed onboarding, profile generation started but taking too long
2. User clicks "Go to Dashboard" from ProfileGenerationScreen
3. `profileStatus === 'pending'` in `onboardingTests/{testId}`
4. Dashboard shows language card with:
   - Status badge: "⏳ Profile Pending" (orange)
   - Button text: "🔄 Regenerate Profile"
5. User taps "🔄 Regenerate Profile" → Same flow as Scenario B

---

## 4. Step-by-Step Behaviour (Deterministic)

### On Dashboard Mount - Profile Status Check

1. `DashboardScreen` component fetches `completedLanguages` from `userProfile.languages`
   - Filter: `lang => lang.onboardingStatus === 'completed'`
2. For each completed language:
   - Get `mostRecentTestId = language.testHistory[language.testHistory.length - 1]`
   - Fetch `onboardingTests/{mostRecentTestId}` document from Firestore
   - Read `testData.profileStatus: 'pending' | 'completed' | 'failed' | 'loading'`
   - Store in state: `profileStatuses[languageCode] = profileStatus`
3. **If `profileStatus === 'pending'` OR `'failed'`**:
   - Show status badge on language card
   - Change button text to "🔄 Regenerate Profile"
4. **If `profileStatus === 'completed'`**:
   - No status badge
   - Button text = "View Profile"

### Profile Regeneration Flow

**Trigger**: User taps "🔄 Regenerate Profile" button

**Step 1: Cooldown Check**
```typescript
if (cooldownTimers[languageCode] && cooldownTimers[languageCode] > 0) {
  Alert.alert('Please Wait', `You can regenerate again in ${cooldownTimers[languageCode]} seconds.`);
  return; // Abort
}
```

**Step 2: Set Loading State**
```typescript
setRegeneratingLanguage(languageCode); // Show spinner on button
setProfileStatuses(prev => ({ ...prev, [languageCode]: 'loading' }));
```

**Step 3: Call Firebase Function**
```typescript
const result = await generateProfileForTest(testId);
```

**Backend Function Logic** (`functions/src/generateProfile.ts`):
1. Fetch test document from `onboardingTests/{testId}`
2. Validate test data exists
3. Attempt OpenAI GPT-4o API call:
   - Send test answers + language context
   - Parse response for profile text and goals
4. **If OpenAI succeeds**:
   - Save profile to Firestore
   - Return `{ success: true, profile: "...", goals: [...] }`
5. **If OpenAI fails**, attempt Claude 3.5 Sonnet API call:
   - Same prompt structure
   - Parse response
6. **If Claude succeeds**:
   - Save profile to Firestore
   - Return `{ success: true, profile: "...", goals: [...] }`
7. **If both fail**:
   - Update `profileStatus` to `'failed'`
   - Return `{ success: false, error: "..." }`

**Step 4: Handle Success**
```typescript
if (result.success && result.profile) {
  setProfileStatuses(prev => ({ ...prev, [languageCode]: 'completed' }));
  Alert.alert('Success!', 'Your profile has been generated successfully.');
  setCooldownTimers(prev => ({ ...prev, [languageCode]: 30 })); // 30s cooldown
}
```

**Step 5: Handle Failure**
```typescript
catch (error) {
  setProfileStatuses(prev => ({ ...prev, [languageCode]: 'failed' }));
  Alert.alert('Error', 'Failed to generate profile. Please try again later.');
  setCooldownTimers(prev => ({ ...prev, [languageCode]: 20 })); // 20s cooldown
}
```

**Step 6: Cleanup**
```typescript
finally {
  setRegeneratingLanguage(null); // Remove spinner
}
```

### Cooldown Timer Logic

**Timer Starts When**:
- Profile regeneration succeeds → 30-second cooldown
- Profile regeneration fails → 20-second cooldown

**Timer Implementation** (DashboardScreen.tsx:99-127):
```typescript
useEffect(() => {
  const interval = setInterval(() => {
    setCooldownTimers((prev) => {
      const updated = { ...prev };
      for (const key in updated) {
        if (updated[key] > 0) {
          updated[key] -= 1; // Decrement every second
        }
      }
      return updated;
    });
  }, 1000);

  return () => clearInterval(interval);
}, []);
```

**Button Text Changes Based on Cooldown**:
- Cooldown active (e.g., 15s remaining): "Wait 15s"
- Cooldown expired + profile pending/failed: "🔄 Regenerate Profile"
- Profile completed: "View Profile"

---

## 5. Sequence Diagram

### Profile View Flow (Success Case)

```
User → DashboardScreen: Tap "View Profile"
DashboardScreen → Navigation: Navigate to ProfileViewScreen
ProfileViewScreen → OnboardingContext: Read language data
OnboardingContext → ProfileViewScreen: Return language object { currentProfile, goals }
ProfileViewScreen → User: Display profile text + goals
```

### Profile Regeneration Flow

```
User → DashboardScreen: Tap "🔄 Regenerate Profile"
DashboardScreen → DashboardScreen: Check cooldown timer
DashboardScreen → User: (If active) Alert "Please Wait X seconds"
DashboardScreen → User: (If expired) Show loading spinner
DashboardScreen → Firebase Function: Call generateProfileForTest(testId)
Firebase Function → OpenAI API: POST /chat/completions
OpenAI API → Firebase Function: (Fail) 500 error
Firebase Function → Claude API: POST /messages
Claude API → Firebase Function: (Success) Profile text + goals
Firebase Function → Firestore: Update onboardingTests/{testId}
Firestore → Firebase Function: Write confirmed
Firebase Function → Firestore: Update users/{userId}.languages[n]
Firestore → Firebase Function: Write confirmed
Firebase Function → DashboardScreen: Return { success: true, profile: "...", goals: [...] }
DashboardScreen → User: Alert "Success! Your profile has been generated."
DashboardScreen → DashboardScreen: Update profileStatuses to 'completed'
DashboardScreen → DashboardScreen: Start 30s cooldown timer
DashboardScreen → User: Remove status badge, enable "View Profile" button
```

---

## 6. Visual Flow

### Profile View Flow

```
[Dashboard]
  - Language card shows "View Profile" button
        ↓
[User taps "View Profile"]
        ↓
[ProfileViewScreen]
  - Language name + flag
  - Full AI profile text
  - Goals list (if available)
  - Back button to Dashboard
```

### Profile Regeneration Flow (Success)

```
[Dashboard]
  - Language card shows "❌ Generation Failed" badge
  - Button: "🔄 Regenerate Profile"
        ↓
[User taps "🔄 Regenerate Profile"]
        ↓
[Cooldown Check]
  - If active: Alert "Please Wait X seconds" → END
  - If expired: Continue
        ↓
[Loading State]
  - Button shows ActivityIndicator
  - profileStatus = 'loading'
        ↓
[Firebase Function Call]
  - OpenAI attempt → Fail
  - Claude attempt → Success
        ↓
[Success Alert]
  - "Success! Your profile has been generated successfully."
        ↓
[Dashboard Updates]
  - Status badge disappears
  - Profile text appears
  - Button text changes to "View Profile"
  - 30s cooldown starts
```

### Profile Regeneration Flow (Failure)

```
[Dashboard]
  - Language card shows "❌ Generation Failed" badge
  - Button: "🔄 Regenerate Profile"
        ↓
[User taps "🔄 Regenerate Profile"]
        ↓
[Loading State]
  - Button shows ActivityIndicator
        ↓
[Firebase Function Call]
  - OpenAI attempt → Fail
  - Claude attempt → Fail
        ↓
[Error Alert]
  - "Error - Failed to generate profile. Please try again later."
        ↓
[Dashboard Updates]
  - Status badge remains "❌ Generation Failed"
  - Button text remains "🔄 Regenerate Profile"
  - 20s cooldown starts
```

---

## 7. Inputs & Outputs

### Inputs (Profile View)

**From DashboardScreen (via Navigation):**
- `language: UserLanguage` object (passed as route param)
  - `languageCode: string`
  - `languageName: string`
  - `currentProfile?: string`
  - `goals?: string[]`
  - `proficiencyLevel?: string`

**No User Inputs Required** - ProfileViewScreen is read-only

### Inputs (Profile Regeneration)

**From DashboardScreen State:**
- `languageCode: string` (e.g., "ko")
- `testId: string` (most recent test ID from `language.testHistory`)

**User Action:**
- Tap "🔄 Regenerate Profile" button

### Outputs (Profile View)

**Visual Display:**
- Language name + flag
- Full profile text (`currentProfile`)
- Goals list (if `goals` array exists)
- Back button to Dashboard

### Outputs (Profile Regeneration)

**Success Case:**
- Alert: "Success! Your profile has been generated successfully."
- Updated `profileStatuses[languageCode] = 'completed'`
- Status badge disappears
- Profile text appears on language card
- 30-second cooldown starts

**Failure Case:**
- Alert: "Error - Failed to generate profile. Please try again later."
- `profileStatuses[languageCode]` remains `'failed'`
- Status badge remains "❌ Generation Failed"
- 20-second cooldown starts

---

## 8. API Contracts & Payloads

### API: `generateProfile` (Firebase Callable Function)

**Endpoint**: Cloud Function (callable)

**Request**:
```typescript
{
  testId: string // e.g., "onboardingTest_1234567890"
}
```

**Response (Success)**:
```typescript
{
  success: true,
  profile: string, // AI-generated profile text
  goals: string[], // Extracted learning goals
  service: "openai" | "claude" // Which AI service succeeded
}
```

**Response (Failure)**:
```typescript
{
  success: false,
  error: string // Error message
}
```

**Backend Logic** (`functions/src/generateProfile.ts`):

1. Fetch test document: `onboardingTests/{testId}`
2. Validate test data exists
3. **OpenAI API Call** (GPT-4o):
   - Endpoint: `https://api.openai.com/v1/chat/completions`
   - Headers: `Authorization: Bearer ${process.env.OPENAI_API_KEY}`
   - Payload:
     ```json
     {
       "model": "gpt-4o",
       "messages": [
         {
           "role": "system",
           "content": "You are a language learning expert..."
         },
         {
           "role": "user",
           "content": "Generate a personalized learning profile based on this test data: ..."
         }
       ],
       "temperature": 0.7
     }
     ```
   - Expected Response:
     ```json
     {
       "choices": [{
         "message": {
           "content": "You demonstrate strong foundational skills..."
         }
       }]
     }
     ```
4. **If OpenAI fails**, try **Claude API** (Claude 3.5 Sonnet):
   - Endpoint: `https://api.anthropic.com/v1/messages`
   - Headers: `x-api-key: ${process.env.ANTHROPIC_API_KEY}`
   - Payload:
     ```json
     {
       "model": "claude-3-5-sonnet-20241022",
       "max_tokens": 1024,
       "messages": [
         {
           "role": "user",
           "content": "Generate a personalized learning profile..."
         }
       ]
     }
     ```
5. **Parse AI Response**:
   - Extract profile text
   - Extract goals (array of strings)
6. **Save to Firestore**:
   - Update `onboardingTests/{testId}`:
     ```typescript
     {
       aiProfile: string,
       goals: string[],
       profileStatus: 'completed',
       profileGeneratedAt: Timestamp
     }
     ```
   - Update `users/{userId}.languages[n]`:
     ```typescript
     {
       currentProfile: string,
       goals: string[],
       updatedAt: Timestamp
     }
     ```

### Firestore Read (Profile Status Check)

**Collection**: `onboardingTests/{testId}`

**Read Fields**:
```typescript
{
  profileStatus: 'pending' | 'completed' | 'failed' | 'loading',
  aiProfile?: string,
  goals?: string[]
}
```

**No Write Operations** - Profile status check is read-only (writes happen in Firebase Function)

---

## 9. Edge Cases

### Edge Case 1: User Taps Regenerate Multiple Times Rapidly

**Scenario**: User taps "🔄 Regenerate Profile" 5 times in 2 seconds

**Expected Behavior**:
- First tap triggers regeneration, shows loading spinner
- Subsequent taps are **ignored** (button is disabled during loading)
- Only 1 API call is made
- Cooldown timer starts after completion

**Current Implementation**: ✅ **Implemented** - `regeneratingLanguage` state blocks duplicate calls (DashboardScreen.tsx:137-142)

---

### Edge Case 2: Profile Generation Succeeds But Goals Parsing Fails

**Scenario**: AI returns profile text but goals array is empty or malformed

**Expected Behavior**:
- Profile text is saved and displayed
- Goals section shows fallback message: "Your learning focus will be determined as you progress"
- `profileStatus` marked as `'completed'` (partial success is acceptable)

**Current Implementation**: ❓ **Needs Verification** - Does backend handle missing goals gracefully?

---

### Edge Case 3: Network Failure During Regeneration

**Scenario**: User taps regenerate, network drops before function returns

**Expected Behavior**:
- Loading state persists for 30 seconds (timeout)
- After timeout, show error alert: "Network error. Please check your connection."
- `profileStatus` remains `'failed'` or `'pending'`
- User can retry when network is restored

**Current Implementation**: ✅ **Implemented** - Try/catch handles network errors (DashboardScreen.tsx:172-176)

---

### Edge Case 4: User Navigates Away During Regeneration

**Scenario**: User taps regenerate, then immediately navigates to ProfileViewScreen

**Expected Behavior**:
- Regeneration continues in background
- ProfileViewScreen shows old profile (if exists) or "Profile not available"
- When regeneration completes, profile is **not** live-updated on ProfileViewScreen
- User must navigate back to Dashboard and re-enter ProfileViewScreen to see new profile

**Current Implementation**: ❓ **Needs Verification** - Does ProfileViewScreen listen to real-time updates?

---

### Edge Case 5: Cooldown Timer Active, User Closes and Reopens App

**Scenario**: User triggers regeneration → 30s cooldown starts → User closes app at 15s remaining → Reopens app

**Expected Behavior**:
- Cooldown timer **resets to 0** (not persisted across app restarts)
- User can regenerate immediately after reopening app

**Current Implementation**: ✅ **Expected** - Cooldown is in-memory state, not persisted (DashboardScreen.tsx:54)

---

### Edge Case 6: Profile Exists But User Regenerates Anyway

**Scenario**: `profileStatus === 'completed'`, profile text exists, but user wants to regenerate (e.g., to get a different AI response)

**Expected Behavior**:
- Button text should be "View Profile" (no regenerate option for completed profiles)
- User **cannot** regenerate completed profiles (feature locked)

**Current Implementation**: ✅ **Implemented** - Button only shows "🔄 Regenerate Profile" if `profileStatus === 'pending' | 'failed'` (DashboardScreen.tsx:335-342)

---

### Edge Case 7: Test History Is Empty

**Scenario**: `language.testHistory` array is `[]` (no tests taken)

**Expected Behavior**:
- Language card shows placeholder: "No test taken yet"
- "View Profile" button is **disabled** or hidden
- No profile status check is performed

**Current Implementation**: ⚠️ **Potential Issue** - Code assumes `testHistory[testHistory.length - 1]` exists (DashboardScreen.tsx:68)

**Risk**: Array access may return `undefined`, causing profile status check to fail silently

**Recommendation**: Add guard clause:
```typescript
if (!language.testHistory || language.testHistory.length === 0) {
  statuses[language.languageCode] = 'pending';
  continue;
}
```

---

## 10. Failure Modes

### Failure 1: Firebase Function Times Out (30+ seconds)

**Scenario**: Both OpenAI and Claude APIs are slow/unresponsive

**Expected Behavior**:
- Client-side timeout after 30 seconds
- Error alert: "Profile generation timed out. Please try again."
- `profileStatus` remains `'pending'` (not updated to failed)
- User can retry

**Current Implementation**: ❓ **Needs Verification** - Is there a client-side timeout?

---

### Failure 2: Firestore Write Fails After Successful AI Call

**Scenario**: AI returns profile, but Firestore write is rejected (permissions, quota, etc.)

**Expected Behavior**:
- Function logs error to Cloud Functions console
- Return error to client: `{ success: false, error: "Database error" }`
- Profile is **not saved** (atomic operation)
- User sees error alert, can retry

**Current Implementation**: ✅ **Expected** - Function should handle Firestore errors gracefully

---

### Failure 3: User Document Deleted Mid-Regeneration

**Scenario**: Admin deletes user account while regeneration is in progress

**Expected Behavior**:
- Firestore write fails (document doesn't exist)
- Function returns error
- App shows error, logs user out (auth state listener detects deletion)

**Current Implementation**: ❓ **Needs Verification** - Does app handle deleted user gracefully?

---

### Failure 4: Invalid Test Data (Corrupted Document)

**Scenario**: `onboardingTests/{testId}` document exists but `answers` field is missing or malformed

**Expected Behavior**:
- Function validates test data before AI call
- If invalid, return error: `{ success: false, error: "Invalid test data" }`
- Do not call AI APIs (avoid wasting API credits)
- `profileStatus` updated to `'failed'`

**Current Implementation**: ✅ **Implemented** - Function validates test data (generateProfile.ts)

---

## 11. Acceptance Criteria

### AC1: View Profile (Success Case)
- **Given** user has `currentProfile` text for language X
- **When** user taps "View Profile" button on dashboard
- **Then** app navigates to ProfileViewScreen
- **Then** ProfileViewScreen displays:
  - Language name and flag
  - Full profile text
  - Goals list (if available)

### AC2: Profile Status Badge (Pending)
- **Given** `profileStatus === 'pending'` for language X
- **When** dashboard loads
- **Then** language card shows "⏳ Profile Pending" badge (orange)
- **Then** button text is "🔄 Regenerate Profile"

### AC3: Profile Status Badge (Failed)
- **Given** `profileStatus === 'failed'` for language X
- **When** dashboard loads
- **Then** language card shows "❌ Generation Failed" badge (red)
- **Then** button text is "🔄 Regenerate Profile"

### AC4: Profile Regeneration (Success)
- **Given** `profileStatus === 'failed'` for language X
- **When** user taps "🔄 Regenerate Profile"
- **Then** loading spinner appears on button
- **Then** Firebase Function is called with testId
- **Then** (On success) alert shown: "Success! Your profile has been generated successfully."
- **Then** status badge disappears
- **Then** profile text appears on language card
- **Then** button text changes to "View Profile"
- **Then** 30-second cooldown starts

### AC5: Profile Regeneration (Failure)
- **Given** `profileStatus === 'failed'` for language X
- **When** user taps "🔄 Regenerate Profile"
- **Then** Firebase Function is called
- **Then** (On failure) alert shown: "Error - Failed to generate profile. Please try again later."
- **Then** status badge remains "❌ Generation Failed"
- **Then** button text remains "🔄 Regenerate Profile"
- **Then** 20-second cooldown starts

### AC6: Cooldown Timer (Active)
- **Given** cooldown timer is active (e.g., 15 seconds remaining)
- **When** user taps "🔄 Regenerate Profile"
- **Then** alert shown: "Please Wait - You can regenerate again in 15 seconds."
- **Then** no API call is made

### AC7: Cooldown Timer (Expired)
- **Given** cooldown timer reaches 0
- **When** user views language card
- **Then** button text changes from "Wait 15s" to "🔄 Regenerate Profile"
- **Then** button is enabled (tappable)

### AC8: Cooldown Timer Display
- **Given** cooldown timer is counting down (30 → 0)
- **When** user views language card
- **Then** button text updates every second: "Wait 30s" → "Wait 29s" → ... → "Wait 1s" → "🔄 Regenerate Profile"

### AC9: Multiple Rapid Taps Prevention
- **Given** user taps "🔄 Regenerate Profile" 5 times rapidly
- **When** first tap triggers regeneration
- **Then** button shows loading spinner
- **Then** subsequent taps are ignored (no duplicate API calls)

### AC10: Profile Not Available (Empty State)
- **Given** `currentProfile` is `null` for language X
- **When** user navigates to ProfileViewScreen
- **Then** screen displays: "Profile not available. Please regenerate from the dashboard."
- **Then** no profile text or goals are shown

---

## 12. Open Questions / Assumptions

### Question 1: Should Completed Profiles Be Regeneratable?
**Current Behavior**: Once `profileStatus === 'completed'`, regenerate button is hidden. User cannot request a new AI profile.

**Alternatives**:
1. Allow regeneration with confirmation: "Your existing profile will be replaced. Continue?"
2. Save multiple profile versions, let user choose
3. Keep current behavior (lock after first success)

**Decision**: ❓ **TBD** - User to confirm desired behavior

---

### Question 2: Should Cooldown Persist Across App Restarts?
**Current Behavior**: Cooldown is in-memory, resets to 0 on app restart

**Alternatives**:
1. Persist cooldown to AsyncStorage (survives restarts)
2. Use server-side rate limiting (Firestore timestamp check)
3. Keep current behavior (no persistence)

**Decision**: ✅ **Accepted** - Current behavior is acceptable (cooldown abuse has low impact)

---

### Question 3: Should ProfileViewScreen Auto-Update When Regeneration Completes?
**Current Behavior**: ProfileViewScreen is static (reads data on mount, no real-time listener)

**Alternatives**:
1. Add Firestore real-time listener to ProfileViewScreen
2. Trigger re-fetch when user navigates back from Dashboard
3. Keep current behavior (user must navigate back and re-enter)

**Decision**: ❓ **TBD** - User to confirm desired behavior

---

### Question 4: What Happens If Test History Has Multiple Test IDs?
**Current Behavior**: Dashboard uses `testHistory[testHistory.length - 1]` (most recent test)

**Scenario**: User adds Korean → Takes test → Test ID = "test123" → Deletes Korean → Re-adds Korean → Takes new test → Test ID = "test456"

**Assumption**: Most recent test is always the correct one to display

**Risk**: If `testHistory` is not properly maintained, wrong profile may be shown

**Decision**: ✅ **Accepted** - Use most recent test (document this in feature.md)

---

---

# BRAIN DUMP SECTION (PLANNED FEATURES - NOT YET FORMALIZED)

## Feature 3: Music Selection

**Raw Requirement**:
> Music selection section. Should only be available once user.languages.currentprofile is present. tapping on this button allows the user to select a song (maybe using spotify api? what do you suggest? do have basic validation to check if the song is in the language the user selected). I imagine the UI to show active song being learned and another choose song button. If empty state, only have choose song button.

**Status**: 🚧 **Requires Requirement Refinement**

---

## Feature 4: Vocabularies Tracking

**Raw Requirement**:
> Vocabularies tracking section (feature to be fleshed out)

**Status**: 🚧 **Requires Requirement Refinement**

---

## Feature 5: Add Another Language

**Raw Requirement**:
> Add another language. But make sure there is a back button. I believe currently, i am using the select language page that is shared with welcome page. Can we make sure there is a back button such that when accessed through welcome page, it goes back to welcome page and if accessed through dashboard, goes back to dashboard.

**Status**: 🚧 **Requires Requirement Refinement**

---

---

# DASHBOARD FEATURE DOCUMENTATION

## File Ownership

### Primary Components
- `/src/screens/DashboardScreen.tsx` - Main dashboard with status display, language cards, profile regeneration
- `/src/screens/ProfileViewScreen.tsx` - Full profile viewing screen
- `/src/screens/onboarding/ProfileGenerationScreen.tsx` - AI generation loading screen (shared with onboarding)
- `/src/screens/onboarding/ProfileSummaryScreen.tsx` - Post-test profile summary (shared with onboarding)

### State Management
- `/src/contexts/OnboardingContext.tsx` - Global state for user profile, languages, onboarding status
- `/src/hooks/useTestState.ts` - Test progress tracking (used during onboarding, not dashboard)

### Backend Services
- `/functions/src/generateProfile.ts` - Firebase Callable Function for AI profile generation
- `/src/services/profileGeneration.ts` - Client-side wrapper for calling `generateProfile`

### Types & Utilities
- `/src/types/onboarding.ts` - TypeScript types for `UserProfile`, `UserLanguage`, `OnboardingTest`
- `/src/utils/onboardingValidation.ts` - Input validation utilities (not used in dashboard)

---

## Firestore Collections

### `users/{userId}`
**Ownership**: Shared (written by onboarding, read by dashboard)

**Schema**:
```typescript
{
  uid: string,
  email: string,
  displayName?: string,
  photoURL?: string,
  languages: UserLanguage[],
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

**Dashboard Operations**:
- **Read**: Fetch user profile and languages array on mount
- **Write**: None (dashboard is read-only for user data)

---

### `onboardingTests/{testId}`
**Ownership**: Shared (written by onboarding, read by dashboard for profile status)

**Schema**:
```typescript
{
  userId: string,
  languageCode: string,
  answers: TestAnswer[],
  proficiencyLevel?: string,
  aiProfile?: string,
  goals?: string[],
  profileStatus: 'pending' | 'completed' | 'failed' | 'loading',
  profileGeneratedAt?: Timestamp,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

**Dashboard Operations**:
- **Read**: Check `profileStatus` for each completed language
- **Write**: Indirect (via `generateProfile` Firebase Function)

---

## Environment Variables (Backend)

### Required for Profile Regeneration

**File**: `/functions/.env`

```env
OPENAI_API_KEY=sk-proj-...
ANTHROPIC_API_KEY=sk-ant-...
```

**Usage**:
- `OPENAI_API_KEY` - Used by `generateProfile` function for GPT-4o API calls
- `ANTHROPIC_API_KEY` - Fallback for Claude 3.5 Sonnet API calls

**Security**:
- ⚠️ **Never commit .env to git**
- Store in Firebase Functions config or Google Cloud Secret Manager
- Rotate keys regularly

---

## Navigation Flow

### Entry Points to Dashboard

1. **Post-Onboarding** (first-time user):
   - `ProfileSummaryScreen` → User taps "Start Learning" → Navigate to `DashboardScreen`

2. **App Launch** (returning user):
   - `App.tsx` → Check `user.onboardingCompleted` → Navigate to `DashboardScreen`

3. **Resume Incomplete Onboarding** (partial completion):
   - `App.tsx` → Check `user.languages[].onboardingStatus === 'in_progress'` → Navigate to `DashboardScreen` (with resume banner)

### Exit Points from Dashboard

1. **Resume Onboarding**:
   - Tap resume banner → Call `onResumeOnboarding()` → Navigate to onboarding test screen

2. **View Profile**:
   - Tap "View Profile" button → Navigate to `ProfileViewScreen` (pass `language` object via route params)

3. **Add Another Language** (planned):
   - Tap "Add Language" button → Navigate to `LanguageSelectionScreen` (with back button to Dashboard)

---

## Dependencies

### External Libraries
- `@react-navigation/native` - Navigation between screens
- `firebase/firestore` - Firestore database access
- `firebase/functions` - Callable function for profile generation
- React Native `Alert` - Alerts for success/error messages
- React Native `ActivityIndicator` - Loading spinners

### Internal Dependencies
- `OnboardingContext` - Must be initialized in `App.tsx` with Firestore listener
- Firebase Authentication - User must be logged in to access dashboard

---

## Configuration Points

### Dashboard Screen Behavior

**File**: `/src/screens/DashboardScreen.tsx`

**Configurable Constants**:
```typescript
const COOLDOWN_AFTER_SUCCESS = 30; // seconds
const COOLDOWN_AFTER_FAILURE = 20; // seconds
const PROFILE_STATUS_CHECK_ON_MOUNT = true; // Enable/disable automatic status checking
```

**Customizable UI Text**:
- Resume banner title: "Complete Your Onboarding"
- Success card title: "Onboarding Complete!"
- Regenerate button text: "🔄 Regenerate Profile"
- Cooldown button text: "Wait {X}s"

---

## Cross-References

### Related Documentation
- **Onboarding Requirements**: `/docs/features/onboarding/requirements.md`
  - See Section 2.7 (Profile Regeneration) for backend function details
  - See Section 2.6 (Dashboard Access Control) for context on onboarding completion
- **Onboarding Technical Implementation**: `/docs/features/onboarding/technical-implementation.md`
  - See lines 1010-1194 for resume behavior and state management
- **Security Playbook**: `/security-playbook.md` (if exists)
  - Check for API key security guidelines

---

## Status

### Requirements Status
- [x] Requirements gathering (brain dump phase) - Features 1-2 complete, 3-5 in progress
- [x] Requirements refinement - Features 1-2 refined
- [x] Formal requirements complete - Features 1-2 formalized (this document)
- [ ] Requirements frozen - Awaiting user approval

### Implementation Status
- [x] Feature 1: Onboarding Status Display - **IMPLEMENTED**
- [x] Feature 2: AI Profile Viewing & Regeneration - **IMPLEMENTED**
- [ ] Feature 3: Music Selection - **PLANNED**
- [ ] Feature 4: Vocabulary Tracking - **PLANNED**
- [ ] Feature 5: Add Another Language - **PLANNED**

---

## Notes

### Design Decisions

1. **Resume Behavior Changed (2026-01-12)**:
   - Previous: Resume from last screen (e.g., Question 5)
   - Current: Restart from Question 1 (simpler UX, no state persistence complexity)
   - Rationale: Avoid partial test state bugs, simplify AsyncStorage management

2. **Profile Regeneration Uses Manual Trigger (Not Scheduled Jobs)**:
   - Previous approach considered: Scheduled Cloud Function retries every 5 minutes
   - Current approach: User taps "Regenerate Profile" on-demand
   - Rationale: Better user control, immediate feedback, simpler architecture

3. **Cooldown Timers Not Persisted Across App Restarts**:
   - Cooldown stored in component state (in-memory)
   - App restart resets cooldown to 0
   - Rationale: Low abuse risk, simpler implementation

### Known Limitations

1. **ProfileViewScreen Does Not Auto-Update**:
   - User must navigate back to Dashboard and re-enter ProfileViewScreen to see regenerated profile
   - No real-time Firestore listener on ProfileViewScreen
   - **Mitigation**: Could add listener in future iteration

2. **No Server-Side Rate Limiting**:
   - Client-side cooldown can be bypassed by reinstalling app
   - **Risk**: Low (profile regeneration is expensive but not abusable at scale)
   - **Mitigation**: Could add Firestore timestamp check in Firebase Function

3. **Empty State Handling Incomplete**:
   - Edge case: User with no languages shows empty dashboard (no "Add Language" CTA)
   - **Status**: Needs verification and implementation

### Future Enhancements

- [ ] Add real-time listener to ProfileViewScreen for auto-updates
- [ ] Implement server-side rate limiting for profile regeneration
- [ ] Add "Add Language" empty state CTA
- [ ] Allow regeneration of completed profiles (with confirmation dialog)
- [ ] Save multiple profile versions (history feature)
