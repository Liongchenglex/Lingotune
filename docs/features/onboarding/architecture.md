# Onboarding Feature - Architecture & Data Design

## 1. Architecture Decision

### Chosen Approach

**Hybrid Client-Server Architecture with Serverless Backend**

- **Frontend**: React Native (Expo) handles UI, state management, and user interactions
- **Backend**: Firebase Functions (serverless) for AI profile generation
- **Database**: Firestore for user data, test results, and question bank
- **AI Services**: OpenAI GPT (primary) + Claude (fallback) via Firebase Functions
- **Storage**: AsyncStorage for local resume state, Firestore as source of truth

### Alternatives Considered

#### Alternative 1: Pure Client-Side AI Calls
- **Pros**: Simpler, no backend needed initially
- **Cons**:
  - Exposes API keys in client (security risk)
  - No rate limiting control
  - Cannot implement robust retry logic
  - Cannot audit AI costs
- **Rejected**: Security playbook violation (#8: secrets management)

#### Alternative 2: Full Custom Backend (Node.js/Express)
- **Pros**: Full control, easier debugging
- **Cons**:
  - Requires server management
  - Higher operational complexity
  - Slower to implement
  - More expensive at scale
- **Rejected**: Overengineering for MVP, Firebase Functions sufficient

#### Alternative 3: Question Generation On-Demand
- **Pros**: Dynamic difficulty adjustment, infinite questions
- **Cons**:
  - Requires AI for question generation (expensive)
  - Quality control challenges
  - Unpredictable test experience
- **Rejected**: Prefer curated question bank for consistency and cost control

### Rationale

**Why this approach:**
1. **Security**: API keys stay server-side (Firebase Functions)
2. **Scalability**: Firestore scales automatically, Functions handle load
3. **Simplicity**: Leverages existing Firebase infrastructure (auth, db already in use)
4. **Cost-Effective**: Pay-per-use, no idle server costs
5. **Maintainability**: Clear separation of concerns (client = UI, server = AI logic)
6. **Pattern Consistency**: Matches existing authentication architecture

---

## 2. System Boundaries & Responsibilities

### Client (React Native App)

**Owns:**
- Onboarding screen UI (Welcome, Language Selection, Test Confirmation, Test Screen, Profile Summary)
- Local validation (input format, non-empty checks)
- Test state management during active session (current question, timer, answers)
- Resume state persistence (AsyncStorage for temp data)
- Navigation between onboarding screens
- Dashboard access control (blocking overlay when onboarding incomplete)

**Does NOT Own:**
- Question bank content (read-only from Firestore)
- AI profile generation logic
- Test result storage (writes to Firestore, does not manage)
- Correct answer validation (trusts Firestore question data)
- Background retry logic for AI generation

### Firebase Functions (Backend)

**Owns:**
- AI profile generation logic (calling OpenAI/Claude APIs)
- API key management (environment variables)
- AI request/response transformation
- Fallback logic (GPT → Claude)
- Background retry queue for failed AI generations
- Rate limiting and abuse prevention (future)

**Does NOT Own:**
- User authentication (handled by Firebase Auth)
- Question bank authoring (separate admin process)
- Test UI or user interaction
- AsyncStorage resume data

### Firestore Database

**Owns:**
- User profile data (source of truth)
- Test results (permanent storage)
- Question bank (read-only for clients)
- Onboarding state (currentScreen, currentQuestionIndex, tempAnswers)
- AI-generated profiles and goals

**Does NOT Own:**
- Temporary in-progress test answers (AsyncStorage, synced on completion)
- Auth tokens (Firebase Auth)
- UI state (client-side only)

### AsyncStorage (Client-Side Persistence)

**Owns:**
- Temporary resume state (in-progress test answers)
- Current screen bookmark (if user quits mid-flow)
- Timer state (optional, can reset to 0 on resume)

**Does NOT Own:**
- Completed test results (Firestore)
- User profile (Firestore)
- Question bank (Firestore)

---

## 3. Data Modeling

### Entity: User (Extended)

**Collection**: `users/{userId}`

**Fields:**
```typescript
interface User {
  uid: string                     // Firebase Auth UID (existing)
  email: string                   // User email (existing)
  onboardingCompleted: boolean    // NEW: True after first language onboarding
  languages: UserLanguage[]       // NEW: Array of language entries
  createdAt: Timestamp            // Existing
  updatedAt: Timestamp            // Existing
}

interface UserLanguage {
  languageCode: 'ko' | 'zh' | 'ja' | 'es'  // Language identifier
  onboardingStatus: 'not_started' | 'in_progress' | 'completed'

  // Resume state (only if in_progress)
  currentScreen?: 'welcome' | 'language_selection' | 'test_confirmation' | 'test'
  currentQuestionIndex?: number   // 0-indexed, null if not on test screen
  tempAnswers?: TempAnswer[]      // Partial test answers

  // Proficiency data (after completion)
  proficiencyLevel?: string       // AI-derived, not hardcoded
  testHistory: string[]           // Array of testResult document IDs
  currentProfile?: string         // Latest AI diagnosis (markdown)
  goals?: string[]                // Extracted from AI profile
  lastUpdated: Timestamp
}

interface TempAnswer {
  questionId: string
  answer: string | string[]
  timeElapsed: number             // seconds
}
```

**Ownership**: User (read/write own document only)

**Lifecycle**:
- **Creation**: On signup (existing behavior)
- **Update**:
  - Add language entry when user selects language
  - Update onboarding state as user progresses
  - Set `onboardingCompleted: true` after first language completion
- **Deletion**: Not supported in MVP (future: account deletion feature)

**Migration Risk**:
- Existing users need `onboardingCompleted: false` and empty `languages: []` array
- Migration script required before release
- Low risk: Field addition (non-breaking), defaults can be applied in client code

---

### Entity: OnboardingTest

**Collection**: `onboardingTests/{testId}`

**Fields:**
```typescript
interface OnboardingTest {
  testId: string                  // Auto-generated document ID
  userId: string                  // Owner (indexed)
  language: 'ko' | 'zh' | 'ja' | 'es'
  testDate: Timestamp
  testType: 'onboarding'          // Future: 'placement', 'progress_check'

  // Test execution
  earlyTermination: boolean       // True if ended at Q3
  terminationReason?: 'foundation_failure' | 'completed'
  questions: TestQuestion[]       // Array of questions asked + answers

  // Metrics
  totalQuestions: number          // 15 or less if early termination
  completedQuestions: number      // Always <= totalQuestions
  correctAnswers: number          // Count of correct answers
  totalTimeElapsed: number        // Total seconds for all questions

  // AI Profile
  aiProfile?: string              // Essay-style diagnosis (markdown)
  profileStatus: 'completed' | 'pending' | 'failed'
  profileGeneratedBy?: 'gpt' | 'claude' | 'fallback_template'
  goals?: string[]                // Extracted from AI profile

  // Metadata
  createdAt: Timestamp
  updatedAt: Timestamp
}

interface TestQuestion {
  questionId: string              // Reference to question bank
  questionType: 'error_spotting' | 'fill_blank' | 'reading_comp' | 'picture_desc'
  questionText: string            // Snapshot (in case question bank changes)
  options?: string[]              // For MCQ
  correctAnswer: string | string[]
  userAnswer: string | string[]
  isCorrect: boolean              // Computed
  timeElapsed: number             // Seconds for this question
  timestamp: Timestamp            // When answered
}
```

**Ownership**: User (via userId field)

**Lifecycle**:
- **Creation**: When test completes (all 15 questions or early termination)
- **Update**:
  - `profileStatus` and `aiProfile` updated when AI generation completes
  - `updatedAt` timestamp on profile generation
- **Deletion**: Not deleted (permanent test history)

**Relationships**:
- **One-to-Many**: User → OnboardingTests (one user, many tests for different languages)
- **Many-to-Many**: OnboardingTests ↔ Questions (via questionId references)

**Indexes Required**:
- `userId` (for querying user's test history)
- `userId + language` (for querying specific language test history)
- `profileStatus` (for background retry job queries)

---

### Entity: Question

**Collection**: `questionBank/{questionId}`

**Fields:**
```typescript
interface Question {
  questionId: string              // Auto-generated or manual ID
  language: 'ko' | 'zh' | 'ja' | 'es'
  questionType: 'error_spotting' | 'fill_blank' | 'reading_comp' | 'picture_desc'

  // Classification
  difficulty: 'foundation' | 'beginner' | 'intermediate' | 'advanced'
  isFoundation: boolean           // True for Q1-3 pool
  category: string                // e.g., 'hangul', 'particles', 'verb_conjugation'
  isSpecial: boolean              // Future: special question logic (reserved)

  // Content
  questionText: string            // Main question text
  options?: string[]              // MCQ options (if applicable)
  correctAnswer: string | string[] // Correct answer(s)
  explanation?: string            // Why answer is correct (for future learning UI)

  // Media
  imageUrl?: string               // For picture-based questions
  audioUrl?: string               // Future: listening comprehension

  // Metadata
  createdAt: Timestamp
  updatedAt: Timestamp
  createdBy?: string              // Admin user ID (future)
  tags?: string[]                 // Future: additional classification
}
```

**Ownership**: Admin (read-only for clients)

**Lifecycle**:
- **Creation**: Via CSV/JSON import script or admin UI (future)
- **Update**: Manual edits by admin (version control via updatedAt)
- **Deletion**: Soft delete (set active: false) to preserve test history integrity

**Relationships**:
- **Referenced by**: OnboardingTests (via questionId in TestQuestion array)

**Indexes Required**:
- `language + isFoundation` (for foundation question queries)
- `language + difficulty` (for adaptive logic)
- `language + questionType` (for variety rotation)

**Data Validation**:
- `questionText` must not be empty
- `correctAnswer` must be non-null
- If `options` exists, `correctAnswer` must be one of the options
- `isFoundation: true` must have `difficulty: 'foundation'`

---

## 4. API Design & Contracts

### Client-Side (React Native)

No custom REST APIs. All interactions via Firebase SDKs.

**Firestore Queries:**
```typescript
// Load question bank for test
const foundationQuestions = await getDocs(
  query(
    collection(db, 'questionBank'),
    where('language', '==', 'ko'),
    where('isFoundation', '==', true),
    limit(5) // Get pool, select 3 randomly
  )
);

// Load random questions for Q4-15
const randomQuestions = await getDocs(
  query(
    collection(db, 'questionBank'),
    where('language', '==', 'ko'),
    where('isFoundation', '==', false'),
    limit(20) // Get pool, select 12 with variety logic
  )
);

// Save test result
await addDoc(collection(db, 'onboardingTests'), testData);

// Update user profile
await updateDoc(doc(db, 'users', userId), {
  'languages': updatedLanguagesArray,
  onboardingCompleted: true,
  updatedAt: serverTimestamp()
});
```

---

### Backend API (Firebase Functions)

#### Function: `generateOnboardingProfile`

**Trigger**: Firestore onCreate event (`onboardingTests/{testId}`)

**Purpose**: Generate AI profile when test is created with `profileStatus: 'pending'`

**Request (Automatic from Firestore trigger):**
```typescript
{
  testId: string
  userId: string
  language: string
  questions: TestQuestion[]
  earlyTermination: boolean
  // ... other test data
}
```

**Process:**
1. Read test document from Firestore
2. Check `profileStatus`:
   - If `completed`: Skip (already done)
   - If `pending`: Proceed
3. Build AI prompt with test data
4. Call OpenAI GPT API
5. If GPT fails: Call Claude API
6. If both fail: Queue retry job, return
7. Parse AI response
8. Extract goals from profile
9. Update test document with profile
10. Update user document with current profile + goals

**Response (Updates Firestore):**
```typescript
// onboardingTests/{testId}
{
  aiProfile: string           // Markdown essay
  goals: string[]             // Extracted bullet points
  profileStatus: 'completed'
  profileGeneratedBy: 'gpt' | 'claude'
  updatedAt: serverTimestamp()
}

// users/{userId}/languages[index]
{
  currentProfile: string      // Same as aiProfile
  goals: string[]             // Same as goals
  lastUpdated: serverTimestamp()
}
```

**Error Handling:**
- GPT rate limit (429): Fallback to Claude
- Claude rate limit (429): Queue retry
- Network timeout: Queue retry
- Invalid API response: Log error, use fallback template

**Auth Requirements**:
- Function runs with admin privileges
- Validates `userId` exists before writing
- Does NOT trust client data (re-validates from Firestore)

**Rate Limiting**:
- MVP: None (trust Firebase Functions automatic scaling)
- Future: Implement per-user rate limit (max 1 test per language per hour)

---

#### Function: `retryProfileGeneration` (Background Job)

**Trigger**: Pub/Sub scheduled task (runs every 5 minutes)

**Purpose**: Retry failed AI profile generations

**Process:**
1. Query `onboardingTests` where `profileStatus == 'pending'` and `updatedAt < 5 minutes ago`
2. For each pending test:
   - Check retry count (max 5 attempts)
   - Call `generateOnboardingProfile` logic
   - If successful: Update status to `completed`
   - If failed: Increment retry count
   - If max retries reached: Update status to `failed`, notify user

**Auth**: Admin privileges

**Monitoring**: Log all retry attempts to Cloud Logging

---

### AI API Contracts

#### OpenAI GPT API (External)

**Endpoint**: `POST https://api.openai.com/v1/chat/completions`

**Headers:**
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer ${OPENAI_API_KEY}"
}
```

**Request Payload:**
```json
{
  "model": "gpt-4o",
  "messages": [
    {
      "role": "system",
      "content": "You are a language learning diagnostic expert specializing in Korean proficiency assessment..."
    },
    {
      "role": "user",
      "content": "Analyze this Korean proficiency test and provide a diagnostic profile:\n\nTest Data:\n{...}\n\nProvide:\n1. Overall Assessment (2-3 sentences)\n2. Strengths (2-3 specific areas)\n3. Knowledge Gaps (3-4 specific areas)\n4. Recommended Focus Areas (prioritized list of 3-5 topics)\n5. Motivational Note (1-2 sentences)"
    }
  ],
  "temperature": 0.7,
  "max_tokens": 1000
}
```

**Success Response (200):**
```json
{
  "choices": [{
    "message": {
      "content": "## Overall Assessment\n..."
    }
  }]
}
```

**Error Responses:**
- 429: Rate limit → Fallback to Claude
- 500: Server error → Fallback to Claude
- 401: Invalid API key → Log critical error, use fallback template

---

#### Claude API (Fallback)

**Endpoint**: `POST https://api.anthropic.com/v1/messages`

**Headers:**
```json
{
  "Content-Type": "application/json",
  "x-api-key": "${ANTHROPIC_API_KEY}",
  "anthropic-version": "2023-06-01"
}
```

**Request Payload:**
```json
{
  "model": "claude-3-5-sonnet-20241022",
  "max_tokens": 1024,
  "messages": [{
    "role": "user",
    "content": "[Same prompt as GPT]"
  }]
}
```

**Success Response (200):**
```json
{
  "content": [{
    "text": "## Overall Assessment\n..."
  }]
}
```

---

## 5. Pattern Consistency & Reuse

### Existing Patterns to Reuse

#### 1. Firebase Initialization
**Pattern**: Single `firebase.ts` service file exports `auth`, `db`, `storage`

**Reuse in Onboarding**:
```typescript
import { db } from '../services/firebase';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
```

✅ **Consistent with**: Authentication feature, existing codebase pattern

---

#### 2. AuthContext Pattern
**Pattern**: React Context for global state, hooks for access

**Reuse in Onboarding**:
```typescript
// Create OnboardingContext.tsx
export const OnboardingProvider: React.FC<{children}> = ({children}) => {
  const [onboardingState, setOnboardingState] = useState<OnboardingState>({...});
  // ... context logic
  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
};

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (!context) throw new Error('useOnboarding must be used within OnboardingProvider');
  return context;
};
```

✅ **Consistent with**: `AuthContext.tsx` pattern

---

#### 3. Validation Pattern
**Pattern**: Validation functions return `{ isValid: boolean, error?: string }`

**Reuse in Onboarding**:
```typescript
// src/utils/onboardingValidation.ts
export const validateLanguageSelection = (language: string | null): ValidationResult => {
  if (!language) {
    return { isValid: false, error: 'Please select a language' };
  }
  return { isValid: true };
};

export const validateAnswer = (answer: string | string[]): ValidationResult => {
  if (!answer || (Array.isArray(answer) && answer.length === 0)) {
    return { isValid: false, error: 'Please select an answer' };
  }
  return { isValid: true };
};
```

✅ **Consistent with**: `src/utils/validation.ts` (email/password validation)

---

#### 4. Error Handling Pattern
**Pattern**: Firebase error codes mapped to user-friendly messages

**Reuse in Onboarding**:
```typescript
// src/utils/onboardingErrors.ts
export const mapFirestoreError = (error: any): string => {
  const code = error.code || '';
  switch (code) {
    case 'permission-denied':
      return 'Unable to access test data. Please try again.';
    case 'unavailable':
      return 'Connection lost. Your progress is saved.';
    default:
      return 'Something went wrong. Please try again.';
  }
};
```

✅ **Consistent with**: Authentication error mapping pattern

---

#### 5. Loading Screen Pattern
**Pattern**: Full-screen loading component with spinner

**Reuse in Onboarding**:
```typescript
import { LoadingScreen } from '../components/LoadingScreen';

// In AI Profile Generation screen
if (generatingProfile) {
  return <LoadingScreen message="Analyzing your responses..." />;
}
```

✅ **Consistent with**: Existing `LoadingScreen.tsx` usage in Auth flow

---

### New Patterns Introduced

#### 1. Test State Management
**Pattern**: Local state + AsyncStorage backup for resume

```typescript
// src/hooks/useTestState.ts
export const useTestState = () => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);

  // Auto-save to AsyncStorage on change
  useEffect(() => {
    AsyncStorage.setItem('onboarding_test_state', JSON.stringify({
      currentQuestionIndex,
      answers
    }));
  }, [currentQuestionIndex, answers]);

  // Load from AsyncStorage on mount
  useEffect(() => {
    const loadState = async () => {
      const saved = await AsyncStorage.getItem('onboarding_test_state');
      if (saved) {
        const state = JSON.parse(saved);
        setCurrentQuestionIndex(state.currentQuestionIndex);
        setAnswers(state.answers);
      }
    };
    loadState();
  }, []);

  return { currentQuestionIndex, answers, setCurrentQuestionIndex, setAnswers };
};
```

**Justification**:
- Existing patterns don't cover resume-on-quit behavior
- AsyncStorage is already used in AuthContext for session persistence
- Custom hook encapsulates complex state + persistence logic

**Apply consistently**: Use this pattern for any future features requiring resume capability

---

#### 2. Adaptive Question Selection
**Pattern**: Client-side question pool filtering + random selection

```typescript
// src/utils/questionSelection.ts
export const selectFoundationQuestions = (pool: Question[], count: number = 3): Question[] => {
  return shuffleArray(pool).slice(0, count);
};

export const selectVarietyQuestions = (pool: Question[], count: number = 12): Question[] => {
  const selected: Question[] = [];
  const typeCount: Record<string, number> = {};

  // Ensure variety: no more than 4 consecutive of same type
  const shuffled = shuffleArray(pool);
  for (const q of shuffled) {
    if (selected.length >= count) break;
    const lastFour = selected.slice(-4);
    const sameTypeCount = lastFour.filter(x => x.questionType === q.questionType).length;
    if (sameTypeCount < 4) {
      selected.push(q);
      typeCount[q.questionType] = (typeCount[q.questionType] || 0) + 1;
    }
  }
  return selected;
};
```

**Justification**:
- No existing pattern for question selection logic
- Client-side selection reduces backend complexity
- Utility function can be unit tested independently

**Apply consistently**: Use this pattern for future quiz/test features

---

## 6. Error Handling Strategy

### Error Categories

#### 1. Validation Errors (Client-Side)
**Strategy**: Prevent submission, show inline error messages

**Examples**:
- No language selected: `"Please select a language to continue"`
- Empty answer: `"Please select an answer before continuing"`

**Implementation**:
- Disable "Continue" / "Submit" button when invalid
- Show error text below input field (red, 12px font)
- Clear error on user correction

---

#### 2. Network Errors
**Strategy**: Save progress, allow retry, show user-friendly message

**Examples**:
- Offline during test: `"Connection lost. Your answers are saved locally."`
- Firestore read failure: `"Unable to load test. Please check your connection."`

**Implementation**:
- Catch Firestore errors: `code === 'unavailable'`
- Save answers to AsyncStorage
- Show retry button
- Auto-retry on network restore

---

#### 3. AI Generation Errors
**Strategy**: Non-blocking, queue retry, allow dashboard access

**Examples**:
- GPT rate limit: Fallback to Claude (user sees no error)
- Both APIs fail: `"We're still analyzing your results. Check back soon."`

**Implementation**:
- Try GPT → catch error → try Claude → catch error → queue retry
- Update `profileStatus: 'pending'` in Firestore
- Show temporary message, allow user to continue to dashboard
- Display profile when ready (next app open)

---

#### 4. Firebase Function Errors (Internal)
**Strategy**: Log to Cloud Logging, notify admin, use fallback template if max retries

**Examples**:
- Invalid API key: Log critical error, use fallback template
- Persistent failures: Send admin notification (email/Slack)

**Implementation**:
- `try/catch` around AI calls
- Log errors with context: `{ userId, testId, error, attemptNumber }`
- After 5 failed retries: Generate fallback template profile

---

### Error Shapes

**Client-Side Errors (Validation):**
```typescript
interface ValidationError {
  field: string
  message: string
}
```

**Firebase Errors (Firestore/Functions):**
```typescript
interface FirebaseError {
  code: string           // e.g., 'permission-denied', 'unavailable'
  message: string        // Technical message (not shown to user)
  details?: any
}
```

**AI API Errors:**
```typescript
interface AIError {
  provider: 'openai' | 'claude'
  code: number           // HTTP status code
  message: string
  retryable: boolean
}
```

**User-Facing Error Message:**
```typescript
interface UserError {
  title?: string         // Optional error title
  message: string        // User-friendly message
  action?: string        // "Retry", "Go Back", "Contact Support"
  actionCallback?: () => void
}
```

---

### Retry Behavior

| Error Type | Immediate Retry | Background Retry | Max Attempts |
|-----------|-----------------|------------------|--------------|
| Network (client) | ✅ Manual (user taps "Retry") | ❌ | Unlimited |
| Firestore read | ✅ Manual | ✅ Auto (10s interval) | 3 auto + manual |
| Firestore write | ✅ Manual | ❌ | Unlimited manual |
| OpenAI API failure | ✅ Automatic (fallback to Claude) | ❌ | 1 (then Claude) |
| Claude API failure | ❌ | ✅ Scheduled (5 min interval) | 5 |
| Both AI APIs fail | ❌ | ✅ Scheduled (5 min interval) | 5 |

---

### Silent Failures (NOT ALLOWED)

Per security-playbook.md, **no silent failures** are permitted:

❌ **Prohibited**:
```typescript
// BAD: Silent failure
try {
  await saveTestResult();
} catch (error) {
  // Do nothing
}
```

✅ **Required**:
```typescript
// GOOD: Explicit handling
try {
  await saveTestResult();
} catch (error) {
  console.error('Failed to save test result:', error);
  setError('Unable to save your results. Please try again.');
  // Log to error monitoring (Sentry/Firebase Crashlytics)
  logError('save_test_result_failed', { userId, testId, error });
}
```

---

## 7. State Management

### Source of Truth

| Data | Source of Truth | Sync Strategy | Failure Recovery |
|------|----------------|---------------|------------------|
| User profile | **Firestore** | Read on app load, update on onboarding complete | Retry read on network restore |
| Onboarding progress | **Firestore** | Write on screen change, read on resume | AsyncStorage fallback for in-progress test |
| In-progress test answers | **AsyncStorage** (temp) | Write on each answer, sync to Firestore on test complete | Discard if > 24 hours old |
| Completed test results | **Firestore** | Write once on test complete | Retry write until success |
| AI profile | **Firestore** | Write once when generated | Background retry if fails |
| Question bank | **Firestore** | Read once on test start, cache in memory | Re-fetch on error |

### State Duplication (Intentional)

**Test State During Active Session:**
- **AsyncStorage**: Temporary backup for resume
- **Firestore**: Partial state in `user.languages[].tempAnswers`
- **Memory**: Active test state in React component

**Justification**:
- AsyncStorage: Fast local access for resume
- Firestore: Backup if AsyncStorage cleared (app reinstall)
- Memory: Performance (no I/O on each answer)

**Conflict Resolution**:
- On resume: AsyncStorage takes precedence (most recent)
- If AsyncStorage empty: Read from Firestore
- If both empty: Start fresh from current screen

---

### State Lifecycle

#### 1. Onboarding Start
```
User taps "Get Started"
→ Write to Firestore: user.languages[index].onboardingStatus = 'in_progress'
→ Write to Firestore: user.languages[index].currentScreen = 'welcome'
→ Navigate to Welcome Screen
```

#### 2. During Test
```
User answers question
→ Write to AsyncStorage: { currentQuestionIndex, answers }
→ (No Firestore write yet - wait until test complete or user quits)
```

#### 3. User Quits Mid-Test
```
App backgrounded/closed
→ AsyncStorage persists automatically
→ On next app launch:
  → Read user.onboardingCompleted from Firestore
  → If false: Show dashboard blocking overlay
  → On "Continue Setup":
    → Read AsyncStorage for test state
    → If found: Resume from currentQuestionIndex
    → If not found: Read Firestore user.languages[index].currentScreen
```

#### 4. Test Complete
```
User answers last question
→ Write to Firestore: onboardingTests collection (new document)
→ Write to Firestore: user.onboardingCompleted = true
→ Write to Firestore: user.languages[index].onboardingStatus = 'completed'
→ Clear AsyncStorage: remove 'onboarding_test_state'
→ Navigate to AI Profile Generation screen
```

#### 5. AI Profile Generated
```
Firebase Function completes
→ Write to Firestore: onboardingTests/{testId}.aiProfile
→ Write to Firestore: user.languages[index].currentProfile
→ Client refetches user profile (via onSnapshot or manual query)
→ Display profile to user
```

---

### Sync Strategy

**Real-Time Listeners (onSnapshot):**
```typescript
// In OnboardingContext
useEffect(() => {
  if (!user) return;

  const unsubscribe = onSnapshot(
    doc(db, 'users', user.uid),
    (doc) => {
      if (doc.exists()) {
        setUserProfile(doc.data());
        checkOnboardingStatus(doc.data());
      }
    },
    (error) => {
      console.error('Profile listener error:', error);
      // Fallback to manual fetch
    }
  );

  return unsubscribe;
}, [user]);
```

**Manual Fetches:**
- Question bank: Fetch once on test start
- Test history: Fetch on profile view (not in MVP)

**Optimistic Updates:**
- NOT used in onboarding (data integrity > perceived speed)
- All writes confirmed before UI update

---

## 8. Performance & Scalability Considerations

### Expected Usage Patterns

**MVP Assumptions:**
- 1,000 users in first month
- Average 1 onboarding test per user
- 15 questions per test
- 1 AI profile generation per test

**Load:**
- ~1,000 AI API calls in first month
- ~1,000 Firestore writes (onboardingTests)
- ~15,000 Firestore reads (question bank)

---

### Potential Bottlenecks

#### 1. Question Bank Reads
**Issue**: Loading 20+ questions per test = 20 reads

**Mitigation**:
- Load once and cache in memory during test session
- Future: Pre-fetch question pool on app launch (background)
- Future: Firestore bundle for offline support

**Scale**: 15,000 reads/month = ~$0.18 (Firestore pricing)

---

#### 2. AI API Latency
**Issue**: 20-30 seconds for profile generation (blocking user)

**Mitigation**:
- Asynchronous generation (implemented)
- Background retry queue
- User can access dashboard before profile ready

**Scale**: OpenAI GPT-4o cost ~$0.10 per profile (1,000 tokens avg)
- 1,000 profiles/month = $100 AI cost

---

#### 3. Firebase Functions Cold Start
**Issue**: First invocation after idle period = 2-5 second delay

**Mitigation**:
- Use minimum instances (paid feature) if latency critical
- MVP: Accept cold start (happens once per ~15 minutes)

**Scale**: Cold starts decrease with usage (warmer functions as user base grows)

---

#### 4. Firestore Writes (Concurrent Users)
**Issue**: 100 concurrent users taking tests = 100 writes/sec

**Mitigation**:
- Firestore scales automatically (no action needed)
- Monitor Firestore dashboard for throttling (unlikely at MVP scale)

**Scale**: Firestore supports 10,000 writes/sec per database

---

### Identified N+1 or Hot Paths

✅ **No N+1 Queries Identified**

All queries are single-fetch or batch operations:
- Question bank: Single query with `where` + `limit`
- User profile: Single document read
- Test result: Single document write

❌ **NO patterns like:**
```typescript
// EXAMPLE OF N+1 (NOT IN OUR DESIGN)
for (const question of questions) {
  await getDoc(doc(db, 'questions', question.id)); // N+1!
}
```

✅ **Our approach:**
```typescript
// Single batch query
const questionsQuery = query(
  collection(db, 'questionBank'),
  where('language', '==', 'ko'),
  limit(20)
);
const snapshot = await getDocs(questionsQuery);
```

---

### Caching Strategy

**Client-Side:**
- Question bank: Cache in memory during test session (15-20 questions)
- User profile: Cache in OnboardingContext (refreshed via onSnapshot)
- No HTTP cache (Firestore SDK handles internally)

**Server-Side (Firebase Functions):**
- No caching needed for AI generation (each request unique)
- Question bank reads: Firestore caches automatically

---

## 9. Environment & Configuration

### Dev vs Prod Differences

| Aspect | Development | Production |
|--------|-------------|------------|
| Firebase Project | `lingoleap---staging` | `lingoleap-56ead` |
| API Keys | `.env.development` | `.env.production` |
| Question Bank | Small test set (5-10 questions) | Full bank (50+ questions) |
| AI Retry Interval | 1 minute (faster testing) | 5 minutes |
| Error Logging | Console only | Console + Sentry |
| Analytics | Disabled | Firebase Analytics enabled |

### Feature Flags

**MVP**: No feature flags

**Future Considerations**:
```typescript
// Example: Enable/disable adaptive testing
const ENABLE_ADAPTIVE_TESTING = process.env.EXPO_PUBLIC_FEATURE_ADAPTIVE_TEST === 'true';

// Example: AI provider selection
const AI_PROVIDER = process.env.EXPO_PUBLIC_AI_PROVIDER || 'openai'; // 'openai' | 'claude'
```

### Environment Variables Required

**Client (.env.development / .env.production):**
```bash
EXPO_PUBLIC_ENV=development
EXPO_PUBLIC_FIREBASE_API_KEY=...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...
EXPO_PUBLIC_FIREBASE_PROJECT_ID=...
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=...
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
EXPO_PUBLIC_FIREBASE_APP_ID=...
```

**Backend (Firebase Functions environment):**
```bash
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
```

**Set via:**
```bash
firebase functions:config:set openai.key="sk-..." --project staging
firebase functions:config:set anthropic.key="sk-ant-..." --project staging
```

---

## 10. Documentation Requirements

### Code Comments Required

**When to Comment:**
1. **Non-Obvious Algorithms** (e.g., adaptive question selection logic)
2. **Security Decisions** (e.g., why API keys are server-side only)
3. **Workarounds** (e.g., AsyncStorage + Firestore dual state)
4. **Performance Optimizations** (e.g., question bank caching)

**Example (Adaptive Question Selection):**
```typescript
/**
 * Selects questions for Q4-15 with variety constraint
 *
 * Algorithm:
 * 1. Shuffle question pool randomly
 * 2. Iterate through shuffled pool
 * 3. For each question, check if last 4 questions have same type
 * 4. If < 4 of same type, add to selection
 * 5. Continue until 12 questions selected
 *
 * Rationale: Prevents user fatigue from consecutive questions of same type
 * Ensures test variety without complex difficulty tracking
 *
 * @param pool - Filtered question bank (non-foundation, correct language)
 * @param count - Number of questions to select (default 12)
 * @returns Array of selected questions with variety constraint applied
 */
export const selectVarietyQuestions = (pool: Question[], count: number = 12): Question[] => {
  // ... implementation
};
```

---

### Architecture Decision Records (ADRs)

**Documented in this file:**
- ✅ Why serverless (Firebase Functions) over custom backend
- ✅ Why client-side question selection over server-side
- ✅ Why AsyncStorage + Firestore dual state for resume
- ✅ Why asynchronous AI generation over synchronous

**Future ADRs** (when decisions made):
- Choice of question authoring tool (CSV vs Admin UI)
- Localization strategy (when implemented)
- Analytics provider selection

---

## 11. Technical Readiness Gate

### Checklist

- [x] **Architecture decisions documented** (Section 1: Hybrid client-server architecture)
- [x] **Data model defined** (Section 3: User, OnboardingTest, Question entities)
- [x] **APIs specified** (Section 4: Firebase Functions, OpenAI, Claude contracts)
- [x] **Patterns identified or reused** (Section 5: AuthContext, validation, error handling patterns)
- [x] **Error strategy defined** (Section 6: Error categories, retry behavior, no silent failures)
- [x] **State management defined** (Section 7: Source of truth, sync strategy, lifecycle)
- [x] **System boundaries clear** (Section 2: Client, Functions, Firestore, AsyncStorage responsibilities)
- [x] **Performance considerations stated** (Section 8: Bottlenecks, caching, N+1 prevention)
- [x] **Environment configuration defined** (Section 9: Dev vs prod, env variables)
- [x] **Security requirements addressed** (Awaiting security review document)

**Status**: ✅ **ARCHITECTURE APPROVED - READY FOR SECURITY REVIEW**

---

## 12. Known Tradeoffs & Technical Debt

### Tradeoff 1: Client-Side Question Selection

**Decision**: Select questions randomly on client from Firestore query result

**Pros**:
- Simpler architecture (no backend endpoint needed)
- Faster for MVP (less code to write)
- Leverages Firestore query capabilities

**Cons**:
- Cannot guarantee exact distribution (e.g., "exactly 3 hangul questions")
- Harder to implement complex adaptive logic later
- Client could theoretically inspect questions before answering (low risk in mobile app)

**Technical Debt**:
- If adaptive logic becomes complex (e.g., ML-based difficulty adjustment), will need server-side selection
- Acceptable for MVP (manual question pool curation sufficient)

---

### Tradeoff 2: AsyncStorage + Firestore Dual State

**Decision**: Store in-progress test state in both AsyncStorage (fast) and Firestore (backup)

**Pros**:
- Fast resume (no network fetch)
- Survives app reinstall (Firestore backup)

**Cons**:
- Potential sync conflicts (AsyncStorage vs Firestore out of sync)
- Extra complexity (two state storage mechanisms)
- Firestore writes on every screen change (cost)

**Technical Debt**:
- Conflict resolution logic is "AsyncStorage wins" (assumes most recent)
- Edge case: If user resumes on different device, Firestore state might be stale
- Future: Consider Cloud Firestore offline persistence instead

**Mitigation**: AsyncStorage state expires after 24 hours (assume user abandoned test)

---

### Tradeoff 3: Synchronous Loading Screen for AI Generation

**Decision**: Block user with loading screen for 20-30 seconds during AI generation

**Pros**:
- Simple UX (user knows to wait)
- No partial profile display issues
- Natural transition to profile screen

**Cons**:
- Long perceived wait time
- User might close app (we handle this with background retry)
- Feels slow compared to instant feedback

**Technical Debt**:
- If AI latency increases, user experience degrades
- Future: Consider showing progress indicator or interim content
- Acceptable for MVP (requirements specify blocking operation)

---

### Tradeoff 4: No Question Versioning

**Decision**: No version tracking for questions (questions can be updated/deleted)

**Pros**:
- Simpler data model
- Easier question bank management

**Cons**:
- Test history integrity risk (if question is edited, past test results reference old version)
- Cannot track "which version of question did user see"

**Technical Debt**:
- If question bank changes frequently, test results become unreliable
- Future: Add `questionVersion` field or snapshot question content in test results
- Acceptable for MVP (question bank curated and stable)

**Mitigation**: Snapshot `questionText` in test results (implemented in data model)

---

### Tradeoff 5: Binary Answer Validation (No Partial Credit)

**Decision**: Answers are either correct or wrong (no "partially correct")

**Pros**:
- Simple validation logic
- Clear metrics for AI analysis

**Cons**:
- Misses nuance (e.g., typo in fill-in-blank counts as fully wrong)
- AI profile less accurate for text-based questions

**Technical Debt**:
- Future: Implement fuzzy matching for text inputs (Levenshtein distance)
- Future: AI-evaluated partial credit (expensive, requires separate AI call per question)
- Acceptable for MVP (most questions are multiple choice)

---

## 13. Next Steps

1. ✅ Architecture approved (this document)
2. ⏳ **Security Review** (next gate) - Create `security-review.md` following `security-playbook.md`
3. ⏳ Implementation - Code screens, contexts, and Firebase Functions
4. ⏳ Testing - Manual testing following acceptance criteria
5. ⏳ Deployment - Deploy Firebase Functions, update Firestore security rules

---

## Appendix: File Structure

```
src/
├── screens/
│   └── onboarding/
│       ├── WelcomeScreen.tsx
│       ├── LanguageSelectionScreen.tsx
│       ├── TestConfirmationScreen.tsx
│       ├── TestScreen.tsx
│       ├── ProfileGenerationScreen.tsx
│       └── ProfileSummaryScreen.tsx
├── contexts/
│   └── OnboardingContext.tsx
├── hooks/
│   └── useTestState.ts
├── utils/
│   ├── onboardingValidation.ts
│   ├── onboardingErrors.ts
│   └── questionSelection.ts
├── services/
│   └── firebase.ts (existing, no changes)
└── types/
    └── onboarding.ts

functions/
├── src/
│   ├── generateOnboardingProfile.ts
│   └── retryProfileGeneration.ts
├── package.json
└── tsconfig.json

docs/features/onboarding/
├── requirements.md (existing)
├── architecture.md (this file)
└── security-review.md (next)
```
