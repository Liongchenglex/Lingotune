/**
 * retryProfileGeneration - Scheduled Firebase Function
 *
 * Purpose:
 * - Runs every 5 minutes via Pub/Sub scheduler
 * - Finds pending profile generations older than 5 minutes
 * - Retries AI generation for failed profiles
 * - Marks as failed after 5 attempts
 *
 * Security:
 * - Runs with admin privileges
 * - Only processes tests with valid userId
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

const db = admin.firestore();

const MAX_RETRY_ATTEMPTS = 5;
const RETRY_AFTER_MINUTES = 5;

interface TestQuestion {
  questionId: string;
  questionText: string;
  userAnswer: string;
  correctAnswer: string | string[];
  isCorrect: boolean;
  timeSpent: number;
  category: string;
  difficulty: string;
}

interface OnboardingTest {
  testId: string;
  userId: string;
  language: string;
  questions: TestQuestion[];
  totalTime: number;
  completedAt: admin.firestore.Timestamp;
  profileStatus: 'pending' | 'completed' | 'failed';
  retryCount?: number;
  updatedAt?: admin.firestore.Timestamp;
  aiProfile?: string;
  goals?: string[];
}

/**
 * Scheduled function - runs every 5 minutes
 *
 * Note: Firebase Functions v2 schedule syntax is used (.schedule('every 5 minutes'))
 * This automatically creates the Cloud Scheduler job when deployed.
 * No manual gcloud command needed.
 */
export const retryProfileGeneration = functions.pubsub
  .schedule('every 5 minutes')
  .onRun(async (_context) => {
    console.log('Starting retry profile generation job...');

    const fiveMinutesAgo = admin.firestore.Timestamp.fromMillis(
      Date.now() - RETRY_AFTER_MINUTES * 60 * 1000
    );

    // Query pending tests older than 5 minutes
    const pendingTestsSnapshot = await db
      .collection('onboardingTests')
      .where('profileStatus', '==', 'pending')
      .where('updatedAt', '<', fiveMinutesAgo)
      .limit(10) // Process max 10 per run to avoid timeout
      .get();

    if (pendingTestsSnapshot.empty) {
      console.log('No pending tests to retry');
      return null;
    }

    console.log(`Found ${pendingTestsSnapshot.size} pending tests to retry`);

    const retryPromises = pendingTestsSnapshot.docs.map(async (doc) => {
      const testId = doc.id;
      const testData = doc.data() as OnboardingTest;
      const retryCount = testData.retryCount || 0;

      console.log(`Processing test ${testId}, retry attempt ${retryCount + 1}`);

      // Check if max retries exceeded
      if (retryCount >= MAX_RETRY_ATTEMPTS) {
        console.warn(`Max retries exceeded for test ${testId}, marking as failed`);
        await updateTestStatus(testId, 'failed', retryCount);

        // TODO: Send notification to admin/user about failed profile generation
        return { testId, status: 'max_retries_exceeded' };
      }

      // Attempt to generate profile
      try {
        const result = await retryGeneration(testData);

        if (result) {
          await updateProfileSuccess(testId, testData.userId, testData.language, result.profile, result.goals);
          console.log(`Successfully generated profile for test ${testId}`);
          return { testId, status: 'success' };
        } else {
          // Generation failed, increment retry count
          await updateTestStatus(testId, 'pending', retryCount + 1);
          console.warn(`Retry failed for test ${testId}, will try again later`);
          return { testId, status: 'retry_failed' };
        }
      } catch (error) {
        console.error(`Error retrying test ${testId}:`, error);
        await updateTestStatus(testId, 'pending', retryCount + 1);
        return { testId, status: 'error', error };
      }
    });

    const results = await Promise.all(retryPromises);

    const summary = {
      total: results.length,
      success: results.filter(r => r.status === 'success').length,
      failed: results.filter(r => r.status === 'retry_failed').length,
      maxRetries: results.filter(r => r.status === 'max_retries_exceeded').length,
      errors: results.filter(r => r.status === 'error').length
    };

    console.log('Retry job complete:', summary);
    return summary;
  });

/**
 * Retry AI generation (tries OpenAI, then Claude)
 */
async function retryGeneration(testData: OnboardingTest): Promise<{ profile: string; goals: string[] } | null> {
  // Try OpenAI first
  try {
    const result = await generateWithOpenAI(testData);
    if (result) {
      return result;
    }
  } catch (error) {
    console.warn('OpenAI retry failed, trying Claude:', error);
  }

  // Fallback to Claude
  try {
    const result = await generateWithClaude(testData);
    if (result) {
      return result;
    }
  } catch (error) {
    console.error('Claude retry also failed:', error);
  }

  return null;
}

/**
 * Generate profile using OpenAI GPT
 */
async function generateWithOpenAI(testData: OnboardingTest): Promise<{ profile: string; goals: string[] } | null> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.error('OpenAI API key not configured');
    return null;
  }

  const openai = new OpenAI({ apiKey });
  const prompt = buildPrompt(testData);

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: 'You are a language learning expert. Analyze the user\'s test results and create a personalized learning profile. Respond in JSON format with two fields: "profile" (a 2-3 paragraph analysis) and "goals" (array of 3-5 specific learning focus areas).'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    temperature: 0.7,
    max_tokens: 800,
    response_format: { type: 'json_object' }
  });

  const responseText = completion.choices[0]?.message?.content;

  if (!responseText) {
    return null;
  }

  const parsed = JSON.parse(responseText);

  if (!parsed.profile || !parsed.goals) {
    return null;
  }

  return {
    profile: parsed.profile,
    goals: Array.isArray(parsed.goals) ? parsed.goals : []
  };
}

/**
 * Generate profile using Claude (fallback)
 */
async function generateWithClaude(testData: OnboardingTest): Promise<{ profile: string; goals: string[] } | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    console.error('Anthropic API key not configured');
    return null;
  }

  const anthropic = new Anthropic({ apiKey });
  const prompt = buildPrompt(testData);

  const message = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `You are a language learning expert. Analyze the user's test results and create a personalized learning profile.

${prompt}

Respond in JSON format with two fields:
- "profile": A 2-3 paragraph analysis of their current level and learning needs
- "goals": An array of 3-5 specific learning focus areas

Respond with ONLY the JSON object, no other text.`
      }
    ]
  });

  const responseText = message.content[0]?.type === 'text' ? message.content[0].text : null;

  if (!responseText) {
    return null;
  }

  const parsed = JSON.parse(responseText);

  if (!parsed.profile || !parsed.goals) {
    return null;
  }

  return {
    profile: parsed.profile,
    goals: Array.isArray(parsed.goals) ? parsed.goals : []
  };
}

/**
 * Build AI prompt from test data
 */
function buildPrompt(testData: OnboardingTest): string {
  const { language, questions, totalTime } = testData;

  const languageMap: Record<string, string> = {
    ko: 'Korean',
    zh: 'Chinese',
    ja: 'Japanese',
    es: 'Spanish'
  };

  const languageName = languageMap[language] || language;
  const correctCount = questions.filter(q => q.isCorrect).length;
  const totalQuestions = questions.length;
  const accuracyPercent = Math.round((correctCount / totalQuestions) * 100);

  // Group by category
  const categoryPerformance: Record<string, { correct: number; total: number }> = {};
  questions.forEach(q => {
    if (!categoryPerformance[q.category]) {
      categoryPerformance[q.category] = { correct: 0, total: 0 };
    }
    categoryPerformance[q.category].total++;
    if (q.isCorrect) {
      categoryPerformance[q.category].correct++;
    }
  });

  const categoryAnalysis = Object.entries(categoryPerformance)
    .map(([category, stats]) => {
      const percent = Math.round((stats.correct / stats.total) * 100);
      return `  - ${category}: ${stats.correct}/${stats.total} (${percent}%)`;
    })
    .join('\n');

  const foundationQuestions = questions.filter(q => q.difficulty === 'foundation');
  const foundationCorrect = foundationQuestions.filter(q => q.isCorrect).length;
  const avgTimePerQuestion = Math.round(totalTime / totalQuestions);

  return `Language: ${languageName}

Test Results:
- Overall Accuracy: ${correctCount}/${totalQuestions} (${accuracyPercent}%)
- Foundation Questions: ${foundationCorrect}/${foundationQuestions.length} correct
- Total Time: ${Math.round(totalTime / 60)} minutes (avg ${avgTimePerQuestion}s per question)

Performance by Category:
${categoryAnalysis}

Question Details:
${questions.map((q, i) => {
  return `${i + 1}. [${q.difficulty}] ${q.category}
   Question: ${q.questionText}
   User Answer: ${q.userAnswer}
   Correct Answer: ${typeof q.correctAnswer === 'string' ? q.correctAnswer : q.correctAnswer.join(', ')}
   Result: ${q.isCorrect ? '✓ Correct' : '✗ Incorrect'}
   Time: ${q.timeSpent}s`;
}).join('\n\n')}

Based on this ${languageName} proficiency test, create a personalized learning profile that:
1. Assesses their current proficiency level (beginner, elementary, intermediate, advanced)
2. Identifies their strengths and areas for improvement
3. Provides 3-5 specific, actionable learning goals
4. Is encouraging and motivational

The profile should be 2-3 paragraphs, written in second person (you/your), and focus on practical next steps.`;
}

/**
 * Update test document with successful profile
 */
async function updateProfileSuccess(
  testId: string,
  userId: string,
  language: string,
  profile: string,
  goals: string[]
): Promise<void> {
  const batch = db.batch();

  // Update test document
  const testRef = db.collection('onboardingTests').doc(testId);
  batch.update(testRef, {
    profileStatus: 'completed',
    aiProfile: profile,
    goals: goals,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  // Update user profile
  const userRef = db.collection('users').doc(userId);
  const userDoc = await userRef.get();

  if (!userDoc.exists) {
    console.error('User not found:', userId);
    throw new Error('User not found');
  }

  const userData = userDoc.data();
  const languages = userData?.languages || [];

  const updatedLanguages = languages.map((lang: any) => {
    if (lang.languageCode === language) {
      return {
        ...lang,
        currentProfile: profile,
        goals: goals,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp()
      };
    }
    return lang;
  });

  batch.update(userRef, {
    languages: updatedLanguages,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  await batch.commit();
}

/**
 * Update test status (for failures or retries)
 */
async function updateTestStatus(
  testId: string,
  status: 'pending' | 'failed',
  retryCount: number
): Promise<void> {
  await db.collection('onboardingTests').doc(testId).update({
    profileStatus: status,
    retryCount: retryCount,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });
}
