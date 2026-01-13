"""
Korean Tokenization using KoNLPy
Splits Korean lyrics into morphemes with POS (Part-of-Speech) tags
"""

import logging
from typing import List, Dict

logger = logging.getLogger(__name__)

# Initialize tokenizer (global to reuse across invocations)
# KoNLPy Okt is better for informal/casual text (songs use slang)
try:
    from konlpy.tag import Okt
    okt = Okt()
    logger.info("KoNLPy Okt tokenizer initialized successfully")
except ImportError as e:
    logger.error(f"Failed to import KoNLPy: {str(e)}")
    okt = None


def tokenize_korean(lyrics: str) -> List[Dict]:
    """
    Tokenize Korean lyrics into morphemes with POS tags

    Args:
        lyrics: Korean lyrics text (with newlines)

    Returns:
        List of tokens with morpheme, POS tag, and position info
        Example: [
            {"morpheme": "나", "pos": "pronoun", "posTag": "Pronoun", "lineIndex": 0, "charOffset": 0},
            {"morpheme": "를", "pos": "particle", "posTag": "Josa", "lineIndex": 0, "charOffset": 1},
            ...
        ]

    Raises:
        RuntimeError: If KoNLPy is not available
        Exception: If tokenization fails
    """
    if okt is None:
        raise RuntimeError("KoNLPy Okt tokenizer not available")

    try:
        # Split lyrics into lines
        lines = lyrics.strip().split('\n')
        logger.info(f"Tokenizing {len(lines)} lines")

        all_tokens = []
        char_offset = 0

        for line_idx, line in enumerate(lines):
            line = line.strip()
            if not line:
                char_offset += 1  # Account for newline
                continue

            # Tokenize with POS tags
            # pos() returns list of tuples: [("나", "Pronoun"), ("를", "Josa"), ...]
            # stem=False: Don't stem verbs (keep original form)
            # norm=False: Don't normalize (keep original spelling)
            morphs = okt.pos(line, stem=False, norm=False)

            # Convert to structured format
            for morph, pos_tag in morphs:
                token = {
                    'morpheme': morph,
                    'pos': map_pos_to_readable(pos_tag),
                    'posTag': pos_tag,  # Original KoNLPy tag for grammar analysis
                    'lineIndex': line_idx,
                    'charOffset': char_offset
                }
                all_tokens.append(token)
                char_offset += len(morph)

            char_offset += 1  # Account for newline

        logger.info(f"Tokenization complete: {len(lines)} lines → {len(all_tokens)} tokens")
        return all_tokens

    except Exception as e:
        logger.error(f"Tokenization error: {str(e)}", exc_info=True)
        raise


def map_pos_to_readable(pos_tag: str) -> str:
    """
    Map KoNLPy POS tags to human-readable names

    KoNLPy (Okt) POS tags:
    - Noun: 명사 (noun)
    - Verb: 동사 (verb)
    - Adjective: 형용사 (adjective)
    - Adverb: 부사 (adverb)
    - Josa: 조사 (particle)
    - Eomi: 어미 (verb ending)
    - Pronoun: 대명사 (pronoun)
    - Determiner: 관형사 (determiner)
    - Number: 수사 (number)
    - Punctuation: 구두점 (punctuation)
    - Foreign: 외국어 (foreign word)
    - Alpha: 알파벳 (alphabet)
    - Unknown: 미상 (unknown)

    Args:
        pos_tag: KoNLPy POS tag (e.g., "Noun", "Josa")

    Returns:
        Human-readable POS name (e.g., "noun", "particle")
    """
    pos_map = {
        'Noun': 'noun',
        'Verb': 'verb',
        'Adjective': 'adjective',
        'Adverb': 'adverb',
        'Josa': 'particle',
        'Eomi': 'ending',
        'Pronoun': 'pronoun',
        'Determiner': 'determiner',
        'Number': 'number',
        'Punctuation': 'punctuation',
        'Foreign': 'foreign',
        'Alpha': 'alphabet',
        'Unknown': 'unknown',
        'Conjunction': 'conjunction',
        'Exclamation': 'exclamation',
        'KoreanParticle': 'particle',  # Alternative tag
        'Suffix': 'suffix',
        'PreEomi': 'pre-ending',
    }

    readable = pos_map.get(pos_tag, pos_tag.lower())
    return readable


def get_line_tokens(tokens: List[Dict], line_index: int) -> List[Dict]:
    """
    Get all tokens for a specific line

    Args:
        tokens: List of all tokens
        line_index: Line number (0-indexed)

    Returns:
        List of tokens from that line only
    """
    return [token for token in tokens if token['lineIndex'] == line_index]


def group_tokens_by_line(tokens: List[Dict]) -> Dict[int, List[Dict]]:
    """
    Group tokens by line index

    Args:
        tokens: List of all tokens

    Returns:
        Dict mapping line index to list of tokens
        Example: {0: [token1, token2], 1: [token3, token4], ...}
    """
    by_line = {}
    for token in tokens:
        line_idx = token['lineIndex']
        if line_idx not in by_line:
            by_line[line_idx] = []
        by_line[line_idx].append(token)
    return by_line


def filter_tokens_by_pos(tokens: List[Dict], pos_types: List[str]) -> List[Dict]:
    """
    Filter tokens by POS tag

    Args:
        tokens: List of tokens
        pos_types: List of POS tags to keep (e.g., ['Noun', 'Verb'])

    Returns:
        Filtered list of tokens
    """
    return [token for token in tokens if token['posTag'] in pos_types]


# Test function for development
def test_tokenizer():
    """Test tokenizer with sample Korean lyrics"""
    sample_lyrics = """나를 그냥 짓밟고 가
괜찮아 돌아보지 마
내가 아파봤자 너만 하겠니"""

    print("Testing Korean Tokenizer")
    print("=" * 50)
    print("Input lyrics:")
    print(sample_lyrics)
    print("=" * 50)

    try:
        tokens = tokenize_korean(sample_lyrics)
        print(f"\nTokenized into {len(tokens)} morphemes:")
        print()

        # Group by line for display
        by_line = group_tokens_by_line(tokens)

        for line_idx in sorted(by_line.keys()):
            line_tokens = by_line[line_idx]
            print(f"Line {line_idx}:")
            for token in line_tokens:
                print(f"  {token['morpheme']:10s} | {token['pos']:12s} | {token['posTag']}")
            print()

    except Exception as e:
        print(f"Error: {str(e)}")


if __name__ == '__main__':
    # Run test if executed directly
    test_tokenizer()
