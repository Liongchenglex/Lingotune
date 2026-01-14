/**
 * Firebase Functions for LingoTune
 *
 * Entry point for all cloud functions
 */

import * as dotenv from 'dotenv';
import * as admin from 'firebase-admin';

// Load environment variables from .env file
// Firebase automatically sets NODE_ENV to 'production' when deployed
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development';
dotenv.config({ path: envFile });

// Initialize Firebase Admin
admin.initializeApp();

// Export functions
export { generateProfile } from './generateProfile';

// Music feature functions
export { searchSongs } from './searchSongs';
export { fetchLyrics } from './fetchLyrics';
export { analyzeLyricsTrigger } from './analyzeLyricsTrigger';
