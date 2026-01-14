/**
 * Firebase Function trigger for lyrics analysis
 * 
 * Lightweight trigger that calls Cloud Run service
 * This runs when a song is added to Firestore
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import axios from 'axios';

const CLOUD_RUN_URL = functions.config().analyze_lyrics?.cloud_run_url || '';

export const analyzeLyricsTrigger = functions.firestore
  .document('songs/{songId}')
  .onCreate(async (snapshot, context) => {
    const songId = context.params.songId;
    const songData = snapshot.data();

    try {
      functions.logger.info(`🎵 Triggering analysis for song ${songId}`);

      // Validate required fields
      if (!songData.lyrics) {
        functions.logger.error(`No lyrics found for song ${songId}`);
        await saveError(songId, 'No lyrics found', false);
        return;
      }

      if (songData.language !== 'ko') {
        functions.logger.warn(`Song ${songId} is not Korean (language: ${songData.language}), skipping`);
        await saveError(songId, `Language ${songData.language} not supported yet`, false);
        return;
      }

      // Check if already analyzed
      const vocabRef = admin.firestore()
        .collection('songs')
        .doc(songId)
        .collection('analysis')
        .doc('vocabulary');
      
      const vocabDoc = await vocabRef.get();
      if (vocabDoc.exists) {
        functions.logger.info(`Song ${songId} already analyzed, skipping`);
        return;
      }

      // Call Cloud Run service
      if (!CLOUD_RUN_URL) {
        throw new Error('ANALYZE_LYRICS_CLOUD_RUN_URL environment variable not set');
      }

      functions.logger.info(`Calling Cloud Run at ${CLOUD_RUN_URL}`);

      const response = await axios.post(
        `${CLOUD_RUN_URL}/analyze`,
        {
          songId: songId,
          lyrics: songData.lyrics,
          language: songData.language,
        },
        {
          timeout: 300000, // 5 minutes
        }
      );

      functions.logger.info(`✅ Analysis complete for song ${songId}:`, response.data);

    } catch (error: any) {
      functions.logger.error(`❌ Analysis failed for song ${songId}:`, error);
      
      // Save error to Firestore
      await saveError(songId, error.message || 'Unknown error', true);
      
      // Don't throw - we don't want the function to retry automatically
      // as that could cause duplicate analysis attempts
    }
  });

async function saveError(songId: string, errorMessage: string, retryable: boolean): Promise<void> {
  try {
    await admin.firestore()
      .collection('songs')
      .doc(songId)
      .collection('analysis')
      .doc('error')
      .set({
        error: errorMessage,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        retryable: retryable,
      });
  } catch (err) {
    functions.logger.error(`Failed to save error for ${songId}:`, err);
  }
}
