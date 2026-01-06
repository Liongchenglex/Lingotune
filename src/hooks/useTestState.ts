/**
 * useTestState Hook - Manages test state with AsyncStorage backup
 *
 * Purpose:
 * - Manage current question index, answers, and timer
 * - Auto-save to AsyncStorage for resume functionality
 * - Load saved state on mount
 *
 * Security: AsyncStorage is local only (no sensitive data exposed)
 * Pattern: New pattern for resume-on-quit behavior
 */

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Question, TempAnswer } from '../types/onboarding';

const STORAGE_KEY = 'onboarding_test_state';

interface TestState {
  currentQuestionIndex: number;
  answers: TempAnswer[];
  questions: Question[];
  startTime: Date;
}

interface UseTestStateReturn {
  currentQuestionIndex: number;
  answers: TempAnswer[];
  questions: Question[];
  startTime: Date;
  setCurrentQuestionIndex: (index: number) => void;
  addAnswer: (answer: TempAnswer) => void;
  initializeTest: (questions: Question[]) => void;
  loadSavedState: () => Promise<Partial<TestState> | null>;
  clearState: () => Promise<void>;
}

/**
 * Custom hook for managing test state
 *
 * Features:
 * - Auto-saves to AsyncStorage on state change
 * - Loads saved state on mount
 * - Provides methods to manipulate test state
 */
export const useTestState = (): UseTestStateReturn => {
  const [currentQuestionIndex, setCurrentQuestionIndexState] = useState(0);
  const [answers, setAnswersState] = useState<TempAnswer[]>([]);
  const [questions, setQuestionsState] = useState<Question[]>([]);
  const [startTime, setStartTimeState] = useState<Date>(new Date());

  /**
   * Save current state to AsyncStorage
   * Called automatically whenever state changes
   */
  const saveToStorage = useCallback(async (state: Partial<TestState>) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error('Failed to save test state to AsyncStorage:', error);
      // Non-blocking error (Firestore backup exists)
    }
  }, []);

  /**
   * Load saved state from AsyncStorage
   * Returns null if no saved state exists
   */
  const loadSavedState = useCallback(async (): Promise<Partial<TestState> | null> => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (!saved) return null;

      const state = JSON.parse(saved) as Partial<TestState>;

      // Convert startTime back to Date object
      if (state.startTime) {
        state.startTime = new Date(state.startTime);
      }

      return state;
    } catch (error) {
      console.error('Failed to load test state from AsyncStorage:', error);
      return null;
    }
  }, []);

  /**
   * Clear saved state from AsyncStorage
   * Called when test is completed or abandoned
   */
  const clearState = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear test state from AsyncStorage:', error);
    }
  }, []);

  /**
   * Initialize test with questions
   * Sets up initial state and saves to AsyncStorage
   */
  const initializeTest = useCallback((newQuestions: Question[]) => {
    const now = new Date();
    setQuestionsState(newQuestions);
    setCurrentQuestionIndexState(0);
    setAnswersState([]);
    setStartTimeState(now);

    // Save initial state
    saveToStorage({
      questions: newQuestions,
      currentQuestionIndex: 0,
      answers: [],
      startTime: now,
    });
  }, [saveToStorage]);

  /**
   * Set current question index and save to AsyncStorage
   */
  const setCurrentQuestionIndex = useCallback((index: number) => {
    setCurrentQuestionIndexState(index);
    saveToStorage({
      currentQuestionIndex: index,
      answers,
      questions,
      startTime,
    });
  }, [answers, questions, startTime, saveToStorage]);

  /**
   * Add answer and save to AsyncStorage
   */
  const addAnswer = useCallback((answer: TempAnswer) => {
    const newAnswers = [...answers, answer];
    setAnswersState(newAnswers);
    saveToStorage({
      currentQuestionIndex,
      answers: newAnswers,
      questions,
      startTime,
    });
  }, [answers, currentQuestionIndex, questions, startTime, saveToStorage]);

  return {
    currentQuestionIndex,
    answers,
    questions,
    startTime,
    setCurrentQuestionIndex,
    addAnswer,
    initializeTest,
    loadSavedState,
    clearState,
  };
};
