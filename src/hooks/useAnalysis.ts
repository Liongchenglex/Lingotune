/**
 * useAnalysis Hook
 *
 * Fetches and subscribes to Korean lyrics analysis data from Firestore.
 * Real-time updates when analysis completes.
 */

import { useState, useEffect } from 'react';
import { getFirestore, collection, doc, onSnapshot } from 'firebase/firestore';

export interface Token {
  morpheme: string;
  pos: string; // Human-readable: 'noun', 'verb', etc.
  posTag: string; // Original KoNLPy tag: 'Noun', 'Verb', etc.
  lineIndex: number;
  charOffset: number;
}

export interface VocabularyWord {
  word: string;
  pos: string;
  count: number;
  lineIndices?: number[]; // Optional - array of line numbers where word appears
  lines?: string[]; // Optional - actual line text (might not be present in Firebase)
  frequency?: number; // Optional - frequency score
  level?: string; // Optional - difficulty level (beginner, intermediate, advanced)
  definition?: {
    en?: string;
    ko?: string;
  };
}

export interface GrammarPattern {
  example: string; // The actual text showing the pattern
  explanation: string; // What the pattern means
  level: string; // Difficulty level
  lineIndices: number[]; // Which lines contain this pattern
}

export interface Romanization {
  original: string;
  romanization: string;
}

export interface AnalysisError {
  error: string;
  timestamp: any;
  retryable: boolean;
}

export interface TokenizationData {
  tokens: Token[];
  processedAt: any;
}

export interface VocabularyData {
  words: VocabularyWord[];
  processedAt: any;
}

export interface GrammarData {
  patterns: GrammarPattern[];
  processedAt: any;
}

export interface PronunciationData {
  romanizations: Romanization[];
  processedAt: any;
}

export type AnalysisStatus = 'loading' | 'complete' | 'error' | 'none' | 'processing';

export interface AnalysisState {
  status: AnalysisStatus;
  tokenization: TokenizationData | null;
  vocabulary: VocabularyData | null;
  grammar: GrammarData | null;
  pronunciation: PronunciationData | null;
  error: AnalysisError | null;
}

/**
 * Hook to fetch analysis data for a song
 * Uses real-time Firestore listeners for live updates
 */
export const useAnalysis = (songId: string): AnalysisState => {
  const [state, setState] = useState<AnalysisState>({
    status: 'loading',
    tokenization: null,
    vocabulary: null,
    grammar: null,
    pronunciation: null,
    error: null,
  });

  useEffect(() => {
    if (!songId) {
      setState({
        status: 'none',
        tokenization: null,
        vocabulary: null,
        grammar: null,
        pronunciation: null,
        error: null,
      });
      return;
    }

    const db = getFirestore();
    const analysisRef = collection(doc(db, 'songs', songId), 'analysis');

    // Subscribe to all analysis documents
    const unsubscribers: (() => void)[] = [];

    // Track which documents exist
    let hasError = false;
    let hasVocabulary = false;
    let hasPronunciation = false;
    let hasGrammar = false;
    let hasTokenization = false;

    // Listen to error document
    const errorUnsub = onSnapshot(
      doc(analysisRef, 'error'),
      (snapshot) => {
        if (snapshot.exists()) {
          hasError = true;
          setState((prev) => ({
            ...prev,
            status: 'error',
            error: snapshot.data() as AnalysisError,
          }));
        }
      },
      (error) => {
        // Error document doesn't exist - that's fine
      }
    );
    unsubscribers.push(errorUnsub);

    // Listen to vocabulary document
    const vocabUnsub = onSnapshot(
      doc(analysisRef, 'vocabulary'),
      (snapshot) => {
        if (snapshot.exists()) {
          hasVocabulary = true;
          const data = snapshot.data();

          // Convert indexed object to array if needed
          let words = data.words;
          if (words && !Array.isArray(words)) {
            // Firestore stores arrays as maps with numeric keys
            words = Object.keys(words)
              .sort((a, b) => parseInt(a) - parseInt(b))
              .map(key => words[key]);
          }

          setState((prev) => ({
            ...prev,
            vocabulary: {
              words: words || [],
              processedAt: data.processedAt,
            },
            status: hasError ? 'error' : 'complete',
          }));
        }
      },
      (error) => {
        // Vocabulary document not yet available
      }
    );
    unsubscribers.push(vocabUnsub);

    // Listen to pronunciation document
    const pronunUnsub = onSnapshot(
      doc(analysisRef, 'pronunciation'),
      (snapshot) => {
        if (snapshot.exists()) {
          hasPronunciation = true;
          const data = snapshot.data();

          // The pronunciation document has structure: { lineByLine: [...], fullRomanization: "...", processedAt: ... }
          let romanizations = data.lineByLine || data.romanizations; // Try lineByLine first, fallback to romanizations

          if (romanizations && !Array.isArray(romanizations)) {
            const keys = Object.keys(romanizations);
            romanizations = keys
              .sort((a, b) => parseInt(a) - parseInt(b))
              .map(key => romanizations[key]);
          }

          setState((prev) => ({
            ...prev,
            pronunciation: {
              romanizations: romanizations || [],
              processedAt: data.processedAt,
            },
            status: hasError ? 'error' : 'complete',
          }));
        }
      },
      (error) => {
        // Pronunciation document not yet available
      }
    );
    unsubscribers.push(pronunUnsub);

    // Listen to grammar document
    const grammarUnsub = onSnapshot(
      doc(analysisRef, 'grammar'),
      (snapshot) => {
        if (snapshot.exists()) {
          hasGrammar = true;
          const data = snapshot.data();

          // Convert indexed object to array if needed
          let patterns = data.patterns;
          if (patterns && !Array.isArray(patterns)) {
            patterns = Object.keys(patterns)
              .sort((a, b) => parseInt(a) - parseInt(b))
              .map(key => patterns[key]);
          }

          setState((prev) => ({
            ...prev,
            grammar: {
              patterns: patterns || [],
              processedAt: data.processedAt,
            },
            status: hasError ? 'error' : 'complete',
          }));
        }
      },
      (error) => {
        // Grammar document not yet available
      }
    );
    unsubscribers.push(grammarUnsub);

    // Listen to tokenization document
    const tokenUnsub = onSnapshot(
      doc(analysisRef, 'tokenization'),
      (snapshot) => {
        if (snapshot.exists()) {
          hasTokenization = true;
          const data = snapshot.data();

          // Convert indexed object to array if needed
          let tokens = data.tokens;
          if (tokens && !Array.isArray(tokens)) {
            tokens = Object.keys(tokens)
              .sort((a, b) => parseInt(a) - parseInt(b))
              .map(key => tokens[key]);
          }

          setState((prev) => ({
            ...prev,
            tokenization: {
              tokens: tokens || [],
              processedAt: data.processedAt,
            },
            status: hasError ? 'error' : 'complete',
          }));
        }
      },
      (error) => {
        // Tokenization document not yet available
      }
    );
    unsubscribers.push(tokenUnsub);

    // After 2 seconds, if no documents exist, set status to 'none'
    const timeout = setTimeout(() => {
      if (!hasError && !hasVocabulary && !hasPronunciation && !hasGrammar && !hasTokenization) {
        setState((prev) => ({
          ...prev,
          status: 'none',
        }));
      } else if (!hasError && (hasVocabulary || hasPronunciation || hasGrammar || hasTokenization)) {
        // Some documents exist but not all - analysis might be in progress
        setState((prev) => ({
          ...prev,
          status: prev.vocabulary && prev.pronunciation ? 'complete' : 'processing',
        }));
      }
    }, 2000);

    // Cleanup function
    return () => {
      clearTimeout(timeout);
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [songId]);

  return state;
};
