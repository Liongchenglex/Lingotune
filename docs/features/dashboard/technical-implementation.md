# Dashboard Feature - Technical Implementation

## Overview

This document tracks the implementation of dashboard features including onboarding status display and AI profile viewing/regeneration.

**Status**: ✅ COMPLETE (Features 1-2)

---

## Implementation Summary

### Completed Features

1. **Onboarding Status Display** - Shows resume banner for in-progress onboarding, success card for completion
2. **AI Profile Viewing** - View profile on dashboard and ProfileViewScreen
3. **Profile Regeneration** - Manual retry with cooldown timers and status badges

### Related Documentation

- **Requirements**: `/docs/features/dashboard/requirements.md`
- **Onboarding Context**: See `/docs/features/onboarding/technical-implementation.md` for OnboardingContext details
- **Profile Generation Backend**: See `/docs/features/onboarding/technical-implementation.md` Section 15 for Firebase Function details

---

## Section 1: Dashboard-First Navigation with Resume Banner

**Date**: 2026-01-07
**Status**: ✅ COMPLETE

### Problem
Original requirements specified a "blocking overlay" that prevents dashboard access until onboarding is complete. However, this creates a poor UX where users can't see what they're working toward. Users who quit mid-onboarding should land on the dashboard to understand the value proposition, but with clear guidance to complete onboarding.

### Solution
Implemented "dashboard-first" navigation with prominent resume banner:

**User Flow:**
1. User starts onboarding, answers questions 1-5
2. User quits app
3. User reopens app → **lands on dashboard** (not stuck in onboarding)
4. Dashboard shows prominent orange banner at top: "⏸️ Complete Your Onboarding - Resume where you left off →"
5. All learning features are disabled with message "Complete Onboarding First"
6. User taps banner → resumes from question 5

**Benefits:**
- Users see dashboard content immediately (value proposition)
- Clear call-to-action to complete onboarding
- Non-blocking UX (users can explore, but can't use features)
- Maintains resume functionality from saved state

### Implementation

**Files Changed:**
1. `src/navigation/MainNavigator.tsx`
2. `src/screens/DashboardScreen.tsx`

#### MainNavigator Changes

**Before:**
```typescript
// Always checked onboarding status, routed to either dashboard OR onboarding
if (hasCompletedOnboarding) {
  return <DashboardScreen />;
}
// Show onboarding flow...
```

**After:**
```typescript
// Dashboard is default view, toggle flag to show onboarding
const [showingOnboarding, setShowingOnboarding] = useState(false);

const handleResumeOnboarding = () => {
  if (currentLanguage && currentLanguage.currentScreen) {
    setCurrentScreen(currentLanguage.currentScreen); // Resume from saved screen
    setSelectedLanguage(currentLanguage.languageCode);
    setShowingOnboarding(true);
  }
};

if (!showingOnboarding) {
  return (
    <DashboardScreen
      onResumeOnboarding={hasInProgressOnboarding ? handleResumeOnboarding : undefined}
      onAddLanguage={handleStartNewLanguage}
    />
  );
}
```

**Key Logic:**
- `showingOnboarding` state flag controls whether to show dashboard or onboarding screens
- Dashboard is shown by default (unless explicitly in onboarding flow)
- `handleResumeOnboarding` callback resumes from `currentLanguage.currentScreen`
- `hasInProgressOnboarding` = `currentLanguage && currentLanguage.onboardingStatus === 'in_progress'`

#### DashboardScreen Changes

**Props Added:**
```typescript
interface DashboardScreenProps {
  onResumeOnboarding?: () => void; // If provided, show resume banner
  onAddLanguage?: () => void;      // Navigate to language selection
}
```

**Resume Banner (shown when `onResumeOnboarding` provided):**
```tsx
{hasInProgressOnboarding && (
  <TouchableOpacity
    style={styles.resumeBanner}
    onPress={onResumeOnboarding}
    activeOpacity={0.8}
  >
    <View style={styles.resumeBannerContent}>
      <Text style={styles.resumeBannerIcon}>⏸️</Text>
      <View style={styles.resumeBannerText}>
        <Text style={styles.resumeBannerTitle}>Complete Your Onboarding</Text>
        <Text style={styles.resumeBannerDescription}>
          Resume where you left off and unlock all features
        </Text>
      </View>
      <Text style={styles.resumeBannerArrow}>→</Text>
    </View>
  </TouchableOpacity>
)}
```

**Disabled Features:**
```tsx
<TouchableOpacity
  style={[styles.startButton, hasInProgressOnboarding && styles.startButtonDisabled]}
  disabled={hasInProgressOnboarding}
>
  <Text style={styles.startButtonText}>
    {hasInProgressOnboarding ? 'Complete Onboarding First' : 'Start Learning'}
  </Text>
</TouchableOpacity>
```

**Styling:**
- Orange banner (#FEF3C7 background, #F59E0B border)
- Prominent placement at top of dashboard
- Shadow effect for visibility
- Disabled buttons use gray (#D1D5DB)

### Resume Mechanism

**State Persistence:**
1. `OnboardingContext` saves `currentScreen` to Firestore on screen change
2. `MainNavigator` checks `currentLanguage.currentScreen` on mount
3. If present, banner is shown and resume callback is wired up

**Resume Flow:**
1. User taps banner
2. `handleResumeOnboarding()` called
3. Sets `currentScreen` to saved value (e.g., 'test')
4. Sets `showingOnboarding = true`
5. MainNavigator switches to onboarding flow
6. TestScreen loads from saved `currentQuestionIndex` and `tempAnswers`

### Deviation from Original Requirements

**Original Requirement** (requirements.md lines 247-257):
- Dashboard content blurred/darkened
- Blocking modal overlay
- "Continue Setup" button
- No close/dismiss option

**Implemented Approach**:
- Dashboard content visible (not blurred)
- Non-blocking banner (not modal)
- "Complete Your Onboarding" banner with tap-to-resume
- Features disabled until completion

**Rationale for Deviation:**
- Better onboarding experience (see value before committing)
- Reduces perceived friction
- Maintains same functionality (users must complete onboarding)
- More modern UX pattern (progressive disclosure)

**Requirements Update Needed:**
- ✅ Section 2.6 "Dashboard Access Control" has been updated in `/docs/features/dashboard/requirements.md` to reflect non-blocking banner approach

### Testing

**Test Cases:**
1. ✅ New user signs up → sees dashboard with resume banner
2. ✅ User taps banner → navigates to welcome screen
3. ✅ User starts onboarding, quits at question 5 → reopens → sees dashboard with banner
4. ✅ User taps banner → resumes from question 5 (not question 1)
5. ✅ User completes onboarding → dashboard shows no banner, features enabled
6. ✅ Completed user sees "Start Learning" buttons (not "Complete Onboarding First")

**Console Logging Added:**
```typescript
console.log('MainNavigator - hasCompletedOnboarding:', hasCompletedOnboarding);
console.log('MainNavigator - hasInProgressOnboarding:', hasInProgressOnboarding);
console.log('MainNavigator - showingOnboarding:', showingOnboarding);
```

### Future Considerations

1. **Analytics**: Track resume banner tap rate vs drop-off
2. **A/B Test**: Compare blocking overlay vs banner approach
3. **Onboarding Progress**: Show progress indicator in banner (e.g., "5/15 questions complete")
4. **Time Estimate**: Display "~8 minutes remaining" based on average question time

---

## Section 2: Profile Regeneration Functionality

**Date**: 2026-01-12
**Status**: ✅ COMPLETE

### Problem
When AI profile generation fails (both OpenAI and Claude fail), users need a way to retry profile generation without restarting the entire test. The previous implementation used a scheduled background job (`retryProfileGeneration`) which had limitations:
- No user visibility into retry status
- No control over when retry happens
- Complex scheduled function logic
- Users couldn't manually trigger retry

### Solution
Implemented "Regenerate Profile" button on DashboardScreen that directly calls the `generateProfile` callable function.

**User Flow:**
1. User completes test, but AI generation fails (or takes too long)
2. User clicks "Go to Dashboard" on ProfileGenerationScreen
3. Dashboard shows language card with status badge:
   - **"Profile Pending"** (orange) if `profileStatus === 'pending'`
   - **"Generation Failed"** (red) if `profileStatus === 'failed'`
4. User taps "Regenerate Profile" button on language card
5. Function is called directly with existing testId
6. Success → Profile appears on dashboard
7. Failure → User sees error, can retry again

**Benefits:**
- **User control**: Manual retry instead of waiting for background job
- **Immediate feedback**: User sees success/failure immediately
- **Simpler architecture**: No scheduled function needed
- **Better UX**: Clear status badges and actionable button

### Implementation

**Files Changed:**
1. `src/screens/DashboardScreen.tsx`
2. `src/services/profileGeneration.ts` (used by both ProfileGenerationScreen and DashboardScreen)
3. `functions/src/generateProfile.ts` (idempotent, can be called multiple times)

#### DashboardScreen Changes

**State Management:**
```typescript
const [profileStatuses, setProfileStatuses] = useState<Record<string, string>>({});
const [regeneratingLanguage, setRegeneratingLanguage] = useState<string | null>(null);
const [cooldownTimers, setCooldownTimers] = useState<Record<string, number>>({});

// Load profile statuses from Firestore
useEffect(() => {
  const loadProfileStatuses = async () => {
    const statuses: Record<string, string> = {};
    for (const language of userProfile.languages) {
      const testId = language.testHistory[language.testHistory.length - 1];
      if (testId) {
        const testDoc = await getDoc(doc(db, 'onboardingTests', testId));
        if (testDoc.exists()) {
          statuses[language.languageCode] = testDoc.data().profileStatus;
        }
      }
    }
    setProfileStatuses(statuses);
  };
  loadProfileStatuses();
}, [userProfile]);

// Cooldown timer (decrements every second)
useEffect(() => {
  const interval = setInterval(() => {
    setCooldownTimers((prev) => {
      const updated = { ...prev };
      for (const key in updated) {
        if (updated[key] > 0) {
          updated[key] -= 1;
        }
      }
      return updated;
    });
  }, 1000);

  return () => clearInterval(interval);
}, []);
```

**Regenerate Handler:**
```typescript
const handleRegenerateProfile = async (languageCode: string, testId: string) => {
  // Check cooldown
  if (cooldownTimers[languageCode] && cooldownTimers[languageCode] > 0) {
    Alert.alert(
      'Please Wait',
      `You can regenerate again in ${cooldownTimers[languageCode]} seconds.`
    );
    return;
  }

  try {
    setRegeneratingLanguage(languageCode);
    setProfileStatuses((prev) => ({ ...prev, [languageCode]: 'loading' }));

    const result = await generateProfileForTest(testId);

    if (result.success && result.profile) {
      setProfileStatuses((prev) => ({ ...prev, [languageCode]: 'completed' }));
      Alert.alert('Success!', 'Your profile has been generated successfully.');
      setCooldownTimers((prev) => ({ ...prev, [languageCode]: 30 })); // 30s cooldown
    } else {
      throw new Error('Invalid response');
    }
  } catch (error: any) {
    setProfileStatuses((prev) => ({ ...prev, [languageCode]: 'failed' }));
    Alert.alert('Error', 'Failed to generate profile. Please try again later.');
    setCooldownTimers((prev) => ({ ...prev, [languageCode]: 20 })); // 20s cooldown
  } finally {
    setRegeneratingLanguage(null);
  }
};
```

**UI Rendering:**
```tsx
{/* Status badge */}
{status === 'pending' && (
  <View style={styles.statusBadge}>
    <Text style={styles.statusBadgeText}>⏳ Profile Pending</Text>
  </View>
)}
{status === 'failed' && (
  <View style={[styles.statusBadge, styles.statusBadgeFailed]}>
    <Text style={styles.statusBadgeText}>❌ Generation Failed</Text>
  </View>
)}

{/* Regenerate button */}
<TouchableOpacity
  style={styles.startButton}
  onPress={() => handleRegenerateProfile(language.languageCode, testId)}
  disabled={regeneratingLanguage === language.languageCode || cooldownTimers[language.languageCode] > 0}
>
  {regeneratingLanguage === language.languageCode ? (
    <ActivityIndicator color="#fff" />
  ) : (
    <Text style={styles.startButtonText}>
      {cooldownTimers[language.languageCode] && cooldownTimers[language.languageCode] > 0
        ? `Wait ${cooldownTimers[language.languageCode]}s`
        : status === 'pending' || status === 'failed'
        ? '🔄 Regenerate Profile'
        : 'View Profile'}
    </Text>
  )}
</TouchableOpacity>
```

**Styling:**
- Orange badge for "Profile Pending" (#FEF3C7 background, #F59E0B border)
- Red badge for "Generation Failed" (#FEE2E2 background, #EF4444 border)
- Blue regenerate button (#3B82F6)
- Loading spinner during regeneration
- Clear visual hierarchy

### Cooldown Logic

**Purpose**: Prevent API abuse by limiting regeneration frequency

**Timers:**
- **30 seconds** after successful regeneration
- **20 seconds** after failed regeneration

**Implementation:**
- Cooldown stored in component state (in-memory, resets on app restart)
- Timer decrements every second via `setInterval`
- Button text changes to "Wait Xs" during cooldown
- Button is disabled during cooldown

**User Feedback:**
- Alert shown if user taps during cooldown: "Please Wait - You can regenerate again in X seconds."
- Button text updates in real-time: "Wait 30s" → "Wait 29s" → ... → "Wait 1s" → "🔄 Regenerate Profile"

### Edge Cases Handled

**1. Profile Already Exists**
- **Scenario**: User taps "Regenerate Profile" but profile was generated in background
- **Behavior**: Function returns existing profile immediately (idempotent)
- **Implementation**: `generateProfile.ts` checks `profileStatus === 'completed' && aiProfile` at start

**2. Multiple Rapid Taps**
- **Scenario**: User taps "Regenerate Profile" button multiple times rapidly
- **Behavior**: First tap triggers regeneration, subsequent taps ignored
- **Implementation**: `regeneratingLanguage` state blocks duplicate calls, button shows ActivityIndicator

**3. Network Failure During Regenerate**
- **Scenario**: User taps regenerate, but loses connection
- **Behavior**: Error alert shown, user can retry when online
- **Implementation**: try/catch in handleRegenerateProfile with user-friendly error

**4. Both AI Services Fail Again**
- **Scenario**: User regenerates, but both OpenAI and Claude fail again
- **Behavior**: Status remains 'failed', user can retry later
- **Implementation**: Function updates status to 'failed', error returned to client

**5. User Has Multiple Languages with Different Statuses**
- **Scenario**: Korean profile completed, Chinese profile failed
- **Behavior**: Each language card shows independent status badge
- **Implementation**: `profileStatuses` state is a map keyed by languageCode

**6. Cooldown Active, User Taps Button**
- **Scenario**: User taps button while cooldown timer is counting down
- **Behavior**: Alert shown: "Please Wait - You can regenerate again in X seconds."
- **Implementation**: Early return in handleRegenerateProfile if cooldown active

**7. User Closes App During Cooldown**
- **Scenario**: Cooldown timer at 15s, user closes app and reopens
- **Behavior**: Cooldown resets to 0 (not persisted)
- **Implementation**: Cooldown is in-memory state, not saved to AsyncStorage/Firestore

### Testing

**Test Cases:**
1. ✅ Profile generation fails → Dashboard shows "Profile Pending" badge
2. ✅ User taps "Regenerate Profile" → Function called with correct testId
3. ✅ Regenerate succeeds → Badge removed, profile displayed
4. ✅ Regenerate fails → Badge changes to "Generation Failed"
5. ✅ User has completed language + pending language → Each shows correct status
6. ✅ Multiple rapid taps → Only one function call (regeneratingLanguage blocks duplicates)
7. ✅ Profile already exists → Function returns immediately without regenerating
8. ✅ Cooldown timer active → Button disabled, shows "Wait Xs"
9. ✅ Cooldown expires → Button enabled, shows "🔄 Regenerate Profile"
10. ✅ User taps during cooldown → Alert shown, no API call made

**Console Logging:**
```typescript
console.log('handleRegenerateProfile - languageCode:', languageCode);
console.log('handleRegenerateProfile - testId:', testId);
console.log('handleRegenerateProfile - result:', result);
console.log('Cooldown timer for', languageCode, ':', cooldownTimers[languageCode]);
```

### Future Considerations

1. **Progress Indicator**: Show loading spinner instead of alert modal
2. **Retry Count**: Track number of regenerate attempts, warn after 3+ failures
3. **Auto-Retry**: Offer to auto-retry every X minutes (opt-in)
4. **Partial Profile**: If AI returns partial response, show what's available
5. **Cooldown Persistence**: Save cooldown timers to AsyncStorage (survives app restart)
6. **Server-Side Rate Limiting**: Add Firestore timestamp check in Firebase Function

---

## Section 3: Profile Viewing

**Date**: 2026-01-07
**Status**: ✅ COMPLETE

### Implementation

**Files:**
1. `src/screens/DashboardScreen.tsx` - Shows profile preview (goals)
2. `src/screens/ProfileViewScreen.tsx` - Full profile display

### Dashboard Profile Preview

**Profile Preview Display (DashboardScreen.tsx lines 268-291):**
```tsx
{/* Current Profile (if available) */}
{language.currentProfile && (
  <View style={styles.profilePreview}>
    <Text style={styles.profileLabel}>Current Focus:</Text>
    {language.goals && language.goals.length > 0 && (
      <View style={styles.goalsContainer}>
        {language.goals.slice(0, 3).map((goal, index) => (
          <Text key={index} style={styles.goalItem}>
            • {goal}
          </Text>
        ))}
      </View>
    )}
  </View>
)}

{/* Placeholder if profile not ready */}
{!language.currentProfile && (
  <View style={styles.profilePending}>
    <Text style={styles.profilePendingText}>
      🔄 Your personalized learning profile is being generated...
    </Text>
  </View>
)}
```

**Behavior:**
- Shows first 3 goals if profile exists
- Shows placeholder text if profile is being generated
- Tapping "View Profile" button navigates to ProfileViewScreen

### ProfileViewScreen

**Full Profile Display (ProfileViewScreen.tsx lines 54-65):**
```tsx
{language.currentProfile ? (
  <View style={styles.profileCard}>
    <Text style={styles.sectionTitle}>Your Learning Profile</Text>
    <Text style={styles.profileText}>{language.currentProfile}</Text>
  </View>
) : (
  <View style={styles.noProfileCard}>
    <Text style={styles.noProfileText}>
      Profile not available. Please regenerate from the dashboard.
    </Text>
  </View>
)}
```

**Navigation:**
- Receives `language` object via route params
- Back button navigates to Dashboard
- No real-time Firestore listener (static view)

**Known Limitation:**
- ProfileViewScreen does not auto-update when profile regeneration completes
- User must navigate back to Dashboard and re-enter to see new profile
- **Future Enhancement**: Add Firestore real-time listener

---

## Section 4: Music Selection UI Foundation

**Date**: 2026-01-13
**Status**: ⚙️ PARTIAL - UI foundation implemented

### Purpose

Provide a visual section on the dashboard for music-based learning, showing empty state ("Choose Song") or active song with the ability to change. This is the UI foundation; full song selection logic (Spotify API integration, language validation) will be implemented in a separate feature.

### Implementation

**Files Modified:**
1. `src/screens/DashboardScreen.tsx` - Added music selection section
2. `src/types/onboarding.ts` - Added `CurrentSong` interface and `UserLanguage.currentSong` field

### Visibility Condition

**Music section only shows when**:
```typescript
language.currentProfile && language.currentProfile.length > 0
```

**Rationale**: Music-based learning requires proficiency assessment to recommend appropriate content.

### UI States

#### Empty State (No Song Selected)

**Display Condition**: `!language.currentSong`

```tsx
{language.currentProfile && !language.currentSong && (
  <View style={styles.musicSection}>
    <Text style={styles.musicSectionTitle}>🎵 Learn with Music</Text>
    <View style={styles.musicEmptyState}>
      <Text style={styles.musicEmptyText}>
        Choose a song in [Language] to start learning vocabulary
      </Text>
      <TouchableOpacity
        style={styles.chooseSongButton}
        onPress={() => {
          Alert.alert('Coming Soon', 'Song selection feature will be available soon!');
        }}
      >
        <Text style={styles.chooseSongButtonText}>+ Choose Song</Text>
      </TouchableOpacity>
    </View>
  </View>
)}
```

**UI Elements**:
- Section title: "🎵 Learn with Music"
- Descriptive text explaining the feature
- "Choose Song" button (currently shows "Coming Soon" alert)

**Styling**:
- Light gray background (#F9FAFB for song cards)
- Purple button (#6366F1 with #EEF2FF background)
- Centered alignment for empty state

#### Active State (Song Selected)

**Display Condition**: `language.currentSong` exists

```tsx
{language.currentProfile && language.currentSong && (
  <View style={styles.musicSection}>
    <Text style={styles.musicSectionTitle}>🎵 Currently Learning</Text>
    <View style={styles.musicActiveState}>
      <View style={styles.currentSongInfo}>
        <Text style={styles.currentSongIcon}>🎵</Text>
        <View style={styles.currentSongText}>
          <Text style={styles.currentSongTitle}>{language.currentSong.title}</Text>
          <Text style={styles.currentSongArtist}>{language.currentSong.artist}</Text>
        </View>
      </View>
      <TouchableOpacity
        style={styles.chooseSongButton}
        onPress={() => {
          Alert.alert('Coming Soon', 'Song selection feature will be available soon!');
        }}
      >
        <Text style={styles.chooseSongButtonText}>+ Choose Another Song</Text>
      </TouchableOpacity>
    </View>
  </View>
)}
```

**UI Elements**:
- Section title: "🎵 Currently Learning"
- Song card showing:
  - Song icon (🎵)
  - Song title (bold, 15px)
  - Artist name (gray, 13px)
- "Choose Another Song" button below

**Styling**:
- Song card: Light gray background (#F9FAFB), rounded corners
- Song info: Horizontal layout with icon + text
- Button: Same styling as empty state

### Data Model

**TypeScript Interface** (`src/types/onboarding.ts`):

```typescript
export interface CurrentSong {
  id: string;          // Song identifier (e.g., Spotify track ID)
  title: string;       // Song title
  artist: string;      // Artist name
  addedAt: Timestamp;  // When song was added
}

export interface UserLanguage {
  // ... existing fields
  currentSong?: CurrentSong; // Currently selected song for this language
}
```

**Firestore Structure** (`users/{userId}`):

```typescript
{
  languages: [
    {
      languageCode: "ko",
      currentProfile: "...",
      currentSong: {
        id: "spotify:track:abc123",
        title: "Dynamite",
        artist: "BTS",
        addedAt: Timestamp
      }
    }
  ]
}
```

### Button Behavior (Current Implementation)

**Empty State Button**:
- Text: "+ Choose Song"
- Action: Shows alert "Coming Soon - Song selection feature will be available soon!"
- Future: Will navigate to song selection screen (to be implemented)

**Active State Button**:
- Text: "+ Choose Another Song"
- Action: Shows alert "Coming Soon - Song selection feature will be available soon!"
- Future: Will navigate to song selection screen with option to change song

### Integration Points (Future)

**Not Implemented**:
- Song selection screen
- Spotify API integration
- Language validation for selected songs
- Vocabulary extraction from lyrics
- Progress tracking per song
- Multiple songs per language (playlist)

**Cross-Reference**: Full implementation will be documented in `/docs/features/learnmusic/requirements.md` and `/docs/features/learnmusic/technical-implementation.md` (to be created)

### Edge Cases Handled

1. **Profile Not Ready**: Music section hidden entirely
2. **No Song Selected**: Shows empty state with "Choose Song" button
3. **Song Selected**: Shows current song info + "Choose Another Song" button
4. **Multiple Languages**: Each language has independent music section and song selection

### Testing Checklist

- [x] Music section hidden when `currentProfile` is null/undefined
- [x] Music section shown when `currentProfile` exists
- [x] Empty state displays correctly with "Choose Song" button
- [x] Button tap shows "Coming Soon" alert
- [x] Active state displays correctly with song title + artist
- [x] "Choose Another Song" button shown in active state
- [x] Styling matches dashboard theme (purple buttons, gray backgrounds)

### Future Enhancements

1. **Song Selection Screen**: Navigate to full song selection flow
2. **Spotify Integration**: Search and select songs via Spotify API
3. **Language Validation**: Ensure selected song matches user's language
4. **Lyrics Display**: Show lyrics for vocabulary learning
5. **Multiple Songs**: Allow users to select multiple songs (playlist)
6. **Progress Tracking**: Track vocabulary learned per song
7. **Recommendations**: AI-powered song recommendations based on proficiency level

---

## File Structure

### Primary Components
```
src/
  screens/
    DashboardScreen.tsx          ✅ Status display, profile preview, regeneration
    ProfileViewScreen.tsx        ✅ Full profile viewing
    onboarding/
      ProfileGenerationScreen.tsx ✅ AI generation loading (shared with onboarding)
      ProfileSummaryScreen.tsx    ✅ Post-test profile summary (shared with onboarding)

  navigation/
    MainNavigator.tsx            ✅ Dashboard-first routing, resume logic

  services/
    profileGeneration.ts         ✅ Client wrapper for generateProfile function

  contexts/
    OnboardingContext.tsx        ✅ Global state (see onboarding technical docs)
```

### Backend Services
```
functions/
  src/
    generateProfile.ts           ✅ Firebase Callable Function (OpenAI → Claude fallback)
```

### Shared Resources
- `/src/types/onboarding.ts` - TypeScript types for UserProfile, UserLanguage, OnboardingTest
- `/src/contexts/OnboardingContext.tsx` - Provides userProfile state to Dashboard

---

## Data Flow

### Onboarding Status Check (On Dashboard Mount)

```
DashboardScreen
    ↓
OnboardingContext.userProfile
    ↓
Check: languages[].onboardingStatus
    ↓
  ┌─────────┴─────────┐
  │                   │
'in_progress'    'completed'
  │                   │
  ↓                   ↓
Show Resume Banner  Show Success Card
  │                   │
  ↓                   ↓
onResumeOnboarding  Language Cards
  callback          (enabled)
```

### Profile Status Check (On Dashboard Mount)

```
DashboardScreen
    ↓
For each completed language:
    ↓
Get mostRecentTestId from testHistory
    ↓
Fetch onboardingTests/{testId} from Firestore
    ↓
Read profileStatus field
    ↓
Store in profileStatuses state
    ↓
  ┌──────┴──────┐
  │             │
'pending'/'failed'  'completed'
  │             │
  ↓             ↓
Show Badge    Hide Badge
Show "Regenerate"  Show "View Profile"
```

### Profile Regeneration Flow

```
User taps "Regenerate Profile"
    ↓
Check cooldown timer
    ↓
  ┌─────┴─────┐
Active      Expired
  │           │
  ↓           ↓
Alert      Continue
"Wait Xs"     │
              ↓
Set loading state (ActivityIndicator)
              ↓
Call generateProfileForTest(testId)
              ↓
Firebase Function: generateProfile
              ↓
    ┌─────────┴─────────┐
    │                   │
  Success             Failure
    │                   │
    ↓                   ↓
Update Firestore    Update Firestore
profileStatus='completed'  profileStatus='failed'
    │                   │
    ↓                   ↓
Alert "Success!"   Alert "Error"
30s cooldown       20s cooldown
    │                   │
    ↓                   ↓
Badge removed      Badge remains
Profile displayed  User can retry
```

---

## Environment Variables

### Client-Side
**No environment variables required** - Dashboard uses OnboardingContext and Firestore directly

### Backend (Firebase Functions)
**File**: `/functions/.env`

```env
OPENAI_API_KEY=sk-proj-...
ANTHROPIC_API_KEY=sk-ant-...
```

**Usage**: See `/docs/features/onboarding/technical-implementation.md` Section 15 for profile generation backend details

---

## Configuration Constants

### DashboardScreen.tsx

```typescript
// Cooldown timers (seconds)
const COOLDOWN_AFTER_SUCCESS = 30;
const COOLDOWN_AFTER_FAILURE = 20;

// UI Text
const RESUME_BANNER_TITLE = 'Complete Your Onboarding';
const RESUME_BANNER_DESCRIPTION = 'Resume where you left off and unlock all features';
const SUCCESS_CARD_TITLE = 'Onboarding Complete!';
const SUCCESS_CARD_MESSAGE = 'Your personalized learning path is ready';
```

---

## Known Issues & Limitations

### 1. ProfileViewScreen Does Not Auto-Update
- **Issue**: User must navigate back to Dashboard to see regenerated profile
- **Impact**: Medium (acceptable for MVP)
- **Mitigation**: Add Firestore real-time listener in future iteration

### 2. Cooldown Timer Not Persisted
- **Issue**: Cooldown resets to 0 on app restart
- **Impact**: Low (abuse risk is minimal)
- **Mitigation**: Could persist to AsyncStorage if abuse becomes an issue

### 3. No Server-Side Rate Limiting
- **Issue**: Client-side cooldown can be bypassed by reinstalling app
- **Impact**: Low (profile regeneration is expensive but not easily abusable at scale)
- **Mitigation**: Could add Firestore timestamp check in Firebase Function

### 4. Empty State Not Fully Implemented
- **Issue**: User with no languages shows empty dashboard (no "Add Language" CTA)
- **Status**: Needs verification and implementation
- **Impact**: Low (users typically have at least one language after onboarding)

---

## Security Considerations

### 1. Profile Regeneration
- ✅ Firebase Function validates userId before regenerating profile
- ✅ testId ownership verified via Firestore rules
- ✅ Cooldown prevents rapid-fire API abuse
- ❌ No server-side rate limiting (future enhancement)

### 2. Data Access
- ✅ Dashboard reads from OnboardingContext (authenticated user only)
- ✅ Firestore rules enforce userId match on profile status reads
- ✅ No direct Firestore writes from dashboard (read-only except via Firebase Function)

---

## Performance Considerations

### 1. Profile Status Checks
- **Current**: Fetches profile status for all completed languages on mount
- **Optimization Needed**: If user has 10+ languages, this could be slow
- **Recommendation**: Paginate language cards or use Firestore real-time listeners

### 2. Cooldown Timer
- **Current**: `setInterval` runs every second, updates state
- **Impact**: Minimal (only affects cooldown countdown display)
- **Optimization**: Could use single global interval for all timers

---

## Future Enhancements

1. **Real-Time Profile Updates**: Add Firestore listener to ProfileViewScreen
2. **Server-Side Rate Limiting**: Add timestamp check in Firebase Function
3. **Cooldown Persistence**: Save cooldown timers to AsyncStorage
4. **Progress Indicators**: Show "5/15 questions complete" in resume banner
5. **Analytics**: Track regeneration success rate, cooldown bypass attempts
6. **Multiple Profile Versions**: Save profile history, allow user to view previous versions
7. **Empty State**: Add "Add Language" CTA when user has no languages
8. **Profile Editing**: Allow users to manually edit AI-generated profiles (long-term)

---

## Deployment Status

**Deployed Components:**
- ✅ DashboardScreen with resume banner and profile regeneration
- ✅ ProfileViewScreen for full profile display
- ✅ MainNavigator dashboard-first routing
- ✅ Firebase Function: generateProfile (idempotent)
- ✅ Firestore Security Rules (enforce userId ownership)

**Environment:**
- ✅ Production: Firebase Hosting + Cloud Functions (us-central1)
- ✅ Firebase Functions: Node.js 20
- ✅ React Native: Expo SDK 52

---

## Cross-References

### Related Documentation
- **Requirements**: `/docs/features/dashboard/requirements.md`
- **Onboarding Technical Docs**: `/docs/features/onboarding/technical-implementation.md`
  - Section 2: OnboardingContext implementation
  - Section 15: Profile generation Firebase Function
- **Onboarding Requirements**: `/docs/features/onboarding/requirements.md`
  - Section 2.6: Dashboard Access Control (cross-referenced)
  - Section 2.7: Profile Regeneration (moved to dashboard docs)

### Related Code Files
- `src/screens/DashboardScreen.tsx` - Main implementation
- `src/screens/ProfileViewScreen.tsx` - Profile viewing
- `src/navigation/MainNavigator.tsx` - Dashboard-first routing
- `src/services/profileGeneration.ts` - Client wrapper
- `functions/src/generateProfile.ts` - Backend function
- `src/contexts/OnboardingContext.tsx` - State management

---

## Testing Checklist

### Feature 1: Onboarding Status Display
- [x] New user signs up → sees dashboard with resume banner
- [x] User taps banner → navigates to onboarding
- [x] User quits at question 5 → reopens → sees banner
- [x] User completes onboarding → banner disappears
- [x] Completed user sees enabled "View Profile" buttons
- [x] In-progress user sees disabled buttons with "Complete Onboarding First"

### Feature 2: Profile Viewing
- [x] User taps "View Profile" → navigates to ProfileViewScreen
- [x] ProfileViewScreen displays full profile text
- [x] ProfileViewScreen shows goals list (if available)
- [x] Back button navigates to Dashboard
- [x] Profile preview on dashboard shows first 3 goals
- [x] Placeholder shown if profile not ready

### Feature 3: Profile Regeneration
- [x] Profile generation fails → Badge shows "❌ Generation Failed"
- [x] User taps "Regenerate Profile" → Function called
- [x] Regenerate succeeds → Badge removed, profile displayed
- [x] Regenerate fails → Badge remains, user can retry
- [x] Multiple rapid taps → Only one API call (ActivityIndicator shown)
- [x] Cooldown active → Button shows "Wait Xs", disabled
- [x] Cooldown expires → Button shows "🔄 Regenerate Profile", enabled
- [x] User taps during cooldown → Alert shown, no API call
- [x] Multiple languages → Each shows independent status

---

**Last Updated**: 2026-01-13
**Status**: ✅ Features 1-2 complete and deployed
