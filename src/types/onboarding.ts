/**
 * Onboarding Feature - Type Definitions
 *
 * This file defines all TypeScript interfaces for the onboarding feature.
 * These types match the data models defined in docs/features/onboarding/architecture.md
 */

import { Timestamp } from 'firebase/firestore';

/**
 * Language codes supported in the app
 */
export type LanguageCode = 'ko' | 'zh' | 'ja' | 'es';

/**
 * Onboarding status for a specific language
 */
export type OnboardingStatus = 'not_started' | 'in_progress' | 'completed';

/**
 * Screens in the onboarding flow (for resume functionality)
 */
export type OnboardingScreen = 'welcome' | 'language_selection' | 'test_confirmation' | 'test';

/**
 * Question types in the test
 */
export type QuestionType = 'error_spotting' | 'fill_blank' | 'reading_comp' | 'picture_desc';

/**
 * Difficulty levels for questions
 */
export type Difficulty = 'foundation' | 'beginner' | 'intermediate' | 'advanced';

/**
 * Profile generation status
 */
export type ProfileStatus = 'completed' | 'pending' | 'failed';

/**
 * AI provider used for profile generation
 */
export type AIProvider = 'gpt' | 'claude' | 'fallback_template';

// ============================================================================
// USER DATA MODELS
// ============================================================================

/**
 * Temporary answer stored during test (for resume functionality)
 * Stored in AsyncStorage and Firestore user.languages[].tempAnswers
 */
export interface TempAnswer {
  questionId: string;
  answer: string | string[];
  timeElapsed: number; // seconds
}

/**
 * Language-specific onboarding data within user profile
 * Part of user.languages[] array
 */
export interface UserLanguage {
  languageCode: LanguageCode;
  onboardingStatus: OnboardingStatus;

  // Resume state (only if in_progress)
  currentScreen?: OnboardingScreen;
  currentQuestionIndex?: number; // 0-indexed
  tempAnswers?: TempAnswer[];

  // Proficiency data (after completion)
  proficiencyLevel?: string; // AI-derived, not hardcoded
  testHistory: string[]; // Array of onboardingTest document IDs
  currentProfile?: string; // Latest AI diagnosis (markdown)
  goals?: string[]; // Extracted from AI profile
  lastUpdated: Timestamp;
}

/**
 * Extended User type with onboarding fields
 * Extends existing User type from authentication
 */
export interface UserProfile {
  uid: string;
  email: string;
  onboardingCompleted: boolean; // true after first language completed
  languages: UserLanguage[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ============================================================================
// QUESTION BANK
// ============================================================================

/**
 * Question from the question bank
 * Collection: questionBank/{questionId}
 */
export interface Question {
  questionId: string;
  language: LanguageCode;
  questionType: QuestionType;

  // Classification
  difficulty: Difficulty;
  isFoundation: boolean; // true for Q1-3 pool
  category: string; // e.g., 'hangul', 'particles', 'verb_conjugation'
  isSpecial: boolean; // Future: special question logic (reserved)

  // Content
  questionText: string;
  options?: string[]; // MCQ options (if applicable)
  correctAnswer: string | string[];
  explanation?: string; // Why answer is correct (for future learning UI)

  // Media
  imageUrl?: string; // For picture-based questions
  audioUrl?: string; // Future: listening comprehension

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy?: string; // Admin user ID (future)
  tags?: string[]; // Future: additional classification
}

// ============================================================================
// TEST RESULTS
// ============================================================================

/**
 * Question + user answer in a completed test
 * Part of OnboardingTest.questions array
 */
export interface TestQuestion {
  questionId: string; // Reference to question bank
  questionType: QuestionType;
  questionText: string; // Snapshot (in case question bank changes)
  options?: string[]; // For MCQ
  correctAnswer: string | string[];
  userAnswer: string | string[];
  isCorrect: boolean; // Computed
  timeElapsed: number; // Seconds for this question
  timestamp: Timestamp; // When answered
}

/**
 * Completed onboarding test result
 * Collection: onboardingTests/{testId}
 */
export interface OnboardingTest {
  testId: string; // Auto-generated document ID
  userId: string; // Owner (indexed)
  language: LanguageCode;
  testDate: Timestamp;
  testType: 'onboarding'; // Future: 'placement', 'progress_check'

  // Test execution
  earlyTermination: boolean; // True if ended at Q3
  terminationReason?: 'foundation_failure' | 'completed';
  questions: TestQuestion[]; // Array of questions asked + answers

  // Metrics
  totalQuestions: number; // 15 or less if early termination
  completedQuestions: number; // Always <= totalQuestions
  correctAnswers: number; // Count of correct answers
  totalTimeElapsed: number; // Total seconds for all questions

  // AI Profile
  aiProfile?: string; // Essay-style diagnosis (markdown)
  profileStatus: ProfileStatus;
  profileGeneratedBy?: AIProvider;
  goals?: string[]; // Extracted from AI profile

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ============================================================================
// CLIENT-SIDE STATE (Not stored in Firestore)
// ============================================================================

/**
 * In-memory test state during active session
 * Used by TestScreen component
 */
export interface TestState {
  currentQuestionIndex: number; // 0-indexed
  questions: Question[]; // All questions for this test (loaded once)
  answers: TempAnswer[]; // Answers so far
  startTime: Date; // Test start time
  questionStartTime: Date; // Current question start time
}

/**
 * Validation result (matches existing pattern from validation.ts)
 */
export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * User-facing error message
 */
export interface UserError {
  title?: string; // Optional error title
  message: string; // User-friendly message
  action?: string; // "Retry", "Go Back", "Contact Support"
  actionCallback?: () => void;
}

// ============================================================================
// CONTEXT STATE
// ============================================================================

/**
 * OnboardingContext state
 */
export interface OnboardingContextState {
  userProfile: UserProfile | null;
  currentLanguage: UserLanguage | null;
  loading: boolean;
  error: UserError | null;
}

/**
 * OnboardingContext value (methods + state)
 */
export interface OnboardingContextValue extends OnboardingContextState {
  // Language selection
  startOnboarding: (languageCode: LanguageCode) => Promise<void>;

  // Navigation
  updateCurrentScreen: (screen: OnboardingScreen) => Promise<void>;

  // Test state
  saveTestProgress: (questionIndex: number, answers: TempAnswer[]) => Promise<void>;
  completeTest: (testData: Omit<OnboardingTest, 'testId' | 'createdAt' | 'updatedAt'>) => Promise<void>;

  // Utility
  checkOnboardingStatus: () => boolean; // Returns true if onboarding complete
  getCurrentLanguageData: () => UserLanguage | null;
  clearError: () => void;
}
