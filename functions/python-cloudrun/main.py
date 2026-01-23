"""
Cloud Run service for Korean lyrics analysis
Receives HTTP requests from Firebase Function trigger
"""

import os
import logging
from flask import Flask, request, jsonify
from firebase_admin import initialize_app, firestore

# Import analysis modules
from tokenizer import tokenize_korean
from vocabulary import extract_vocabulary
from grammar import analyze_grammar
from pronunciation import generate_pronunciation

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Firebase Admin
try:
    initialize_app()
except ValueError:
    pass

# Initialize Flask app
app = Flask(__name__)

# Firestore client
db = None

def _get_db():
    """Lazy initialize Firestore client"""
    global db
    if db is None:
        db = firestore.client()
    return db


@app.route('/analyze', methods=['POST'])
def analyze_lyrics_endpoint():
    """
    HTTP endpoint for lyrics analysis

    Expected JSON body:
    {
        "songId": "...",
        "lyrics": "...",
        "language": "ko"
    }
    """
    # Security: Limit input size to prevent resource exhaustion
    MAX_LYRICS_LENGTH = 50000  # ~50KB, enough for longest songs
    MAX_SONG_ID_LENGTH = 100    # Reasonable limit for song IDs

    try:
        # Get request data
        data = request.get_json()

        if not data:
            return jsonify({'error': 'No JSON data provided'}), 400

        song_id = data.get('songId')
        lyrics = data.get('lyrics')
        language = data.get('language', 'ko')

        # Validation
        if not song_id:
            return jsonify({'error': 'songId is required'}), 400

        if not lyrics:
            return jsonify({'error': 'lyrics is required'}), 400

        if language != 'ko':
            return jsonify({'error': f'Language {language} not supported yet'}), 400

        # Security: Input size validation
        if len(song_id) > MAX_SONG_ID_LENGTH:
            logger.warning(f"Song ID too long: {len(song_id)} characters")
            return jsonify({'error': 'Invalid song ID'}), 400

        if len(lyrics) > MAX_LYRICS_LENGTH:
            logger.warning(f"Lyrics too long: {len(lyrics)} characters (max {MAX_LYRICS_LENGTH})")
            return jsonify({'error': f'Lyrics too long (maximum {MAX_LYRICS_LENGTH} characters)'}), 400

        logger.info(f"🎵 Starting analysis for song {song_id}")

        # Run analysis pipeline
        result = analyze_lyrics(song_id, lyrics, language)

        logger.info(f"🎉 Analysis complete for song {song_id}")

        return jsonify({
            'success': True,
            'songId': song_id,
            'result': result
        }), 200

    except Exception as e:
        logger.error(f"❌ Analysis error: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


def analyze_lyrics(song_id: str, lyrics: str, language: str) -> dict:
    """
    Main analysis pipeline
    Returns dict with analysis results
    """
    try:
        # Step 1: Tokenization
        logger.info(f"[1/4] Tokenizing lyrics for {song_id}...")
        tokens = tokenize_korean(lyrics)
        save_tokenization(song_id, tokens)
        logger.info(f"✅ Tokenization complete: {len(tokens)} tokens")

        # Step 2: Vocabulary Extraction
        logger.info(f"[2/4] Extracting vocabulary for {song_id}...")
        vocabulary = extract_vocabulary(tokens, lyrics)
        save_vocabulary(song_id, vocabulary)
        logger.info(f"✅ Vocabulary complete: {len(vocabulary)} unique words")

        # Step 3: Grammar Analysis
        logger.info(f"[3/4] Analyzing grammar for {song_id}...")
        grammar = analyze_grammar(tokens, lyrics)
        save_grammar(song_id, grammar)
        logger.info(f"✅ Grammar complete: {len(grammar)} patterns")

        # Step 4: Pronunciation
        logger.info(f"[4/4] Generating pronunciation for {song_id}...")
        pronunciation = generate_pronunciation(lyrics)
        save_pronunciation(song_id, pronunciation)
        logger.info(f"✅ Pronunciation complete")

        # Step 5: Delete lyrics from song document (copyright protection)
        logger.info(f"[5/5] Removing lyrics from storage (copyright protection)...")
        delete_lyrics(song_id)
        logger.info(f"✅ Lyrics removed from storage")

        return {
            'tokenCount': len(tokens),
            'vocabularyCount': len(vocabulary),
            'grammarPatternCount': len(grammar),
            'status': 'completed'
        }

    except Exception as e:
        logger.error(f"❌ Analysis failed for song {song_id}: {str(e)}", exc_info=True)
        save_error(song_id, str(e), retryable=True)
        raise


def save_tokenization(song_id: str, tokens: list) -> None:
    """Save tokenization results to Firestore"""
    try:
        _get_db().collection('songs').document(song_id).collection('analysis').document('tokenization').set({
            'tokens': tokens,
            'totalTokens': len(tokens),
            'processedAt': firestore.SERVER_TIMESTAMP
        })
        logger.info(f"Saved tokenization for {song_id}")
    except Exception as e:
        logger.error(f"Failed to save tokenization for {song_id}: {str(e)}")
        raise


def save_vocabulary(song_id: str, vocabulary: list) -> None:
    """Save vocabulary to Firestore"""
    try:
        _get_db().collection('songs').document(song_id).collection('analysis').document('vocabulary').set({
            'words': vocabulary,
            'totalWords': len(vocabulary),
            'processedAt': firestore.SERVER_TIMESTAMP
        })
        logger.info(f"Saved vocabulary for {song_id}")
    except Exception as e:
        logger.error(f"Failed to save vocabulary for {song_id}: {str(e)}")
        raise


def save_grammar(song_id: str, grammar: list) -> None:
    """Save grammar patterns to Firestore"""
    try:
        _get_db().collection('songs').document(song_id).collection('analysis').document('grammar').set({
            'patterns': grammar,
            'totalPatterns': len(grammar),
            'processedAt': firestore.SERVER_TIMESTAMP
        })
        logger.info(f"Saved grammar for {song_id}")
    except Exception as e:
        logger.error(f"Failed to save grammar for {song_id}: {str(e)}")
        raise


def save_pronunciation(song_id: str, pronunciation: dict) -> None:
    """Save pronunciation to Firestore"""
    try:
        _get_db().collection('songs').document(song_id).collection('analysis').document('pronunciation').set({
            **pronunciation,
            'processedAt': firestore.SERVER_TIMESTAMP
        })
        logger.info(f"Saved pronunciation for {song_id}")
    except Exception as e:
        logger.error(f"Failed to save pronunciation for {song_id}: {str(e)}")
        raise


def save_error(song_id: str, error_message: str, retryable: bool) -> None:
    """Save error state to Firestore"""
    try:
        _get_db().collection('songs').document(song_id).collection('analysis').document('error').set({
            'error': error_message,
            'timestamp': firestore.SERVER_TIMESTAMP,
            'retryable': retryable
        })
        logger.info(f"Saved error state for {song_id}")
    except Exception as e:
        logger.error(f"Failed to save error for {song_id}: {str(e)}")


def delete_lyrics(song_id: str) -> None:
    """
    Delete lyrics field from song document (copyright protection)
    """
    try:
        _get_db().collection('songs').document(song_id).update({
            'lyrics': firestore.DELETE_FIELD
        })
        logger.info(f"Deleted lyrics field for {song_id}")
    except Exception as e:
        logger.error(f"Failed to delete lyrics for {song_id}: {str(e)}")
        # Don't raise - analysis is complete, this is just cleanup


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'healthy'}), 200


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    app.run(host='0.0.0.0', port=port)
