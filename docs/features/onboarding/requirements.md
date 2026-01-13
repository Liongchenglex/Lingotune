# Onboarding Feature - Requirements

## 1. Context & Intent

### Who is this for?
- **Primary Users**: New users who have just created an account and want to start learning a language
- **Secondary Users**: Existing users adding a new language to their learning profile
- **System Actors**:
  - Firebase Authentication (user identity)
  - Firestore Database (user profile, test results, question bank)
  - OpenAI GPT API (primary AI profiling)
  - Anthropic Claude API (fallback AI profiling)
  - AsyncStorage (local state persistence for resume)

### Problem Being Solved
Users need:
- **Accurate proficiency assessment** without manual self-evaluation bias
- **Personalized learning path** based on actual demonstrated knowledge, not generic levels
- **Adaptive testing** that doesn't waste time on material too easy or too hard
- **AI-powered diagnosis** that identifies specific knowledge gaps and strengths
- **Motivation and clarity** on what to focus on next

This replaces:
- Generic "beginner/intermediate/advanced" self-selection
- One-size-fits-all learning paths
- Guesswork about where to start

### Non-Goals (Out of Scope)
- **Multi-language onboarding in single session** - Users onboard one language at a time
- **Re-taking proficiency test** - Future iteration (users can add new language tests)
- **Manual proficiency editing** - Users cannot override AI diagnosis
- **Offline test taking** - Requires internet for AI profiling
- **Test history viewing** - Future iteration (data collected but not displayed in v1)
- **Question authoring UI** - Questions loaded via backend/admin tool (separate feature)
- **Detailed score breakdown** - No numerical score, only AI essay-style diagnosis
- **Social features** - No sharing or comparing profiles
- **Email verification requirement** - Users can onboard without verified email

---

## 2. Feature Breakdown

This feature covers **6 primary flows**:

### 2.1 First-Time Onboarding (Complete Flow)
User completes onboarding for their first language and gains dashboard access.

### 2.2 Additional Language Onboarding
User adds a new language and completes onboarding for that language.

### 2.3 Adaptive Testing Logic
System adapts question difficulty based on foundation question performance.

### 2.4 Resume Incomplete Onboarding
~~User quits mid-onboarding and resumes from last screen.~~ **DEPRECATED** (2026-01-12)

**Updated Behavior**: User quits mid-onboarding → **restarts test from Question 1** on next open.

### 2.5 AI Profile Generation
System sends test data to AI and generates personalized diagnosis via callable Firebase Function.

### 2.6 Dashboard Access Control
System shows dashboard with features disabled until onboarding completion (non-blocking banner approach).

**Note**: Full dashboard requirements and implementation details are now documented in `/docs/features/dashboard/requirements.md` (Features 1-2).

### 2.7 Profile Regeneration (NEW - 2026-01-12)
User can manually retry profile generation from dashboard if initial generation fails or takes too long.

**Note**: This feature has been moved to dashboard documentation. See `/docs/features/dashboard/requirements.md` (Feature 2: AI Profile Viewing & Regeneration) for complete requirements.

---

# FLOW 1: First-Time Onboarding (Complete Flow)

## 3. Actual Flow (End-to-End)

1. User successfully creates account (via Sign Up flow)
2. System checks user's `onboardingCompleted` flag (false for new users)
3. App navigates to Welcome Screen
4. User taps "Get Started" or "Begin Assessment"
5. App navigates to Language Selection Screen
6. User selects one language (e.g., Korean)
7. User taps "Continue"
8. App navigates to Test Confirmation Screen
9. User reads diagnostic test explanation ("This helps us understand your level. It's okay to get answers wrong!")
10. User taps "Start Test"
11. App navigates to Test Screen
12. System loads adaptive question algorithm:
    - Questions 1-3: Foundation questions (Hangul decoding, basic syntax)
    - If user gets 3 foundation questions wrong → End test early
    - If user gets 1+ foundation question right → Continue with progressive difficulty
    - Questions 4-15: Randomized variety across question types
13. For each question:
    - Display question with timer starting at 0
    - User submits answer
    - System records: `questionId`, `userAnswer`, `timeElapsed`
    - Load next question
14. Test ends when:
    - User completes all 15 questions, OR
    - User fails 3 foundation questions (early termination)
15. App navigates to AI Profile Generation Loading Screen
16. **System immediately calls `generateProfile` Firebase Function** with testId:
    - Function fetches test data from Firestore
    - Function sends data to OpenAI GPT API
    - All questions asked (text, type, correct answer)
    - User's answers
    - Time taken per question
    - Early termination flag (if applicable)
17. OpenAI GPT generates essay-style diagnosis (500-800 words)
18. If GPT fails, function retries with Claude API
19. If both fail, function returns error → user sees option to retry from dashboard
20. **After 20 seconds, "Go to Dashboard" button appears** (allows user to skip waiting)
21. App displays AI Profile Summary Screen
21. User reads profile and goals
22. User taps "Start Learning"
23. System updates user profile:
    - Set `onboardingCompleted: true`
    - Set language `onboardingStatus: 'completed'`
    - Save test results, profile, and goals
24. App navigates to Dashboard (now fully unlocked)

---

## 4. Step-by-Step Behaviour

### Welcome Screen
- Display app branding and welcome message
- Show "Get Started" button
- No validation required
- On tap → Navigate to Language Selection

### Language Selection Screen
- Display list of available languages (v1: Korean only)
- Single selection (radio button or card selection)
- "Continue" button disabled until language selected
- On selection → Enable "Continue" button
- On "Continue" tap → Navigate to Test Confirmation

### Test Confirmation Screen
- Display motivational copy:
  - "This diagnostic test helps us create your personalized learning path"
  - "Don't worry if you don't know some answers"
  - "The test adapts to your level"
  - "Takes about 10-15 minutes"
- Show "Start Test" button
- No "Skip for now" option (test is mandatory for dashboard access)
- On "Start Test" → Navigate to Test Screen

### Test Screen - Adaptive Logic

**Foundation Phase (Questions 1-3):**
- Questions test absolute basics (Hangul recognition, basic word order)
- Track wrong answers consecutively
- If 3 foundation questions answered incorrectly in sequence:
  - End test immediately
  - Skip to AI Profile Generation with early termination flag
  - AI receives: "User failed foundation assessment"

**Progressive Phase (Questions 4-15, if foundation passed):**
- Select questions randomly from question bank
- Ensure variety: rotate through question types
  - Error spotting
  - Fill-in-the-blank
  - Reading comprehension
  - Picture-based description
- No strict distribution required, but avoid 5+ questions of same type in a row

**Question Display:**
- Show question number (e.g., "Question 3 of 15")
- Display question content based on type:
  - **Error Spotting**: Sentence with error + "Find the mistake"
  - **Fill-in-the-blank**: Sentence with blank + multiple choice options
  - **Reading Comprehension**: Passage + comprehension question
  - **Picture Description**: Image + question about image or prompt to describe
- Timer displays elapsed time (starts at 00:00, counts up)
- "Submit Answer" button (disabled until answer selected/entered)
- No "Skip Question" button (all questions must be answered)

**On Answer Submit:**
- Record answer in local state:
  ```javascript
  {
    questionId: string,
    questionType: string,
    userAnswer: string | string[], // depends on question type
    correctAnswer: string | string[],
    timeElapsed: number, // seconds
    timestamp: ISO string
  }
  ```
- Clear UI
- Load next question
- If last question → Navigate to Profile Generation

### AI Profile Generation Screen

**Updated**: 2026-01-12

**Loading State:**
- Show animated loading indicator
- Display message: "Analyzing your responses..."
- Display sub-message: "This may take 20-30 seconds"
- **"Go to Dashboard" button appears after 20 seconds** (allows skip)
- **User can skip waiting and retry from dashboard later**

**AI Request Payload:**
```javascript
{
  userId: string,
  language: string,
  testType: 'onboarding',
  earlyTermination: boolean,
  questions: [
    {
      questionId: string,
      questionText: string,
      questionType: string,
      correctAnswer: string,
      userAnswer: string,
      isCorrect: boolean,
      timeElapsed: number
    }
  ],
  totalQuestions: number,
  completedQuestions: number
}
```

**AI Prompt Structure (to OpenAI GPT):**
```
You are a language learning diagnostic expert. Analyze this student's Korean proficiency test results and provide:

1. **Overall Assessment** (2-3 sentences on current level)
2. **Strengths** (2-3 specific areas they demonstrated competence)
3. **Knowledge Gaps** (3-4 specific areas needing improvement)
4. **Recommended Focus Areas** (prioritized list of 3-5 topics to study next)
5. **Motivational Note** (1-2 sentences of encouragement)

Test Data:
[JSON payload]

Write in an encouraging, specific, and actionable tone. Avoid generic statements. Focus on observable patterns in their responses.
```

**AI Response Handling** (Updated 2026-01-12):
- **Success (GPT)**: Parse response, save to Firestore, display to user
- **Failure (GPT)**: Retry once with Claude API
- **Success (Claude)**: Parse response, save to Firestore, display to user
- **Failure (Both)**:
  - Function returns error with `profileStatus: 'failed'`
  - ~~Queue background retry job~~ **REMOVED**
  - Show user: "Having trouble generating your profile. You can skip to dashboard and retry later."
  - **"Go to Dashboard" button allows user to skip**
  - **User can retry from dashboard using "Regenerate Profile" button**

**Profile Display:**
- Show AI-generated essay in readable format
- Highlight "Recommended Focus Areas" as actionable list
- Show "Start Learning" button
- Optional: "View Full Report" expandable section

### Dashboard Access Control

**⚠️ IMPLEMENTATION NOTE: This section was revised during implementation. See below for actual implementation.**

**~~Original Design (Not Implemented)~~:**
- ~~User attempts to access dashboard~~
- ~~System checks `onboardingCompleted` flag (false)~~
- ~~App shows modal overlay on dashboard:~~
  - ~~Darken/blur dashboard content~~
  - ~~Show message: "Complete your diagnostic test to unlock your learning dashboard"~~
  - ~~Show "Continue Setup" button~~
  - ~~No close/dismiss option (blocking)~~
- ~~On "Continue Setup" tap → Navigate to resume onboarding flow~~

**Actual Implementation (Dashboard-First Approach):**

**Before First Language Onboarding:**
- User is authenticated → Dashboard is shown immediately (not blocking overlay)
- Dashboard displays prominent orange banner at top:
  - Icon: ⏸️
  - Title: "Complete Your Onboarding"
  - Description: "Resume where you left off and unlock all features"
  - Arrow indicator: →
- Dashboard content is fully visible (not blurred/darkened)
- All learning features are disabled:
  - "Start Learning" buttons show "Complete Onboarding First"
  - Buttons are grayed out and non-tappable
- On banner tap → Navigate to resume onboarding flow from saved screen
- Banner disappears after onboarding completion

**After First Language Onboarding:**
- Dashboard fully accessible
- No banner shown
- "Start Learning" buttons enabled
- User can view all features
- If user adds new language:
  - That language's features locked until onboarding completed
  - Other languages remain accessible

**Rationale for Change:**
- **Better UX**: Users see dashboard value proposition before committing to full onboarding
- **Reduced Friction**: Non-blocking banner feels less restrictive than modal overlay
- **Progressive Disclosure**: Users can explore UI while features remain gated
- **Same Enforcement**: Users still must complete onboarding to use features
- **Modern Pattern**: Follows contemporary app onboarding patterns (e.g., Duolingo, Notion)

---

## 5. Sequence Diagram

```
[First-Time User - Complete Flow]

User → App Launch: Open app after signup
App → Firestore: Read user.onboardingCompleted
Firestore → App: false
App → WelcomeScreen: Navigate

User → WelcomeScreen: Tap "Get Started"
WelcomeScreen → LanguageSelectionScreen: Navigate

User → LanguageSelectionScreen: Select Korean
User → LanguageSelectionScreen: Tap "Continue"
LanguageSelectionScreen → TestConfirmationScreen: Navigate

User → TestConfirmationScreen: Tap "Start Test"
TestConfirmationScreen → TestScreen: Navigate
TestScreen → Firestore: Load question bank
Firestore → TestScreen: Return questions

[Adaptive Testing Loop - Foundation Phase]
TestScreen → User: Display Question 1 (foundation)
TestScreen → Timer: Start counting
User → TestScreen: Submit answer
TestScreen → LocalState: Save {questionId, answer, time}
TestScreen → TestLogic: Check foundation failure count
TestLogic → TestScreen: Continue (< 3 failures)

[Repeat for Questions 2-3]

TestLogic → TestScreen: Foundation passed, load random questions

[Progressive Phase]
TestScreen → QuestionBank: Get random question (ensure variety)
QuestionBank → TestScreen: Return question
TestScreen → User: Display question
User → TestScreen: Submit answer
TestScreen → LocalState: Save answer

[Repeat until 15 questions or early termination]

TestScreen → ProfileGenerationScreen: Navigate with test data

[AI Profile Generation]
ProfileGenerationScreen → OpenAI API: POST /chat/completions (test data + prompt)
OpenAI API → ProfileGenerationScreen: Return AI diagnosis (success)

[Fallback if GPT fails]
OpenAI API → ProfileGenerationScreen: Error (failure)
ProfileGenerationScreen → Claude API: POST /messages (same payload)
Claude API → ProfileGenerationScreen: Return AI diagnosis

[Both fail - background queue]
Claude API → ProfileGenerationScreen: Error
ProfileGenerationScreen → Firestore: Save test data with profileStatus='pending'
ProfileGenerationScreen → BackgroundQueue: Queue retry job
ProfileGenerationScreen → User: Show "Profile pending" message

[Success Path]
ProfileGenerationScreen → Firestore: Save profile, goals, test results
ProfileGenerationScreen → ProfileSummaryScreen: Navigate with profile data

User → ProfileSummaryScreen: Read AI diagnosis
User → ProfileSummaryScreen: Tap "Start Learning"
ProfileSummaryScreen → Firestore: Update user.onboardingCompleted = true
ProfileSummaryScreen → Firestore: Update language.onboardingStatus = 'completed'
Firestore → ProfileSummaryScreen: Success
ProfileSummaryScreen → Dashboard: Navigate
Dashboard → User: Show unlocked dashboard
```

---

# FLOW 2: Profile Regeneration (NEW - 2026-01-12)

**⚠️ NOTE: This section has been moved to `/docs/features/dashboard/requirements.md` (Feature 2: AI Profile Viewing & Regeneration).**

**For historical reference and context, the original requirements are preserved below. For the current canonical requirements, please refer to the dashboard documentation.**

---

## Step-by-Step Behaviour

### Dashboard with Failed/Pending Profile

**Scenario**: User completed test, but AI profile generation failed or took too long.

**Visual Indicators:**
1. Language card shows status badge:
   - **"⏳ Profile Pending"** (orange) if `profileStatus === 'pending'`
   - **"❌ Generation Failed"** (red) if `profileStatus === 'failed'`
2. **"🔄 Regenerate Profile" button** appears below language card
3. Dashboard content is visible but learning features are enabled (profile is optional)

**User Actions:**
1. User taps "🔄 Regenerate Profile" button
2. Alert modal shows: "Generating Profile - Please wait while we generate your profile..."
3. System calls `generateProfile` Firebase Function with testId
4. Function attempts OpenAI → Claude fallback chain
5. **Success**: Alert shows "Success! Your profile has been generated successfully."
   - Status badge disappears
   - Profile text appears on language card
   - Goals are displayed
6. **Failure**: Alert shows "Error - Failed to generate profile. Please try again later."
   - Status badge remains (shows "Generation Failed")
   - User can retry again

**Technical Implementation:**
```typescript
const handleRegenerateProfile = async (languageCode: string, testId: string) => {
  try {
    Alert.alert('Generating Profile', 'Please wait...');
    const result = await generateProfileForTest(testId);

    if (result.success && result.profile) {
      Alert.alert('Success!', 'Your profile has been generated successfully.');
      // Update local state to remove badge
      setProfileStatuses({ ...profileStatuses, [languageCode]: 'completed' });
    }
  } catch (error) {
    Alert.alert('Error', 'Failed to generate profile. Please try again later.');
  }
};
```

**Edge Cases:**
- **Multiple rapid taps**: Alert modal blocks UI, prevents duplicate calls
- **Profile already exists**: Function returns immediately (idempotent)
- **Network failure**: Error shown, user can retry when online
- **Both AI services fail again**: Status remains 'failed', user can retry unlimited times

**Benefits Over Previous Approach:**
- **User control**: Manual retry instead of waiting for background job
- **Immediate feedback**: User sees success/failure immediately (not 5-minute intervals)
- **Simpler architecture**: No scheduled function, no retry count tracking
- **Better UX**: Clear status indicators and actionable button

---

## 6. Visual Flow

```
[Signup Success]
        ↓
[Welcome Screen]
  - Welcome message
  - "Get Started" button
        ↓
[Language Selection Screen]
  - Language cards (Korean, etc.)
  - "Continue" button
  - Back button (conditional - only for existing users, see Dashboard Feature 5)
        ↓
[Test Confirmation Screen]
  - Diagnostic test explanation
  - "Start Test" button
        ↓
[Test Screen - Question 1]
  - Question content
  - Answer options/input
  - Timer
  - "Submit Answer" button
        ↓
[Test Screen - Question 2]
  ... (repeat)
        ↓
[Test Screen - Question 15]
        ↓
[AI Profile Generation Loading]
  - Loading spinner
  - "Analyzing your responses..."
        ↓
[Profile Summary Screen]
  - AI-generated diagnosis
  - Strengths, gaps, goals
  - "Start Learning" button
        ↓
[Dashboard - Unlocked]
```

**Early Termination Path:**
```
[Test Screen - Question 3]
  (3rd consecutive foundation failure)
        ↓
[AI Profile Generation Loading]
  (with early termination flag)
        ↓
[Profile Summary Screen]
  (beginner-focused diagnosis)
```

**Resume Path** (Updated 2026-01-12):
```
[User quits at Question 5]
        ↓
[App Closed]
        ↓
[App Reopened]
        ↓
[Dashboard with Resume Banner]
  - Orange banner: "⏸️ Complete Your Onboarding"
  - Dashboard content visible but features disabled
  - Banner tappable to resume
        ↓
[User taps banner]
        ↓
[Test Screen - Question 1] ← CHANGED: Restarts from Q1 (not Q5)
  (timer reset, previous answers NOT saved)
```

**Profile Regeneration Path** (NEW - 2026-01-12):
```
[Profile Generation Failed]
        ↓
[User clicks "Go to Dashboard"]
        ↓
[Dashboard]
  - Language card shows "❌ Generation Failed" badge
  - "🔄 Regenerate Profile" button visible
        ↓
[User taps "Regenerate Profile"]
        ↓
[Alert: "Generating Profile..."]
        ↓
[Function called with testId]
        ↓
[Success]
  - Badge disappears
  - Profile displayed
  - Alert: "Success!"
        ↓
[Or Failure]
  - Badge remains "Generation Failed"
  - Alert: "Error - Failed to generate profile"
  - User can retry again
```

---

## 7. Inputs & Outputs

### Inputs

#### Language Selection Screen
- **Input**: Selected language (string: 'ko', 'zh', 'ja', 'es', etc.)
- **Validation**: Must select one language before continuing
- **Navigation Context** (2026-01-13):
  - Shared component used in both onboarding and dashboard flows
  - Back button shown conditionally based on context (see `/docs/features/dashboard/requirements.md` Feature 5)
  - New users (no existing languages): No back button
  - Existing users adding language from dashboard: Back button returns to dashboard

#### Test Screen (Per Question)
- **Input**: User answer (type depends on question type)
  - Multiple choice: single string (option ID)
  - Fill-in-blank: string (text input)
  - Reading comprehension: single string (option ID)
  - Picture description: string (text input)
- **Validation**:
  - Answer must not be empty
  - For multiple choice, must be valid option ID

### Outputs

#### Test Data Structure (Saved to Firestore)
```typescript
interface OnboardingTestResult {
  userId: string
  language: 'ko' | 'zh' | 'ja' | 'es' // etc
  testDate: Timestamp
  testType: 'onboarding'
  earlyTermination: boolean
  terminationReason?: 'foundation_failure' | 'completed'
  questions: Array<{
    questionId: string
    questionType: 'error_spotting' | 'fill_blank' | 'reading_comp' | 'picture_desc'
    questionText: string
    correctAnswer: string | string[]
    userAnswer: string | string[]
    isCorrect: boolean
    timeElapsed: number // seconds
    timestamp: Timestamp
  }>
  totalQuestions: number // 15 or less if early termination
  completedQuestions: number
  correctAnswers: number
  totalTimeElapsed: number // seconds
  aiProfile?: string // essay-style diagnosis
  profileStatus: 'completed' | 'pending' | 'failed'
  profileGeneratedBy?: 'gpt' | 'claude'
  goals?: string[] // extracted from AI profile
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

#### User Profile Update
```typescript
interface UserLanguage {
  languageCode: 'ko' | 'zh' | 'ja' | 'es'
  onboardingStatus: 'not_started' | 'in_progress' | 'completed'
  currentScreen?: 'welcome' | 'language_selection' | 'test_confirmation' | 'test'
  currentQuestionIndex?: number // 0-indexed
  tempAnswers?: Array<{questionId: string, answer: string, timeElapsed: number}>
  proficiencyLevel?: string // derived from AI, not hardcoded levels
  testHistory: string[] // array of testResult document IDs
  currentProfile?: string // latest AI diagnosis
  goals?: string[]
  lastUpdated: Timestamp
}

interface User {
  uid: string
  email: string
  onboardingCompleted: boolean // true after first language completed
  languages: UserLanguage[]
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

#### AI Profile Output (Example)
```markdown
## Overall Assessment
You demonstrate foundational understanding of Hangul and basic Korean sentence structure. You're at an early intermediate level, with strong recognition skills but some gaps in particle usage and verb conjugation.

## Strengths
- Solid Hangul decoding ability (읽기)
- Good intuition for Subject-Object-Verb word order
- Recognizes basic particles (이/가, 을/를)

## Knowledge Gaps
- Inconsistent usage of topic particles (은/는 vs 이/가)
- Limited understanding of verb conjugation patterns (especially past tense)
- Difficulty with honorific speech levels (해요체 vs 합니다체)
- Struggles with clause linking (-(으)면, -아서/어서)

## Recommended Focus Areas
1. **Master topic vs subject particles** - This is blocking comprehension of natural speech
2. **Practice verb conjugation patterns** - Focus on -아요/어요 endings first
3. **Study basic sentence connectors** - Start with -고 (and) and -지만 (but)
4. **Build vocabulary for common verbs** - Prioritize action verbs used in daily conversation
5. **Listen to slow-paced Korean content** - To internalize natural particle usage

## Motivational Note
You've built a strong foundation in Hangul and basic grammar—most learners struggle far more at this stage. Your next leap forward will come from consistent practice with particles and verb endings. You're ready to start engaging with simple real-world content!
```

---

## 8. API Contracts & Payloads

### OpenAI GPT API (Primary)

**Endpoint**: `https://api.openai.com/v1/chat/completions`

**Request Headers:**
```javascript
{
  'Content-Type': 'application/json',
  'Authorization': 'Bearer ${OPENAI_API_KEY}'
}
```

**Request Payload:**
```javascript
{
  model: 'gpt-4o', // or latest model
  messages: [
    {
      role: 'system',
      content: 'You are a language learning diagnostic expert specializing in Korean proficiency assessment. Provide detailed, specific, and actionable feedback based on test performance.'
    },
    {
      role: 'user',
      content: `Analyze this Korean proficiency test and provide a diagnostic profile:

Test Data:
${JSON.stringify(testData, null, 2)}

Provide:
1. Overall Assessment (2-3 sentences)
2. Strengths (2-3 specific areas)
3. Knowledge Gaps (3-4 specific areas)
4. Recommended Focus Areas (prioritized list of 3-5 topics)
5. Motivational Note (1-2 sentences)

Format as markdown. Be specific and reference actual test performance.`
    }
  ],
  temperature: 0.7,
  max_tokens: 1000
}
```

**Success Response (200):**
```javascript
{
  id: 'chatcmpl-xxx',
  object: 'chat.completion',
  created: 1234567890,
  model: 'gpt-4o',
  choices: [
    {
      index: 0,
      message: {
        role: 'assistant',
        content: '## Overall Assessment\n...' // markdown formatted diagnosis
      },
      finish_reason: 'stop'
    }
  ],
  usage: {
    prompt_tokens: 500,
    completion_tokens: 800,
    total_tokens: 1300
  }
}
```

**Error Response:**
```javascript
{
  error: {
    message: 'Rate limit exceeded',
    type: 'tokens',
    code: 'rate_limit_exceeded'
  }
}
```

### Claude API (Fallback)

**Endpoint**: `https://api.anthropic.com/v1/messages`

**Request Headers:**
```javascript
{
  'Content-Type': 'application/json',
  'x-api-key': '${ANTHROPIC_API_KEY}',
  'anthropic-version': '2023-06-01'
}
```

**Request Payload:**
```javascript
{
  model: 'claude-3-5-sonnet-20241022',
  max_tokens: 1024,
  messages: [
    {
      role: 'user',
      content: `You are a language learning diagnostic expert. [same prompt as GPT]`
    }
  ]
}
```

**Success Response (200):**
```javascript
{
  id: 'msg_xxx',
  type: 'message',
  role: 'assistant',
  content: [
    {
      type: 'text',
      text: '## Overall Assessment\n...'
    }
  ],
  model: 'claude-3-5-sonnet-20241022',
  stop_reason: 'end_turn',
  usage: {
    input_tokens: 500,
    output_tokens: 800
  }
}
```

### Firestore Collections

#### `users/{userId}`
```javascript
{
  uid: string,
  email: string,
  onboardingCompleted: boolean,
  languages: [
    {
      languageCode: string,
      onboardingStatus: string,
      currentScreen: string | null,
      currentQuestionIndex: number | null,
      tempAnswers: array | null,
      testHistory: array,
      currentProfile: string | null,
      goals: array | null,
      lastUpdated: timestamp
    }
  ],
  createdAt: timestamp,
  updatedAt: timestamp
}
```

#### `onboardingTests/{testId}`
```javascript
{
  userId: string,
  language: string,
  testDate: timestamp,
  earlyTermination: boolean,
  questions: array,
  totalQuestions: number,
  completedQuestions: number,
  correctAnswers: number,
  totalTimeElapsed: number,
  aiProfile: string | null,
  profileStatus: string,
  profileGeneratedBy: string | null,
  goals: array | null,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

#### `questionBank/{questionId}`
```javascript
{
  questionId: string,
  language: string,
  questionType: 'error_spotting' | 'fill_blank' | 'reading_comp' | 'picture_desc',
  difficulty: 'foundation' | 'beginner' | 'intermediate' | 'advanced',
  isFoundation: boolean, // true for questions 1-3
  category: string, // e.g., 'hangul', 'particles', 'verb_conjugation'
  questionText: string,
  options?: array, // for multiple choice
  correctAnswer: string | array,
  explanation?: string,
  imageUrl?: string, // for picture-based questions
  audioUrl?: string, // future: listening comprehension
  createdAt: timestamp,
  updatedAt: timestamp
}
```

---

## 9. Edge Cases

### 1. User Quits During Welcome Screen
- **Scenario**: User closes app on Welcome Screen
- **Behavior**:
  - Save `currentScreen: 'welcome'` to Firestore
  - On app reopen: Show dashboard with blocking overlay
  - On "Continue Setup" tap: Navigate back to Welcome Screen
- **Data**: No test data saved yet

### 2. User Quits During Language Selection
- **Scenario**: User closes app after selecting language but before confirming
- **Behavior**:
  - Save `currentScreen: 'language_selection'` and selected language (if any)
  - On resume: Show Language Selection with previous selection pre-filled
- **Data**: Selected language saved in `languages` array with `onboardingStatus: 'in_progress'`

### 3. User Quits During Test (Mid-Question) - UPDATED 2026-01-12
- **Scenario**: User closes app at Question 5 (timer at 23 seconds)
- **Behavior**:
  - Save `currentScreen: 'test'` to Firestore
  - ~~Save `tempAnswers` array with questions 1-4~~ **REMOVED**
  - On resume: **Restart from Question 1** (not Question 5)
  - ~~Previous answers (1-4) preserved and not re-asked~~ **REMOVED**
  - **User must restart test from beginning**
- **Data**: ~~Partial test data in `tempAnswers`~~ **No partial data saved**

### 4. User Quits During AI Profile Generation - UPDATED 2026-01-12
- **Scenario**: User force-closes app while "Analyzing responses..." screen is showing
- **Behavior**:
  - Test data already saved to Firestore with `profileStatus: 'pending'`
  - ~~Background job continues processing~~ **REMOVED**
  - **Function may still be running in Firebase (up to 60s timeout)**
  - On resume: User lands on Dashboard
    - If profile completed: Dashboard shows profile (no badge)
    - If profile still pending: Dashboard shows "⏳ Profile Pending" badge with "🔄 Regenerate Profile" button
    - If profile failed: Dashboard shows "❌ Generation Failed" badge with "🔄 Regenerate Profile" button
  - **User can manually retry from dashboard**

### 5. Early Termination (3 Foundation Failures)
- **Scenario**: User answers foundation questions 1, 2, 3 incorrectly
- **Behavior**:
  - End test immediately after Question 3
  - Set `earlyTermination: true`, `terminationReason: 'foundation_failure'`
  - Send to AI with context: "User struggled with foundational concepts"
  - AI generates beginner-focused profile emphasizing basics
- **Data**: Only 3 questions in test results

### 6. Network Failure During Test
- **Scenario**: User loses internet connection while taking test
- **Behavior**:
  - Questions already loaded (cached from initial load)
  - User can continue answering questions offline
  - On submit (end of test), check network
    - If online: Proceed to AI generation
    - If offline: Show "No connection" error, save progress, allow retry
- **Data**: Answers saved locally, synced when online

### 7. Both AI APIs Fail - UPDATED 2026-01-12
- **Scenario**: OpenAI returns 500 error, Claude returns 429 (rate limit)
- **Behavior**:
  - Function updates test data with `profileStatus: 'failed'`
  - ~~Queue background retry (retry every 5 minutes, max 5 attempts)~~ **REMOVED**
  - Show user: "Having trouble generating your profile. You can skip to dashboard and retry later."
  - **"Go to Dashboard" button appears**
  - Dashboard shows "❌ Generation Failed" badge
  - **User can manually retry unlimited times via "🔄 Regenerate Profile" button**
- **Data**: Test saved, profile null, status failed

### 8. User Has Existing Language, Adds New One
- **Scenario**: User completed Korean onboarding, now adds Chinese
- **Behavior**:
  - `onboardingCompleted: true` (already set)
  - Add new language to `languages` array with `onboardingStatus: 'not_started'`
  - Korean features remain accessible
  - Chinese features locked until Chinese onboarding completed
  - On Chinese language selection: Start new onboarding flow for Chinese only
- **Data**: Two entries in `languages` array, separate test history

### 9. Duplicate Test Submission
- **Scenario**: User taps "Submit Answer" multiple times rapidly
- **Behavior**:
  - Disable button after first tap
  - Ignore subsequent taps
  - Prevent duplicate answer recording
- **Data**: Single answer per question

### 10. Question Bank Empty or Insufficient Questions
- **Scenario**: Question bank has only 10 questions, but test needs 15
- **Behavior**:
  - Check question count before starting test
  - If insufficient: Show error "Test temporarily unavailable. Contact support."
  - Prevent test from starting
  - Log error to monitoring
- **Data**: No test data created

### 11. AI Returns Malformed Response
- **Scenario**: GPT returns valid JSON but profile is gibberish or off-topic
- **Behavior**:
  - Validate response contains expected sections (Overall Assessment, Strengths, etc.)
  - If invalid: Fallback to Claude
  - If Claude also invalid: Use generic template profile with test stats:
    ```
    You completed {X} out of {Y} questions correctly.
    Areas to focus: [list categories where user answered incorrectly]
    ```
- **Data**: Save generic profile with `profileGeneratedBy: 'fallback_template'`

### 12. User Deletes App Mid-Onboarding - UPDATED 2026-01-12
- **Scenario**: User uninstalls app, reinstalls later
- **Behavior**:
  - AsyncStorage cleared (local temp data lost)
  - Firestore data persists (user account, partial test data)
  - On login: Check `onboardingCompleted` flag
  - If `in_progress`: Dashboard shows resume banner
  - ~~If `tempAnswers` exist: Use them, don't re-ask~~ **REMOVED** - User restarts test from Q1
- **Data**: Firestore data persists, AsyncStorage data lost

### 13. User Taps Regenerate Profile But Profile Already Exists (NEW - 2026-01-12)
- **Scenario**: User sees "Profile Pending" badge, taps regenerate, but profile was completed in background
- **Behavior**:
  - Function checks if `profileStatus === 'completed' && aiProfile` exists
  - If yes: Return existing profile immediately (idempotent)
  - Alert shows "Success!" even though no regeneration occurred
  - Badge disappears from dashboard
- **Data**: No new profile generated, existing profile returned

### 14. User Taps Regenerate Multiple Times Rapidly (NEW - 2026-01-12)
- **Scenario**: User taps "🔄 Regenerate Profile" button 5 times in 1 second
- **Behavior**:
  - First tap: Alert modal shows "Generating Profile..." (blocks UI)
  - Subsequent taps: Ignored (alert modal blocks interaction)
  - Only one function call is made
  - After function completes: Alert updates with success/error
- **Data**: Single function invocation

### 15. User Regenerates But Both AI Services Fail Again (NEW - 2026-01-12)
- **Scenario**: User taps regenerate, OpenAI fails, Claude fails
- **Behavior**:
  - Function updates `profileStatus: 'failed'`
  - Function returns error to client
  - Alert shows: "Error - Failed to generate profile. Please try again later."
  - Badge remains "❌ Generation Failed"
  - User can retry again (unlimited attempts)
- **Data**: profileStatus remains 'failed', no retry count tracking

---

## 10. Failure Modes

### Client-Side Validation Errors

| Error | Code | User Message | Action |
|-------|------|--------------|--------|
| No language selected | `validation/no-language` | "Please select a language to continue" | Show error below language list |
| Empty answer submitted | `validation/empty-answer` | "Please select an answer before continuing" | Show error, keep on same question |
| Network offline (test start) | `network/offline` | "You need an internet connection to start the test" | Show retry button |

### API Errors - OpenAI

| Error Code | User Message | Fallback Action |
|-----------|--------------|-----------------|
| 429 (Rate limit) | "Our system is busy. Trying alternate method..." | Fallback to Claude immediately |
| 500 (Server error) | "Our system is busy. Trying alternate method..." | Fallback to Claude immediately |
| 401 (Invalid API key) | "Unable to generate profile. Our team has been notified." | Log critical error, queue retry |
| Network timeout (>30s) | "Connection timeout. Trying alternate method..." | Fallback to Claude |

### API Errors - Claude (Fallback)

| Error Code | User Message | Fallback Action |
|-----------|--------------|-----------------|
| 429 (Rate limit) | "We're still analyzing your results. You can start learning now, and your profile will appear soon." | Queue background retry |
| 500 (Server error) | "We're still analyzing your results. You can start learning now, and your profile will appear soon." | Queue background retry |
| 401 (Invalid API key) | "Unable to generate profile. Please contact support." | Log critical error, allow dashboard access |
| Network timeout | "We're still analyzing your results. Check back in a few minutes." | Queue background retry |

### Firestore Errors

| Error | User Message | Retry Behavior |
|-------|--------------|----------------|
| Permission denied | "Unable to save your progress. Please check your connection and try again." | Show retry button |
| Network error | "Connection lost. Your answers are saved locally and will sync when connection is restored." | Auto-retry every 10s |
| Write failure | "Unable to save. Please try again." | Allow manual retry |
| Read failure (question bank) | "Unable to load test. Please check your connection." | Show retry button |

### Background Job Failures

| Scenario | Retry Logic | Max Attempts |
|----------|-------------|--------------|
| AI profile generation pending | Retry every 5 minutes | 5 attempts (25 min total) |
| After 5 failures | Send notification to user: "Profile generation failed. Please contact support." | Manual intervention |

### System Errors

| Error | Behavior |
|-------|----------|
| Question bank load failure | Show error screen, prevent test start, log error |
| AsyncStorage write failure (resume data) | Log warning, continue (fallback to Firestore only) |
| Timer malfunction | Default to 0 seconds elapsed, log warning |
| Navigation failure | Log error, attempt to reset navigation stack |

---

## 11. Acceptance Criteria

### Functional Requirements

#### First-Time Onboarding Flow
- [ ] **Given** new user completes signup **when** app loads **then** Welcome Screen is displayed
- [ ] **Given** user on Welcome Screen **when** taps "Get Started" **then** Language Selection Screen is shown
- [ ] **Given** user selects language **when** taps "Continue" **then** Test Confirmation Screen is shown
- [ ] **Given** user on Test Confirmation **when** taps "Start Test" **then** first question is displayed with timer at 00:00
- [ ] **Given** user answers question **when** submits **then** next question loads and answer is saved
- [ ] **Given** user completes 15 questions **when** last answer submitted **then** AI profile generation starts
- [ ] **Given** AI profile generated **when** displayed **then** profile contains all sections (Assessment, Strengths, Gaps, Goals, Note)
- [ ] **Given** user views profile **when** taps "Start Learning" **then** dashboard is unlocked and accessible

#### Adaptive Testing Logic
- [ ] **Given** user answers foundation Q1 wrong **when** answers Q2 wrong **and** answers Q3 wrong **then** test ends immediately
- [ ] **Given** test ends early **when** AI profile generated **then** profile acknowledges foundation struggles
- [ ] **Given** user passes foundation questions **when** Q4 loads **then** question is from random pool (not foundation)
- [ ] **Given** user on Q4-15 **when** questions rotate **then** no more than 4 consecutive questions of same type

#### Resume Incomplete Onboarding
- [ ] **Given** user quits on Welcome Screen **when** app reopens **then** dashboard shows blocking overlay
- [ ] **Given** blocking overlay shown **when** taps "Continue Setup" **then** navigates to Welcome Screen
- [ ] **Given** user quits at Question 5 **when** resumes **then** Question 5 is shown again with timer at 0
- [ ] **Given** user quits at Question 5 **when** resumes **then** questions 1-4 are NOT re-asked
- [ ] **Given** user quits at Question 5 **when** resumes **then** previous answers (Q1-4) are preserved in Firestore
- [ ] **Given** user completes resumed test **when** profile generated **then** all 15 answers (1-4 old, 5-15 new) are sent to AI

#### AI Profile Generation
- [ ] **Given** test completed **when** profile generation starts **then** loading screen is shown
- [ ] **Given** OpenAI API succeeds **when** profile returned **then** profile is displayed and saved to Firestore
- [ ] **Given** OpenAI API fails **when** error occurs **then** system retries with Claude API
- [ ] **Given** both APIs fail **when** errors occur **then** test data saved with `profileStatus: 'pending'` and background retry queued
- [ ] **Given** background retry succeeds **when** user opens app **then** profile is displayed (not loading screen)
- [ ] **Given** AI profile contains goals **when** saved **then** goals are extracted and stored in `user.languages[].goals` array

#### Dashboard Access Control
- [ ] **Given** user has not completed onboarding **when** attempts to access dashboard **then** blocking overlay is shown
- [ ] **Given** user completes first language onboarding **when** navigates to dashboard **then** no blocking overlay, full access
- [ ] **Given** user has Korean completed, adds Chinese **when** views dashboard **then** Korean features accessible, Chinese features locked
- [ ] **Given** user completes Chinese onboarding **when** navigates to dashboard **then** both Korean and Chinese features accessible

#### Additional Language Onboarding
- [ ] **Given** user has completed Korean **when** adds Chinese **then** new language entry created in `languages` array with `onboardingStatus: 'not_started'`
- [ ] **Given** user starts Chinese onboarding **when** completes **then** Chinese test history and profile saved separately from Korean
- [ ] **Given** user has multiple languages **when** views profile **then** can switch between language profiles

### UI/UX Requirements

#### Welcome Screen
- [ ] Welcome message is displayed clearly
- [ ] "Get Started" button is prominent and tappable
- [ ] Screen uses app branding colors and logo

#### Language Selection Screen
- [ ] Languages displayed as cards or list items
- [ ] Selected language is visually highlighted
- [ ] "Continue" button is disabled until language selected
- [ ] "Continue" button changes to enabled state when language selected

#### Test Confirmation Screen
- [ ] Motivational copy is encouraging and clear
- [ ] Estimated time is displayed (10-15 minutes)
- [ ] "Start Test" button is prominent
- [ ] Copy mentions "It's okay to get answers wrong"

#### Test Screen
- [ ] Question number is displayed (e.g., "Question 5 of 15")
- [ ] Timer displays elapsed time in MM:SS format
- [ ] Question content is readable and properly formatted
- [ ] Answer options (for MCQ) are clearly selectable
- [ ] "Submit Answer" button is disabled until answer selected
- [ ] "Submit Answer" button shows loading state after tap
- [ ] Transition between questions is smooth (no flicker)

#### AI Profile Generation Screen
- [ ] Loading animation is smooth and continuous
- [ ] Message "Analyzing your responses..." is displayed
- [ ] Sub-message "This may take 20-30 seconds" is shown
- [ ] No cancel/skip button (blocking operation)

#### Profile Summary Screen
- [ ] AI profile is displayed in readable format (markdown rendered)
- [ ] Sections are visually separated (Assessment, Strengths, Gaps, Goals)
- [ ] "Recommended Focus Areas" are highlighted or bulleted
- [ ] "Start Learning" button is prominent at bottom
- [ ] Profile is scrollable if content exceeds screen height

#### Dashboard Blocking Overlay
- [ ] Dashboard content is blurred or darkened
- [ ] Overlay message is centered and readable
- [ ] "Continue Setup" button is prominent
- [ ] No close/dismiss option (blocking)
- [ ] Tapping outside overlay does not dismiss it

### Data Requirements

#### User Profile
- [ ] `onboardingCompleted` flag is false for new users
- [ ] `onboardingCompleted` flag is set to true after first language completed
- [ ] `languages` array contains entry for each language user has selected
- [ ] Each language entry has `onboardingStatus`, `currentScreen`, `currentQuestionIndex`, `tempAnswers`
- [ ] `tempAnswers` is cleared after test completion
- [ ] `currentScreen` and `currentQuestionIndex` are null after test completion

#### Test Results
- [ ] Test result document is created in `onboardingTests` collection
- [ ] Test result includes all questions asked (including early termination)
- [ ] Each question includes `questionId`, `userAnswer`, `correctAnswer`, `isCorrect`, `timeElapsed`
- [ ] `earlyTermination` flag is true if test ended at Q3
- [ ] `totalTimeElapsed` is sum of all question times
- [ ] `correctAnswers` count is accurate
- [ ] `aiProfile` is saved after generation
- [ ] `profileStatus` is 'pending' if AI generation fails, 'completed' if succeeds

#### Question Bank
- [ ] Questions have `isFoundation: true` for foundation questions (Q1-3 pool)
- [ ] Questions have `difficulty` field for adaptive logic
- [ ] Questions have `questionType` field for rotation logic
- [ ] Question bank has at least 20 questions per language (15 + buffer)

### Security Requirements

- [ ] User can only access their own test results (Firestore rules enforce `userId` match)
- [ ] User can only update their own profile (Firestore rules enforce `userId` match)
- [ ] API keys (OpenAI, Claude) are stored in environment variables, not in code
- [ ] API requests are made from backend (not client-side), or use Firebase Functions to proxy
- [ ] User cannot manipulate test results or answers by modifying client-side state
- [ ] Question bank correct answers are not exposed to client before submission

### Performance Requirements

- [ ] Question bank loads in < 2 seconds
- [ ] Question transitions happen in < 500ms
- [ ] AI profile generation completes in < 30 seconds (90th percentile)
- [ ] Dashboard loads in < 1 second after onboarding completion
- [ ] Resume flow loads previous state in < 1 second

### Error Handling Requirements

- [ ] Network errors show user-friendly message (not raw error codes)
- [ ] API failures gracefully fall back to Claude
- [ ] Blocking errors (question bank load failure) prevent test start with clear message
- [ ] Non-blocking errors (AI generation failure) allow dashboard access with pending state
- [ ] All errors are logged to error monitoring service (e.g., Sentry)

---

## 12. Open Questions / Assumptions

### Resolved Assumptions

✅ **Question types**: Error spotting, fill-in-blank, reading comprehension, picture description
✅ **Scoring**: No numerical score, AI essay-style diagnosis only
✅ **AI service**: OpenAI GPT primary, Claude fallback
✅ **Multi-language flow**: One language at a time, dashboard unlocks after first
✅ **Resume behavior**: Restart current question, preserve previous answers
✅ **AI generation**: Mandatory for MVP, blocking requirement
✅ **Foundation failure**: 3 consecutive wrong answers on foundation questions ends test
✅ **Adaptive logic**: Questions 1-3 foundation, Q4-15 random with variety
✅ **AI generation UX**: Asynchronous with background retry queue
✅ **Special questions**: Infrastructure supports `isSpecial` flag for future use

### Open Questions

#### 1. Skip Question Feature ✅ DECIDED
- **Question**: Should users be able to skip questions during the test?
- **Decision**: **Option A - No skip allowed** (forces engagement, ensures data quality for AI profiling)
- **Rationale**: Ensures complete test data for accurate AI diagnosis
- **Future Consideration**: May revisit based on user behavior analytics (drop-off rates, user feedback)

#### 2. Test Retake Policy ✅ DECIDED
- **Question**: Can users retake the onboarding test for the same language?
- **Decision**: **Option A - No retake allowed** (one-time assessment for v1)
- **Rationale**: Prevents gaming the system, simplifies data model
- **Future Consideration**: May add retake after 30+ days in future iteration

#### 3. Question Bank Authoring ✅ DECIDED
- **Question**: How will questions be added to the question bank?
- **Decision**: **Option C - CSV/JSON import via script** for MVP, migrate to Admin UI later
- **Rationale**: Fast iteration during MVP, no need to build UI immediately
- **Future Consideration**: Build Admin UI for question authoring (separate feature)

#### 4. Analytics Tracking ✅ DECIDED
- **Question**: What analytics should be tracked during onboarding?
- **Decision**: **Track all metrics** via Firebase Analytics:
  - Time spent per screen
  - Drop-off rate per screen (especially where users quit)
  - Average test completion time
  - AI generation success/failure rate
  - Most commonly failed question types
  - Early termination rate (foundation failure)
- **Rationale**: Data-driven optimization of onboarding experience
- **Implementation**: Add Firebase Analytics events at each screen transition and test milestone

#### 5. Localization ✅ DECIDED
- **Question**: Should onboarding UI be available in multiple languages?
- **Decision**: **Option A - English only** for MVP
- **Rationale**: Faster time to market, simpler to test and iterate
- **Future Consideration**: Full i18n support (Option C) in future iteration

#### 6. Question Metadata for AI ✅ DECIDED
- **Question**: Should we send additional context to AI (question difficulty, category, etc.)?
- **Decision**: **Option B - Send question metadata** (difficulty, category, isFoundation)
- **Rationale**: Helps AI provide more specific, actionable feedback
- **Implementation**: Include metadata in AI request payload

#### 7. Background Retry Notification ✅ DECIDED
- **Question**: If AI profile generation succeeds after user leaves app, should we send push notification?
- **Decision**: **Option A - No notification** for MVP
- **Rationale**: Simpler implementation, users will see profile on next app open
- **Future Consideration**: Push notification (Option B) in future iteration after push notification infrastructure is built

#### 8. Partial Credit for Answers ✅ DECIDED
- **Question**: For fill-in-blank or picture description, should AI evaluate partial correctness?
- **Decision**: **Option A - Binary correct/incorrect** (exact match only)
- **Rationale**: Simpler to implement, AI can still identify patterns from right/wrong answers
- **Future Consideration**: AI-evaluated partial credit (Option B) in future iteration for more nuanced profiling

---

## Summary Checklist

This requirement document includes:
- [x] Context & Intent
- [x] Actual Flow (complete first-time onboarding flow)
- [x] Step-by-Step Behaviour (all screens and logic)
- [x] Sequence Diagram (full flow with AI generation and fallback)
- [x] Visual Flow (screen-by-screen with early termination and resume paths)
- [x] Inputs & Outputs (data structures for user profile, test results, question bank, AI responses)
- [x] API Contracts (OpenAI, Claude, Firestore schemas)
- [x] Edge Cases (12 scenarios: quit/resume, early termination, network failures, API failures, multi-language, etc.)
- [x] Failure Modes (validation, API errors, Firestore errors, background jobs, system errors)
- [x] Acceptance Criteria (functional, UI/UX, data, security, performance, error handling)
- [x] Open Questions (8 decision points for discussion)

**Status**: ✅ APPROVED - All open questions decided, ready for next phase

---

## Next Steps

1. **Review open questions** (8 items) and make decisions
2. **Approve formal requirements** or request changes
3. **Proceed to Architecture & Data Design phase** (next gate in workflow)
4. **Create `feature.md`** following `feature-playbook.md`
5. **Security review** before implementation
