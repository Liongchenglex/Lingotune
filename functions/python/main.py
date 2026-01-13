"""
analyzeLyrics Cloud Function
Analyzes Korean song lyrics for vocabulary, grammar, and pronunciation
"""

import os
import logging
from typing import Dict, Any
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Firebase imports
from firebase_admin import initialize_app, firestore, credentials
from firebase_functions import firestore_fn, options

# Initialize Firebase Admin (only once)
try:
    initialize_app()
except ValueError:
    # Already initialized
    pass

# Get Firestore client
db = firestore.client()

# Import analysis modules
from tokenizer import tokenize_korean
from vocabulary import extract_vocabulary
from grammar import analyze_grammar
from pronunciation import generate_pronunciation


@firestore_fn.on_document_created(
    document="songs/{song_id}",
    timeout_sec=300,  # 5 minutes max
    memory=options.MemoryOption.MB_1GB  # Need more memory for KoNLPy
)
def analyze_lyrics(event: firestore_fn.Event[firestore_fn.DocumentSnapshot]) -> None:
    """
    Triggered when a new song is created in /songs/{songId}
    Analyzes lyrics and saves results to /songs/{songId}/analysis subcollection

    Pipeline:
    1. Tokenization (KoNLPy Okt) - ~1s
    2. Vocabulary Extraction - ~2s
    3. Grammar Analysis - ~2s
    4. Pronunciation Generation - ~1s
    Total: ~6s for complete analysis
    """
    song_id = event.params["song_id"]

    try:
        song_data = event.data.to_dict()
        logger.info(f"🎵 Starting analysis for song {song_id}: {song_data.get('title', 'Unknown')}")

        # Check if already analyzed
        vocab_ref = db.collection('songs').document(song_id).collection('analysis').document('vocabulary')
        if vocab_ref.get().exists:
            logger.info(f"Song {song_id} already analyzed, skipping")
            return

        # Extract required data
        lyrics = song_data.get('lyrics', '')
        language = song_data.get('language', 'ko')

        # Validation
        if not lyrics:
            logger.error(f"No lyrics found for song {song_id}")
            save_error(song_id, "No lyrics found", retryable=False)
            return

        if language != 'ko':
            logger.warning(f"Song {song_id} is not Korean (language: {language}), skipping")
            save_error(song_id, f"Language {language} not supported yet", retryable=False)
            return

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

        logger.info(f"🎉 Analysis complete for song {song_id}")

    except Exception as e:
        logger.error(f"❌ Analysis failed for song {song_id}: {str(e)}", exc_info=True)
        save_error(song_id, str(e), retryable=True)
        raise


def save_tokenization(song_id: str, tokens: list) -> None:
    """Save tokenization results to Firestore"""
    try:
        db.collection('songs').document(song_id).collection('analysis').document('tokenization').set({
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
        db.collection('songs').document(song_id).collection('analysis').document('vocabulary').set({
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
        db.collection('songs').document(song_id).collection('analysis').document('grammar').set({
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
        db.collection('songs').document(song_id).collection('analysis').document('pronunciation').set({
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
        db.collection('songs').document(song_id).collection('analysis').document('error').set({
            'error': error_message,
            'timestamp': firestore.SERVER_TIMESTAMP,
            'retryable': retryable
        })
        logger.info(f"Saved error state for {song_id}")
    except Exception as e:
        logger.error(f"Failed to save error for {song_id}: {str(e)}")
