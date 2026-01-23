"""
Pronunciation Generation
Romanization of Korean text using Revised Romanization of Korean
"""

import logging
import re
from typing import Dict, List

logger = logging.getLogger(__name__)

# Korean Hangul character ranges
HANGUL_START = 0xAC00
HANGUL_END = 0xD7A3

# Jamo (Korean alphabet components)
CHOSEONG = [
    'g', 'kk', 'n', 'd', 'tt', 'r', 'm', 'b', 'pp',
    's', 'ss', '', 'j', 'jj', 'ch', 'k', 't', 'p', 'h'
]

JUNGSEONG = [
    'a', 'ae', 'ya', 'yae', 'eo', 'e', 'yeo', 'ye', 'o', 'wa',
    'wae', 'oe', 'yo', 'u', 'wo', 'we', 'wi', 'yu', 'eu', 'ui', 'i'
]

JONGSEONG = [
    '', 'g', 'kk', 'gs', 'n', 'nj', 'nh', 'd', 'l', 'lg',
    'lm', 'lb', 'ls', 'lt', 'lp', 'lh', 'm', 'b', 'bs',
    's', 'ss', 'ng', 'j', 'ch', 'k', 't', 'p', 'h'
]


def generate_pronunciation(lyrics: str) -> Dict:
    """
    Generate romanization for Korean lyrics

    Args:
        lyrics: Korean lyrics text (with newlines)

    Returns:
        Dict with full romanization and line-by-line breakdown
        Example: {
            "fullRomanization": "nareul geunyang jitbapgo ga / gwaenchana doraboji ma",
            "lineByLine": [
                {"original": "나를 그냥 짓밟고 가", "romanization": "nareul geunyang jitbapgo ga"},
                {"original": "괜찮아 돌아보지 마", "romanization": "gwaenchana doraboji ma"}
            ]
        }
    """
    logger.info("Starting pronunciation generation")

    lines = lyrics.strip().split('\n')
    line_by_line = []
    full_romanization = []

    for line in lines:
        line = line.strip()
        if not line:
            continue

        # Romanize line
        romanized = romanize_korean(line)

        line_by_line.append({
            'original': line,
            'romanization': romanized
        })
        full_romanization.append(romanized)

    result = {
        'fullRomanization': ' / '.join(full_romanization),
        'lineByLine': line_by_line
    }

    logger.info(f"Pronunciation generation complete: {len(line_by_line)} lines")
    return result


def romanize_korean(text: str) -> str:
    """
    Romanize Korean text using Revised Romanization of Korean

    This is a simplified implementation of the official Revised Romanization system.
    For production, consider using a library like `hangul-romanize` or `korean-romanizer`.

    Args:
        text: Korean text (can include Hangul, spaces, punctuation)

    Returns:
        Romanized text
    """
    result = []

    for char in text:
        # Check if character is Hangul
        code = ord(char)

        if HANGUL_START <= code <= HANGUL_END:
            # Decompose Hangul syllable
            romanized = romanize_hangul_char(char)
            result.append(romanized)
        elif char == ' ':
            result.append(' ')
        elif char in '.,!?;:':
            # Preserve punctuation
            result.append(char)
        else:
            # Non-Hangul characters (numbers, English, etc.)
            result.append(char)

    # Join and clean up spacing
    romanized_text = ''.join(result)
    romanized_text = re.sub(r'\s+', ' ', romanized_text).strip()

    return romanized_text


def romanize_hangul_char(char: str) -> str:
    """
    Romanize a single Hangul character

    Korean Hangul syllables are composed of:
    - Choseong (initial consonant)
    - Jungseong (vowel)
    - Jongseong (final consonant, optional)

    Args:
        char: Single Hangul character

    Returns:
        Romanized string
    """
    code = ord(char) - HANGUL_START

    # Decompose into jamo indices
    cho_idx = code // (21 * 28)
    jung_idx = (code % (21 * 28)) // 28
    jong_idx = code % 28

    # Get romanization components
    cho = CHOSEONG[cho_idx]
    jung = JUNGSEONG[jung_idx]
    jong = JONGSEONG[jong_idx]

    # Apply pronunciation rules (simplified)
    romanized = cho + jung + jong

    return romanized


def apply_pronunciation_rules(text: str) -> str:
    """
    Apply Korean pronunciation rules to romanized text

    TODO: Implement advanced rules:
    - Assimilation (받침 + initial consonant)
    - Palatalization
    - Nasalization
    - Aspirationization

    For Phase 2A, we'll use basic romanization without complex rules.

    Args:
        text: Romanized Korean text

    Returns:
        Text with pronunciation rules applied
    """
    # Placeholder for future implementation
    return text


def get_ipa_notation(text: str) -> str:
    """
    Get IPA (International Phonetic Alphabet) notation

    TODO: Implement IPA conversion for Korean
    This requires mapping romanization to IPA symbols.

    Args:
        text: Korean text

    Returns:
        IPA notation
    """
    # Placeholder for future implementation
    return "[IPA notation not yet implemented]"


# Test function for development
def test_pronunciation():
    """Test pronunciation generation with sample Korean text"""
    sample_lyrics = """나를 그냥 짓밟고 가
괜찮아 돌아보지 마
내가 아파봤자 너만 하겠니"""

    print("Testing Pronunciation Generation")
    print("=" * 50)
    print("Input lyrics:")
    print(sample_lyrics)
    print("=" * 50)

    try:
        result = generate_pronunciation(sample_lyrics)

        print(f"\nFull Romanization:")
        print(result['fullRomanization'])
        print()

        print("Line-by-Line:")
        for line_data in result['lineByLine']:
            print(f"Original:     {line_data['original']}")
            print(f"Romanization: {line_data['romanization']}")
            print()

    except Exception as e:
        print(f"Error: {str(e)}")
        import traceback
        traceback.print_exc()


if __name__ == '__main__':
    # Run test if executed directly
    test_pronunciation()
