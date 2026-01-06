/**
 * Import Questions Script
 *
 * This script imports questions from questionBank.json into Firestore
 *
 * Usage:
 *   ts-node scripts/importQuestions.ts
 *
 * Or with environment:
 *   EXPO_PUBLIC_ENV=development ts-node scripts/importQuestions.ts
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, Timestamp } from 'firebase/firestore';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
const env = process.env.EXPO_PUBLIC_ENV || 'development';
const envFile = env === 'production' ? '.env.production' : '.env.development';
dotenv.config({ path: envFile });

console.log(`📦 Environment: ${env}`);
console.log(`🔧 Loading config from: ${envFile}`);

// Firebase configuration from env variables
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

console.log(`🔥 Firebase Project: ${firebaseConfig.projectId}`);

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/**
 * Import questions from JSON file to Firestore
 */
async function importQuestions() {
  try {
    // Read JSON file
    const jsonPath = path.join(__dirname, 'questionBank.json');
    const jsonData = fs.readFileSync(jsonPath, 'utf8');
    const questions = JSON.parse(jsonData);

    console.log(`📚 Found ${questions.length} questions to import`);

    // Import each question
    let imported = 0;
    let failed = 0;

    for (const question of questions) {
      try {
        // Add timestamps
        const questionData = {
          ...question,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        };

        // Use questionId as document ID
        await setDoc(doc(db, 'questionBank', question.questionId), questionData);

        imported++;
        console.log(`✅ Imported: ${question.questionId}`);
      } catch (error) {
        failed++;
        console.error(`❌ Failed to import ${question.questionId}:`, error);
      }
    }

    console.log(`\n✨ Import complete!`);
    console.log(`   Imported: ${imported}`);
    console.log(`   Failed: ${failed}`);
  } catch (error) {
    console.error('❌ Import failed:', error);
    process.exit(1);
  }
}

// Run import
importQuestions()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
