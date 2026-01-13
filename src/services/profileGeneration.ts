/**
 * Profile Generation Service
 *
 * Handles calling the Firebase callable function to generate AI profiles
 */

import { getFunctions, httpsCallable, connectFunctionsEmulator } from 'firebase/functions';
import app from './firebase';

export interface GenerateProfileResult {
  success: boolean;
  profile: string;
  goals: string[];
}

// Initialize Functions
const functions = getFunctions(app, 'us-central1');

// Uncomment for local testing with emulator:
// if (__DEV__) {
//   connectFunctionsEmulator(functions, 'localhost', 5001);
// }

/**
 * Call the generateProfile Firebase Function
 *
 * @param testId - The test document ID to generate profile for
 * @returns Promise with profile and goals
 */
export async function generateProfileForTest(testId: string): Promise<GenerateProfileResult> {
  console.log('profileGeneration - Calling generateProfile function for testId:', testId);

  try {
    const generateProfile = httpsCallable<{ testId: string }, GenerateProfileResult>(
      functions,
      'generateProfile'
    );

    const result = await generateProfile({ testId });

    console.log('profileGeneration - Success:', {
      hasProfile: !!result.data.profile,
      goalsCount: result.data.goals?.length || 0
    });

    return result.data;
  } catch (error: any) {
    console.error('profileGeneration - Error:', error);
    console.error('profileGeneration - Error code:', error.code);
    console.error('profileGeneration - Error message:', error.message);
    console.error('profileGeneration - Error details:', error.details);

    throw new Error(error.message || 'Failed to generate profile');
  }
}
