/**
 * Language Detection Utility
 *
 * Uses the franc library to detect language from text (lyrics).
 * Supports Korean, Chinese, Japanese, and Spanish.
 *
 * Reference: docs/features/learnmusic/requirements.md Section 3.D
 */

import { franc } from 'franc';
import { LanguageCode } from '../types/onboarding';
import { LanguageDetectionResult, LanguageValidationResult } from '../types/music';

/**
 * Map franc ISO 639-3 codes to our LanguageCode type
 * franc returns 3-letter codes, we use 2-letter codes
 */
const FRANC_TO_LANGUAGE_CODE: Record<string, LanguageCode> = {
  'kor': 'ko',  // Korean
  'cmn': 'zh',  // Mandarin Chinese
  'zho': 'zh',  // Chinese (generic)
  'jpn': 'ja',  // Japanese
  'spa': 'es',  // Spanish
};

/**
 * Minimum character length for reliable language detection
 * Lyrics with fewer characters will return 'unknown'
 */
const MIN_LYRICS_LENGTH = 50;

/**
 * Confidence thresholds (defined in requirements.md Section 3.D)
 * - >= 0.7: Auto-pass (valid)
 * - 0.5 - 0.7: Warning (user can choose)
 * - < 0.5: Auto-fail (invalid)
 */
export const CONFIDENCE_THRESHOLDS = {
  AUTO_PASS: 0.7,
  WARNING: 0.5,
  AUTO_FAIL: 0.5,
} as const;

/**
 * Detect language from lyrics using franc library
 *
 * @param lyrics - Plain text lyrics
 * @returns LanguageDetectionResult with language code and confidence
 *
 * @example
 * const result = detectLanguage("나는 너를 사랑해");
 * // Returns: { language: 'ko', confidence: 0.95 }
 */
export function detectLanguage(lyrics: string): LanguageDetectionResult {
  // Validate input
  if (!lyrics || lyrics.trim().length < MIN_LYRICS_LENGTH) {
    return {
      language: 'unknown',
      confidence: 0,
    };
  }

  try {
    // franc returns ISO 639-3 code (3 letters)
    const detected = franc(lyrics, { minLength: MIN_LYRICS_LENGTH });

    // Check if detected language is supported
    const languageCode = FRANC_TO_LANGUAGE_CODE[detected];

    if (!languageCode) {
      return {
        language: 'unknown',
        confidence: 0,
      };
    }

    // Calculate confidence score
    // franc doesn't provide confidence directly, so we use a heuristic:
    // - If franc returns a result (not 'und'), we estimate confidence based on:
    //   1. Text length (longer = more confident)
    //   2. If result is 'und' (undetermined), confidence = 0
    const confidence = calculateConfidence(detected, lyrics);

    return {
      language: languageCode,
      confidence,
    };
  } catch (error) {
    console.error('Language detection error:', error);
    return {
      language: 'unknown',
      confidence: 0,
    };
  }
}

/**
 * Validate detected language against user's target language
 *
 * @param lyrics - Plain text lyrics
 * @param targetLanguage - User's target language
 * @returns LanguageValidationResult with validation status and reason
 *
 * @example
 * const result = validateSongLanguage("나는 너를 사랑해", 'ko');
 * // Returns: { valid: true, detected: 'ko', confidence: 0.95 }
 */
export function validateSongLanguage(
  lyrics: string,
  targetLanguage: LanguageCode
): LanguageValidationResult {
  const detection = detectLanguage(lyrics);

  // Case 1: Unknown language (Section 9.3.1)
  if (detection.language === 'unknown' || detection.confidence < 0.3) {
    return {
      valid: false,
      detected: 'unknown',
      confidence: detection.confidence,
      reason: 'cannot_detect_language',
    };
  }

  // Case 2: Low confidence (< 0.5) - Auto-fail (Section 9.3.3)
  if (detection.confidence < CONFIDENCE_THRESHOLDS.AUTO_FAIL) {
    return {
      valid: false,
      detected: detection.language,
      confidence: detection.confidence,
      reason: 'low_confidence',
    };
  }

  // Case 3: Wrong language detected (Section 9.3.2)
  if (detection.language !== targetLanguage) {
    return {
      valid: false,
      detected: detection.language,
      confidence: detection.confidence,
      reason: 'wrong_language',
    };
  }

  // Case 4: Medium confidence (0.5 - 0.7) - Warning (Section 8.4)
  if (detection.confidence < CONFIDENCE_THRESHOLDS.AUTO_PASS) {
    return {
      valid: false, // Not auto-valid, but user can override
      detected: detection.language,
      confidence: detection.confidence,
      reason: 'medium_confidence_warning',
    };
  }

  // Case 5: High confidence (>= 0.7) - Auto-pass
  return {
    valid: true,
    detected: detection.language,
    confidence: detection.confidence,
  };
}

/**
 * Calculate confidence score based on franc result and text characteristics
 *
 * franc doesn't provide confidence directly, so we use heuristics:
 * 1. If result is 'und' (undetermined) → confidence = 0
 * 2. Otherwise, confidence depends on text length and character variety
 *
 * @param francCode - ISO 639-3 code from franc
 * @param text - Original text
 * @returns Confidence score (0-1)
 */
function calculateConfidence(francCode: string, text: string): number {
  // If franc returned 'und' (undetermined), confidence = 0
  if (francCode === 'und') {
    return 0;
  }

  // Base confidence if franc returned a result
  let confidence = 0.7;

  // Increase confidence based on text length
  const textLength = text.length;
  if (textLength > 500) {
    confidence = Math.min(0.95, confidence + 0.15);
  } else if (textLength > 200) {
    confidence = Math.min(0.85, confidence + 0.10);
  }

  // Check character variety (avoid "la la la" type lyrics)
  const uniqueChars = new Set(text.replace(/\s+/g, '')).size;
  const totalChars = text.replace(/\s+/g, '').length;
  const variety = uniqueChars / totalChars;

  if (variety < 0.2) {
    // Low variety (repetitive lyrics) → reduce confidence
    confidence = Math.max(0.4, confidence - 0.3);
  }

  return Math.min(1, Math.max(0, confidence));
}

/**
 * Get user-friendly language name from language code
 *
 * @param languageCode - Two-letter language code
 * @returns Full language name
 */
export function getLanguageName(languageCode: LanguageCode | 'unknown'): string {
  const names: Record<LanguageCode | 'unknown', string> = {
    ko: 'Korean',
    zh: 'Chinese',
    ja: 'Japanese',
    es: 'Spanish',
    unknown: 'Unknown',
  };
  return names[languageCode];
}

/**
 * Format confidence score as percentage string
 *
 * @param confidence - Confidence score (0-1)
 * @returns Formatted percentage (e.g., "85%")
 */
export function formatConfidence(confidence: number): string {
  return `${Math.round(confidence * 100)}%`;
}
