/**
 * Firebase Functions for LingoTune
 *
 * Entry point for all cloud functions
 */

import * as admin from 'firebase-admin';

// Initialize Firebase Admin
admin.initializeApp();

// Export functions
export { generateOnboardingProfile } from './generateOnboardingProfile';
export { retryProfileGeneration } from './retryProfileGeneration';
