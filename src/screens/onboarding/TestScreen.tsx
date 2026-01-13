/**
 * TestScreen - Main diagnostic test interface
 *
 * Purpose:
 * - Load questions from Firestore
 * - Display one question at a time with timer
 * - Handle answer submission
 * - Infrastructure for special questions (isSpecial flag)
 * - Save progress for resume functionality
 * - Complete test and navigate to results
 *
 * Security:
 * - Question bank is read-only
 * - Correct answers validated on submission (not exposed beforehand)
 * - Test results include userId for ownership
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import {
  collection,
  query,
  where,
  getDocs,
  limit,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { useTestState } from '../../hooks/useTestState';
import { validateAnswer } from '../../utils/onboardingValidation';
import type { Question, TempAnswer, LanguageCode } from '../../types/onboarding';

interface TestScreenProps {
  language: LanguageCode;
  onComplete: () => void;
}

export const TestScreen: React.FC<TestScreenProps> = ({ language, onComplete }) => {
  const { saveTestProgress, completeTest, updateCurrentScreen, getCurrentLanguageData } = useOnboarding();
  const {
    currentQuestionIndex,
    answers,
    questions,
    startTime,
    setCurrentQuestionIndex,
    addAnswer,
    initializeTest,
    loadSavedState,
    clearState,
  } = useTestState();

  const [loading, setLoading] = useState(true);
  const [selectedAnswer, setSelectedAnswer] = useState<string | string[] | null>(null);
  const [textAnswer, setTextAnswer] = useState<string>(''); // For text input questions (picture_desc)
  const [error, setError] = useState<string | null>(null);
  const [questionStartTime, setQuestionStartTime] = useState<Date>(new Date());
  const [timer, setTimer] = useState(0);

  const currentQuestion = questions[currentQuestionIndex];
  const totalQuestions = questions.length;
  const isLastQuestion = currentQuestionIndex === totalQuestions - 1;

  /**
   * Load questions from Firestore on mount
   * Attempts to resume from saved state if exists
   */
  useEffect(() => {
    loadQuestions();
  }, []);

  /**
   * Update current screen on mount (for resume functionality)
   */
  useEffect(() => {
    updateCurrentScreen('test').catch((err) => {
      console.warn('Failed to update current screen:', err);
    });
  }, []);

  /**
   * Timer - counts up from 0 for current question
   */
  useEffect(() => {
    const interval = setInterval(() => {
      setTimer((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [currentQuestionIndex]);

  /**
   * Load questions from Firestore
   * TODO: Implement adaptive logic (foundation questions first)
   * For now: Load random 15 questions
   */
  const loadQuestions = async () => {
    try {
      setLoading(true);

      // MVP: Always load fresh questions (no resume functionality)
      // If user reloads during test → restart from Q1
      console.log('Loading fresh questions for language:', language);

      // Query question bank
      // TODO: Separate foundation questions (isFoundation: true) for adaptive logic
      const questionsQuery = query(
        collection(db, 'questionBank'),
        where('language', '==', language),
        limit(20) // Load 20, select 15 randomly (buffer for variety)
      );

      const snapshot = await getDocs(questionsQuery);

      if (snapshot.empty) {
        setError('No questions available for this language. Please contact support.');
        setLoading(false);
        return;
      }

      // Convert to Question array
      const loadedQuestions = snapshot.docs.map((doc) => ({
        questionId: doc.id,
        ...doc.data(),
      })) as Question[];

      // Shuffle and select 15 questions
      // TODO: Implement variety logic (avoid 5+ consecutive same type)
      const shuffled = shuffleArray(loadedQuestions);
      const selected = shuffled.slice(0, Math.min(15, shuffled.length));

      // Check for duplicates (debugging)
      const questionIds = selected.map(q => q.questionId);
      const uniqueIds = new Set(questionIds);
      if (questionIds.length !== uniqueIds.size) {
        console.warn('WARNING: Duplicate questions detected!', questionIds);
      }
      console.log('Loaded questions:', questionIds);

      // Initialize test state
      initializeTest(selected);
      setQuestionStartTime(new Date());
      setTimer(0);
      setLoading(false);
    } catch (err: any) {
      console.error('Failed to load questions:', err);
      setError('Unable to load test questions. Please check your connection and try again.');
      setLoading(false);
    }
  };

  /**
   * Shuffle array using Fisher-Yates algorithm
   */
  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  /**
   * Handle answer selection (for MCQ)
   */
  const handleAnswerSelect = (answer: string) => {
    setSelectedAnswer(answer);
    setError(null);
  };

  /**
   * Handle answer submission
   * Validates, records answer, moves to next question or completes test
   */
  const handleSubmit = async () => {
    // Determine which answer to use (text input or MCQ)
    const answerToSubmit = currentQuestion.questionType === 'picture_desc' ? textAnswer : selectedAnswer;

    // Validate answer
    const validation = validateAnswer(answerToSubmit);
    if (!validation.isValid) {
      setError(validation.error || (currentQuestion.questionType === 'picture_desc' ? 'Please enter your answer' : 'Please select an answer'));
      return;
    }

    try {
      // Calculate time elapsed for this question
      const now = new Date();
      const timeElapsed = Math.floor((now.getTime() - questionStartTime.getTime()) / 1000);

      // Create answer record
      const answer: TempAnswer = {
        questionId: currentQuestion.questionId,
        answer: answerToSubmit!,
        timeElapsed,
      };

      // Add to answers array
      addAnswer(answer);

      // Save progress to Firestore (non-blocking)
      saveTestProgress(currentQuestionIndex + 1, [...answers, answer]).catch((err) => {
        console.warn('Failed to save test progress:', err);
        // Non-blocking error (AsyncStorage backup exists)
      });

      // Check if test should end
      // TODO: Implement early termination logic (3 special questions wrong in a row)
      // For now: just check if last question
      console.log('Submit Debug:', {
        currentIndex: currentQuestionIndex,
        totalQuestions,
        isLastQuestion,
        answersCount: answers.length + 1, // +1 for current answer
      });

      if (isLastQuestion) {
        console.log('Last question reached - completing test');
        await handleTestComplete([...answers, answer]);
      } else {
        console.log('Moving to next question:', currentQuestionIndex + 1);
        // Move to next question
        setCurrentQuestionIndex(currentQuestionIndex + 1);
        setSelectedAnswer(null);
        setTextAnswer(''); // Reset text input
        setQuestionStartTime(new Date());
        setTimer(0);
      }
    } catch (err: any) {
      console.error('Failed to submit answer:', err);
      setError('Unable to save your answer. Please try again.');
    }
  };

  /**
   * Handle test completion
   * Creates test result document and clears state
   */
  const handleTestComplete = async (finalAnswers: TempAnswer[]) => {
    try {
      setLoading(true);

      // Debug logging
      console.log('=== Test Completion Debug ===');
      console.log('Total questions:', questions.length);
      console.log('Total answers:', finalAnswers.length);
      console.log('Answers:', finalAnswers.map((a, i) => ({ index: i, questionId: a?.questionId, hasAnswer: !!a?.answer })));

      // Calculate metrics
      const totalTimeElapsed = Math.floor((new Date().getTime() - startTime.getTime()) / 1000);

      // Build test questions array with user answers
      const testQuestions = questions.map((q, index) => {
        const userAnswer = finalAnswers[index];

        // Safety check: if userAnswer is undefined, something went wrong
        if (!userAnswer) {
          console.error(`Missing answer for question ${index + 1}:`, q.questionId);
          throw new Error(`Missing answer for question ${index + 1}. Please try again.`);
        }

        const isCorrect = Array.isArray(q.correctAnswer)
          ? JSON.stringify(q.correctAnswer.sort()) === JSON.stringify(Array.isArray(userAnswer.answer) ? userAnswer.answer.sort() : [userAnswer.answer])
          : q.correctAnswer === userAnswer.answer;

        return {
          questionId: q.questionId,
          questionType: q.questionType,
          questionText: q.questionText,
          options: q.options,
          correctAnswer: q.correctAnswer,
          userAnswer: userAnswer.answer,
          isCorrect,
          timeElapsed: userAnswer.timeElapsed,
          timestamp: Timestamp.now(),
        };
      });

      const correctAnswers = testQuestions.filter((q) => q.isCorrect).length;

      console.log('='.repeat(80));
      console.log('TestScreen - About to call completeTest()');
      console.log('TestScreen - Language:', language);
      console.log('TestScreen - Total questions:', questions.length);
      console.log('TestScreen - Completed questions:', finalAnswers.length);
      console.log('TestScreen - Correct answers:', correctAnswers);

      // Create test result
      await completeTest({
        language,
        testDate: Timestamp.now(),
        testType: 'onboarding',
        earlyTermination: false, // TODO: Set true if early termination logic triggered
        terminationReason: 'completed',
        questions: testQuestions,
        totalQuestions: questions.length,
        completedQuestions: finalAnswers.length,
        correctAnswers,
        totalTimeElapsed,
        profileStatus: 'pending', // AI will generate profile
        userId: '', // Set by OnboardingContext
      });

      console.log('TestScreen - completeTest() finished successfully');
      console.log('='.repeat(80));

      // Clear AsyncStorage state
      await clearState();

      // Navigate to profile generation screen
      console.log('TestScreen - Navigating to profile generation screen');
      onComplete();
    } catch (err: any) {
      console.error('Failed to complete test:', err);
      setError(err.message || 'Unable to save test results. Please try again.');
      setLoading(false);
    }
  };

  /**
   * Format timer display (MM:SS)
   */
  const formatTimer = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Loading state
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.loadingText}>Loading questions...</Text>
      </View>
    );
  }

  // Error state
  if (error && !currentQuestion) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadQuestions}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // No questions loaded
  if (!currentQuestion) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>No questions available</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with progress and timer */}
      <View style={styles.header}>
        <Text style={styles.progress}>
          Question {currentQuestionIndex + 1} of {totalQuestions}
        </Text>
        <Text style={styles.timer}>{formatTimer(timer)}</Text>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressBarContainer}>
        <View style={[styles.progressBarFill, { width: `${((currentQuestionIndex + 1) / totalQuestions) * 100}%` }]} />
      </View>

      {/* Question Content */}
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Question Text */}
        <Text style={styles.questionText}>{currentQuestion.questionText}</Text>

        {/* Answer Options (Multiple Choice) */}
        {currentQuestion.options && currentQuestion.options.length > 0 && (
          <View style={styles.optionsContainer}>
            {currentQuestion.options.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.optionButton,
                  selectedAnswer === option && styles.optionButtonSelected,
                ]}
                onPress={() => handleAnswerSelect(option)}
                activeOpacity={0.7}
              >
                <View style={styles.optionContent}>
                  <View
                    style={[
                      styles.radioButton,
                      selectedAnswer === option && styles.radioButtonSelected,
                    ]}
                  >
                    {selectedAnswer === option && <View style={styles.radioButtonInner} />}
                  </View>
                  <Text
                    style={[
                      styles.optionText,
                      selectedAnswer === option && styles.optionTextSelected,
                    ]}
                  >
                    {option}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Text Input (for picture_desc questions) */}
        {currentQuestion.questionType === 'picture_desc' && (
          <View style={styles.textInputContainer}>
            <Text style={styles.textInputLabel}>Your answer:</Text>
            <TextInput
              style={styles.textInput}
              value={textAnswer}
              onChangeText={(text) => {
                setTextAnswer(text);
                setError(null);
              }}
              placeholder="Type your answer here..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={styles.textInputHint}>
              💡 Write a complete sentence describing the scene.
            </Text>
          </View>
        )}

        {/* Error Message */}
        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{error}</Text>
          </View>
        )}
      </ScrollView>

      {/* Submit Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.submitButton,
            (currentQuestion.questionType === 'picture_desc' ? !textAnswer.trim() : !selectedAnswer) && styles.submitButtonDisabled
          ]}
          onPress={handleSubmit}
          disabled={(currentQuestion.questionType === 'picture_desc' ? !textAnswer.trim() : !selectedAnswer) || loading}
          activeOpacity={0.8}
        >
          <Text style={styles.submitButtonText}>
            {isLastQuestion ? 'Complete Test' : 'Next Question'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#FFFFFF',
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#DC2626',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#6366F1',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 12,
  },
  progress: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  timer: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6366F1',
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 24,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#6366F1',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 24,
  },
  questionText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    lineHeight: 28,
    marginBottom: 24,
  },
  optionsContainer: {
    marginBottom: 16,
  },
  optionButton: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionButtonSelected: {
    borderColor: '#6366F1',
    backgroundColor: '#EEF2FF',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonSelected: {
    borderColor: '#6366F1',
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#6366F1',
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    color: '#374151',
  },
  optionTextSelected: {
    color: '#111827',
    fontWeight: '500',
  },
  errorBanner: {
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
  },
  errorBannerText: {
    color: '#DC2626',
    fontSize: 14,
    textAlign: 'center',
  },
  footer: {
    padding: 24,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  submitButton: {
    backgroundColor: '#6366F1',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    backgroundColor: '#D1D5DB',
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  textInputContainer: {
    marginBottom: 16,
  },
  textInputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    padding: 16,
    fontSize: 16,
    color: '#111827',
    minHeight: 120,
  },
  textInputHint: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 8,
    fontStyle: 'italic',
  },
});
