/**
 * generateProfile - Callable Firebase Function
 *
 * Purpose:
 * - Called directly from client after test completion
 * - Can be re-invoked from "Regenerate Profile" button
 * - Calls OpenAI GPT API to generate personalized learning profile
 * - Falls back to Claude if GPT fails
 * - Updates test document with profile and goals
 *
 * Security:
 * - Authenticated users only (context.auth required)
 * - Users can only generate profiles for their own tests
 * - API keys stored securely in environment variables
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

const db = admin.firestore();

/**
 * Callable function - invoked directly from client
 */
export const generateProfile = functions.https.onCall(async (data, context) => {
  // Security: Require authentication
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'User must be authenticated to generate profile'
    );
  }

  const { testId } = data;
  const userId = context.auth.uid;

  if (!testId) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'testId is required'
    );
  }

  console.log('='.repeat(80));
  console.log('generateProfile - START');
  console.log('generateProfile - testId:', testId);
  console.log('generateProfile - userId:', userId);

  try {
    // Fetch test document
    const testDoc = await db.collection('onboardingTests').doc(testId).get();

    if (!testDoc.exists) {
      console.error('generateProfile - Test document not found:', testId);
      throw new functions.https.HttpsError(
        'not-found',
        'Test document not found'
      );
    }

    const testData = testDoc.data();

    // Security: Verify test belongs to requesting user
    if (testData?.userId !== userId) {
      console.error('generateProfile - Unauthorized access attempt:', {
        testUserId: testData?.userId,
        requestUserId: userId
      });
      throw new functions.https.HttpsError(
        'permission-denied',
        'You can only generate profiles for your own tests'
      );
    }

    console.log('generateProfile - Test data:', {
      language: testData.language,
      questionCount: testData.questions?.length,
      profileStatus: testData.profileStatus
    });

    // Check if already completed
    if (testData.profileStatus === 'completed' && testData.aiProfile) {
      console.log('generateProfile - Profile already exists, returning existing');
      return {
        success: true,
        profile: testData.aiProfile,
        goals: testData.goals || [],
        proficiencyLevel: testData.proficiencyLevel || 'Beginner'
      };
    }

    // Update status to 'pending' to prevent duplicate calls
    await db.collection('onboardingTests').doc(testId).update({
      profileStatus: 'pending',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Attempt to generate profile with OpenAI
    console.log('generateProfile - Attempting OpenAI generation...');
    let result = await generateWithOpenAI(testData);

    // Fallback to Claude if OpenAI fails
    if (!result) {
      console.log('generateProfile - OpenAI failed, trying Claude...');
      result = await generateWithClaude(testData);
    }

    if (!result) {
      console.error('generateProfile - Both AI services failed');
      await db.collection('onboardingTests').doc(testId).update({
        profileStatus: 'failed',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      throw new functions.https.HttpsError(
        'internal',
        'Failed to generate profile. Please try again.'
      );
    }

    // Update test document with generated profile
    await updateProfileSuccess(testId, userId, testData.language, result.profile, result.goals, result.proficiencyLevel);

    console.log('generateProfile - SUCCESS');
    console.log('='.repeat(80));

    return {
      success: true,
      profile: result.profile,
      goals: result.goals,
      proficiencyLevel: result.proficiencyLevel
    };

  } catch (error: any) {
    console.error('generateProfile - ERROR:', error);

    // Update status to failed
    try {
      await db.collection('onboardingTests').doc(testId).update({
        profileStatus: 'failed',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    } catch (updateError) {
      console.error('generateProfile - Failed to update status:', updateError);
    }

    // Re-throw HttpsError as-is, wrap other errors
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    throw new functions.https.HttpsError(
      'internal',
      'Failed to generate profile',
      error.message
    );
  }
});

/**
 * Generate profile using OpenAI GPT-4o
 */
async function generateWithOpenAI(testData: any): Promise<{ profile: string; goals: string[]; proficiencyLevel: string } | null> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.error('OpenAI API key not configured');
    return null;
  }

  try {
    const openai = new OpenAI({ apiKey });
    const prompt = buildPrompt(testData);

    console.log('='.repeat(80));
    console.log('AI PROMPT (OpenAI GPT-4o):');
    console.log('='.repeat(80));
    console.log(prompt);
    console.log('='.repeat(80));

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a language learning expert. Analyze the user\'s test results and create a personalized learning profile. Respond in JSON format with three fields: "profile" (a 2-3 paragraph analysis), "goals" (array of 3-5 specific learning focus areas), and "proficiencyLevel" (one of: "Beginner", "Elementary", "Intermediate", "Advanced").'
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

    console.log('='.repeat(80));
    console.log('AI RESPONSE (OpenAI GPT-4o):');
    console.log('='.repeat(80));
    console.log(responseText);
    console.log('='.repeat(80));

    if (!responseText) {
      return null;
    }

    const parsed = JSON.parse(responseText);

    if (!parsed.profile || !parsed.goals || !parsed.proficiencyLevel) {
      console.error('Invalid response format from OpenAI:', parsed);
      return null;
    }

    return {
      profile: parsed.profile,
      goals: Array.isArray(parsed.goals) ? parsed.goals : [],
      proficiencyLevel: parsed.proficiencyLevel
    };
  } catch (error) {
    console.error('OpenAI generation error:', error);
    return null;
  }
}

/**
 * Generate profile using Claude 3.5 Sonnet (fallback)
 */
async function generateWithClaude(testData: any): Promise<{ profile: string; goals: string[]; proficiencyLevel: string } | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    console.error('Anthropic API key not configured');
    return null;
  }

  try {
    const anthropic = new Anthropic({ apiKey });
    const prompt = buildPrompt(testData);

    console.log('='.repeat(80));
    console.log('AI PROMPT (Claude 3.5 Sonnet):');
    console.log('='.repeat(80));
    console.log(prompt);
    console.log('='.repeat(80));

    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `You are a language learning expert. Analyze the user's test results and create a personalized learning profile.

${prompt}

Respond in JSON format with three fields:
- "profile": A 2-3 paragraph analysis of their current level and learning needs
- "goals": An array of 3-5 specific learning focus areas
- "proficiencyLevel": One of: "Beginner", "Elementary", "Intermediate", "Advanced"

Respond with ONLY the JSON object, no other text.`
        }
      ]
    });

    const responseText = message.content[0]?.type === 'text' ? message.content[0].text : null;

    console.log('='.repeat(80));
    console.log('AI RESPONSE (Claude 3.5 Sonnet):');
    console.log('='.repeat(80));
    console.log(responseText);
    console.log('='.repeat(80));

    if (!responseText) {
      return null;
    }

    const parsed = JSON.parse(responseText);

    if (!parsed.profile || !parsed.goals || !parsed.proficiencyLevel) {
      console.error('Invalid response format from Claude:', parsed);
      return null;
    }

    return {
      profile: parsed.profile,
      goals: Array.isArray(parsed.goals) ? parsed.goals : [],
      proficiencyLevel: parsed.proficiencyLevel
    };
  } catch (error) {
    console.error('Claude generation error:', error);
    return null;
  }
}

/**
 * Build AI prompt from test data
 */
function buildPrompt(testData: any): string {
  const { language, questions, totalTimeElapsed } = testData;

  const languageMap: Record<string, string> = {
    ko: 'Korean',
    zh: 'Chinese',
    ja: 'Japanese',
    es: 'Spanish'
  };

  const languageName = languageMap[language] || language;
  const correctCount = questions.filter((q: any) => q.isCorrect).length;
  const totalQuestions = questions.length;
  const accuracyPercent = Math.round((correctCount / totalQuestions) * 100);

  const avgTimePerQuestion = Math.round(totalTimeElapsed / totalQuestions);

  return `Language: ${languageName}

Test Results:
- Overall Accuracy: ${correctCount}/${totalQuestions} (${accuracyPercent}%)
- Total Time: ${Math.round(totalTimeElapsed / 60)} minutes (avg ${avgTimePerQuestion}s per question)

Question Details:
${questions.map((q: any, i: number) => {
  return `${i + 1}. ${q.questionType}
   Question: ${q.questionText}
   User Answer: ${Array.isArray(q.userAnswer) ? q.userAnswer.join(', ') : q.userAnswer}
   Correct Answer: ${Array.isArray(q.correctAnswer) ? q.correctAnswer.join(', ') : q.correctAnswer}
   Result: ${q.isCorrect ? '✓ Correct' : '✗ Incorrect'}
   Time: ${q.timeElapsed}s`;
}).join('\n\n')}

Based on this ${languageName} proficiency test, create a personalized learning profile that:
1. Assesses their current proficiency level (beginner, elementary, intermediate, advanced)
2. Identifies their strengths and areas for improvement
3. Provides 3-5 specific, actionable learning goals
4. Is encouraging and motivational

The profile should be 2-3 paragraphs, written in second person (you/your), and focus on practical next steps.`;
}

/**
 * Update test document and user profile with generated profile
 *
 * Note: Profile is stored ONLY in user.languages.currentProfile (not in test document)
 * This ensures DRY principle and single source of truth
 */
async function updateProfileSuccess(
  testId: string,
  userId: string,
  language: string,
  profile: string,
  goals: string[],
  proficiencyLevel: string
): Promise<void> {
  const batch = db.batch();

  // Update test document - store only metadata, NOT the full profile
  const testRef = db.collection('onboardingTests').doc(testId);
  batch.update(testRef, {
    profileStatus: 'completed',
    proficiencyLevel: proficiencyLevel, // Store only proficiency level in test
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  // Update user profile - this is the ONLY place where full profile is stored
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
        currentProfile: profile, // Full profile stored here only
        goals: goals,
        proficiencyLevel: proficiencyLevel, // From AI JSON response, not extracted
        lastUpdated: admin.firestore.Timestamp.now()
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
