/**
 * Onboarding Validation Utilities
 *
 * Client-side validation for onboarding flow
 * Follows existing validation.ts pattern: returns { isValid, error? }
 *
 * Security: Client validation is first line of defense
 * Backend (Firestore rules + Functions) provides second layer
 */

import type { ValidationResult, LanguageCode } from '../types/onboarding';

/**
 * Validate language selection
 *
 * @param language - Selected language code or null
 * @returns ValidationResult with error message if invalid
 */
export const validateLanguageSelection = (language: LanguageCode | null): ValidationResult => {
  if (!language) {
    return {
      isValid: false,
      error: 'Please select a language to continue',
    };
  }

  // Validate against supported languages
  const supportedLanguages: LanguageCode[] = ['ko', 'zh', 'ja', 'es'];
  if (!supportedLanguages.includes(language)) {
    return {
      isValid: false,
      error: 'Invalid language selection',
    };
  }

  return { isValid: true };
};

/**
 * Validate answer submission
 *
 * Ensures answer is not empty before submission
 * Works for both single answers (string) and multiple answers (string[])
 *
 * @param answer - User's answer (string or string array)
 * @returns ValidationResult with error message if invalid
 */
export const validateAnswer = (answer: string | string[] | null | undefined): ValidationResult => {
  if (!answer) {
    return {
      isValid: false,
      error: 'Please select an answer before continuing',
    };
  }

  // Handle array answers (multiple choice with multiple selections)
  if (Array.isArray(answer)) {
    if (answer.length === 0) {
      return {
        isValid: false,
        error: 'Please select at least one answer',
      };
    }

    // Check if all array elements are non-empty strings
    if (answer.some((a) => !a || a.trim() === '')) {
      return {
        isValid: false,
        error: 'Invalid answer format',
      };
    }
  }

  // Handle string answers
  if (typeof answer === 'string' && answer.trim() === '') {
    return {
      isValid: false,
      error: 'Please provide an answer',
    };
  }

  return { isValid: true };
};

/**
 * Validate question index
 *
 * Ensures question index is within valid range (0-14 for 15-question test)
 *
 * @param index - Question index (0-based)
 * @param totalQuestions - Total number of questions in test (default 15)
 * @returns ValidationResult with error message if invalid
 */
export const validateQuestionIndex = (
  index: number,
  totalQuestions: number = 15
): ValidationResult => {
  if (index < 0 || index >= totalQuestions) {
    return {
      isValid: false,
      error: `Invalid question index: ${index}`,
    };
  }

  return { isValid: true };
};

/**
 * Validate test completion
 *
 * Ensures all required fields are present before submitting test
 *
 * @param data - Partial test data to validate
 * @returns ValidationResult with error message if invalid
 */
export const validateTestCompletion = (data: {
  questions?: any[];
  answers?: any[];
  language?: LanguageCode | null;
}): ValidationResult => {
  if (!data.language) {
    return {
      isValid: false,
      error: 'Language is required',
    };
  }

  if (!data.questions || data.questions.length === 0) {
    return {
      isValid: false,
      error: 'No questions found',
    };
  }

  if (!data.answers || data.answers.length === 0) {
    return {
      isValid: false,
      error: 'No answers provided',
    };
  }

  if (data.questions.length !== data.answers.length) {
    return {
      isValid: false,
      error: 'Question and answer count mismatch',
    };
  }

  return { isValid: true };
};
