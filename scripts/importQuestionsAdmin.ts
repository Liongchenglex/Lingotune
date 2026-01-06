/**
 * Import Questions Script (Firebase Admin SDK)
 *
 * This script imports questions from questionBank.json into Firestore using Admin SDK
 * Admin SDK bypasses Firestore security rules
 *
 * Usage:
 *   EXPO_PUBLIC_ENV=development npx tsx scripts/importQuestionsAdmin.ts
 *   EXPO_PUBLIC_ENV=production npx tsx scripts/importQuestionsAdmin.ts
 */

import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
const env = process.env.EXPO_PUBLIC_ENV || 'development';
const envFile = env === 'production' ? '.env.production' : '.env.development';
dotenv.config({ path: envFile });

console.log(`📦 Environment: ${env}`);
console.log(`🔧 Loading config from: ${envFile}`);

// Firebase Admin configuration from env variables
const projectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;

if (!projectId) {
  console.error('❌ Firebase project ID not found in environment');
  process.exit(1);
}

console.log(`🔥 Firebase Project: ${projectId}`);

// Initialize Firebase Admin
// For local development, uses Application Default Credentials or service account
try {
  admin.initializeApp({
    projectId: projectId,
  });
} catch (error) {
  console.error('❌ Failed to initialize Firebase Admin:', error);
  console.log('\n💡 To fix this, you need to authenticate:');
  console.log('   1. Install Google Cloud SDK (gcloud)');
  console.log('   2. Run: gcloud auth application-default login');
  console.log('   3. Or set GOOGLE_APPLICATION_CREDENTIALS env variable to service account JSON');
  process.exit(1);
}

const db = admin.firestore();

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
          createdAt: admin.firestore.Timestamp.now(),
          updatedAt: admin.firestore.Timestamp.now(),
        };

        // Use questionId as document ID
        await db.collection('questionBank').doc(question.questionId).set(questionData);

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
