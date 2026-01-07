/**
 * generateOnboardingProfile - Firebase Function
 *
 * Purpose:
 * - Triggered when a new onboardingTest document is created
 * - Calls OpenAI GPT API to generate personalized learning profile
 * - Falls back to Claude if GPT fails
 * - Updates test document with profile and goals
 *
 * Security:
 * - Runs with admin privileges
 * - Validates userId exists
 * - API keys stored in Firebase config (not client-accessible)
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

const db = admin.firestore();

interface TestQuestion {
  questionId: string;
  questionText: string;
  userAnswer: string;
  correctAnswer: string | string[];
  isCorrect: boolean;
  timeSpent: number; // seconds
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
  aiProfile?: string;
  goals?: string[];
}

/**
 * Firestore onCreate trigger for onboardingTests collection
 */
export const generateOnboardingProfile = functions.firestore
  .document('onboardingTests/{testId}')
  .onCreate(async (snapshot, context) => {
    const testId = context.params.testId;
    const testData = snapshot.data() as OnboardingTest;

    // Validate test data
    if (!testData.userId || !testData.language || !testData.questions) {
      console.error('Invalid test data:', { testId, testData });
      await updateTestStatus(testId, 'failed');
      return;
    }

    // Only generate if status is 'pending'
    if (testData.profileStatus !== 'pending') {
      console.log('Test already processed or not pending:', { testId, status: testData.profileStatus });
      return;
    }

    console.log('Generating profile for test:', { testId, userId: testData.userId, language: testData.language });

    try {
      // Attempt OpenAI GPT generation
      const result = await generateWithOpenAI(testData);

      if (result) {
        // Success - update Firestore
        await updateProfileSuccess(testId, testData.userId, testData.language, result.profile, result.goals);
        console.log('Profile generated successfully with OpenAI:', { testId });
        return;
      }
    } catch (error) {
      console.warn('OpenAI generation failed, trying Claude fallback:', error);
    }

    try {
      // Fallback to Claude
      const result = await generateWithClaude(testData);

      if (result) {
        // Success - update Firestore
        await updateProfileSuccess(testId, testData.userId, testData.language, result.profile, result.goals);
        console.log('Profile generated successfully with Claude:', { testId });
        return;
      }
    } catch (error) {
      console.error('Both AI services failed:', error);
    }

    // Both failed - mark for retry
    await updateTestStatus(testId, 'pending', (testData.retryCount || 0) + 1);
    console.error('Profile generation failed, marked for retry:', { testId, retryCount: (testData.retryCount || 0) + 1 });
  });

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

  // Log the full prompt for debugging
  console.log('='.repeat(80));
  console.log('AI PROMPT (OpenAI GPT-4o):');
  console.log('='.repeat(80));
  console.log(prompt);
  console.log('='.repeat(80));

  try {
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
      console.error('Empty response from OpenAI');
      return null;
    }

    // Log the AI response for debugging
    console.log('='.repeat(80));
    console.log('AI RESPONSE (OpenAI GPT-4o):');
    console.log('='.repeat(80));
    console.log(responseText);
    console.log('='.repeat(80));

    const parsed = JSON.parse(responseText);

    if (!parsed.profile || !parsed.goals) {
      console.error('Invalid response format from OpenAI:', parsed);
      return null;
    }

    return {
      profile: parsed.profile,
      goals: Array.isArray(parsed.goals) ? parsed.goals : []
    };
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw error;
  }
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

  // Log the full prompt for debugging
  console.log('='.repeat(80));
  console.log('AI PROMPT (Claude 3.5 Sonnet):');
  console.log('='.repeat(80));
  console.log(prompt);
  console.log('='.repeat(80));

  try {
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
      console.error('Empty response from Claude');
      return null;
    }

    // Log the AI response for debugging
    console.log('='.repeat(80));
    console.log('AI RESPONSE (Claude 3.5 Sonnet):');
    console.log('='.repeat(80));
    console.log(responseText);
    console.log('='.repeat(80));

    const parsed = JSON.parse(responseText);

    if (!parsed.profile || !parsed.goals) {
      console.error('Invalid response format from Claude:', parsed);
      return null;
    }

    return {
      profile: parsed.profile,
      goals: Array.isArray(parsed.goals) ? parsed.goals : []
    };
  } catch (error) {
    console.error('Claude API error:', error);
    throw error;
  }
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

  // Foundation questions analysis
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

  // Find the language entry and update it
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
  retryCount?: number
): Promise<void> {
  const updateData: any = {
    profileStatus: status,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  };

  if (retryCount !== undefined) {
    updateData.retryCount = retryCount;
  }

  await db.collection('onboardingTests').doc(testId).update(updateData);
}
