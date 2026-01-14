"""
Vocabulary Extraction
Extracts unique words with definitions, difficulty levels, and frequency data
"""

import logging
from typing import List, Dict
from collections import Counter

logger = logging.getLogger(__name__)


def extract_vocabulary(tokens: List[Dict], lyrics: str) -> List[Dict]:
    """
    Extract vocabulary from tokenized lyrics

    Args:
        tokens: List of tokens from tokenizer
        lyrics: Original lyrics text (for context)

    Returns:
        List of vocabulary items with definitions and metadata
        Example: [
            {
                "word": "나",
                "variants": ["나를", "나의", "나는"],
                "pos": "pronoun",
                "definition": {"en": "I, me", "ko": "나 (first person pronoun)"},
                "level": "beginner",
                "frequency": 0.98,
                "count": 15,
                "lineIndices": [0, 2, 5, 8, 12]
            },
            ...
        ]
    """
    logger.info("Starting vocabulary extraction")

    # Group tokens by base form
    word_groups = {}

    for token in tokens:
        morpheme = token['morpheme']
        pos = token['posTag']
        pos_readable = token['pos']

        # Skip punctuation and some POS types
        if pos in ['Punctuation', 'Foreign', 'Alpha', 'Number']:
            continue

        # Get base form (for now, just use morpheme)
        # TODO: Implement proper stemming for verbs/adjectives
        base_form = get_base_form(morpheme, pos)

        # Initialize word group if not seen before
        if base_form not in word_groups:
            word_groups[base_form] = {
                'baseForm': base_form,
                'variants': set(),
                'pos': pos_readable,
                'posTag': pos,
                'occurrences': [],
                'count': 0
            }

        # Track variant if different from base
        if morpheme != base_form:
            word_groups[base_form]['variants'].add(morpheme)

        # Track occurrence
        word_groups[base_form]['occurrences'].append({
            'morpheme': morpheme,
            'lineIndex': token['lineIndex']
        })
        word_groups[base_form]['count'] += 1

    # Convert to vocabulary list
    vocabulary = []

    for base_form, data in word_groups.items():
        # Get definition
        definition = get_definition(base_form, data['posTag'])

        # Determine difficulty level
        level = determine_difficulty_level(base_form, data['posTag'], data['count'])

        # Calculate frequency (how common this word is in Korean)
        frequency = get_word_frequency(base_form, data['posTag'])

        # Get unique line indices
        line_indices = sorted(list(set([occ['lineIndex'] for occ in data['occurrences']])))

        vocab_item = {
            'word': base_form,
            'variants': sorted(list(data['variants'])),
            'pos': data['pos'],
            'definition': definition,
            'level': level,
            'frequency': frequency,
            'count': data['count'],
            'lineIndices': line_indices
        }

        vocabulary.append(vocab_item)

    # Sort by frequency in song (most common words first)
    vocabulary.sort(key=lambda x: x['count'], reverse=True)

    logger.info(f"Extracted {len(vocabulary)} unique vocabulary items")
    return vocabulary


def get_base_form(morpheme: str, pos: str) -> str:
    """
    Get base form of a word

    For now, returns morpheme as-is.
    TODO: Implement proper stemming for verbs/adjectives
    - Verbs: 가다 (to go) vs 가 (go - imperative)
    - Adjectives: 좋다 (to be good) vs 좋아 (good)

    Args:
        morpheme: The morpheme text
        pos: POS tag

    Returns:
        Base form of the word
    """
    # TODO: Implement verb/adjective stemming
    # For now, return as-is
    return morpheme


def get_definition(word: str, pos: str) -> Dict[str, str]:
    """
    Get word definition from dictionary

    TODO: Integrate with Naver Dictionary API or local dictionary
    For Phase 2A, return placeholder definitions

    Args:
        word: Korean word
        pos: POS tag

    Returns:
        Dictionary with English and Korean definitions
    """
    # Hardcoded common words for Phase 2A
    common_definitions = {
        '나': {'en': 'I, me', 'ko': '나 (first person pronoun)'},
        '를': {'en': 'object marker', 'ko': '를 (object particle)'},
        '을': {'en': 'object marker', 'ko': '을 (object particle)'},
        '그냥': {'en': 'just, simply', 'ko': '그냥 (just, as is)'},
        '가': {'en': 'go', 'ko': '가다 (to go)'},
        '이': {'en': 'subject marker', 'ko': '이 (subject particle)'},
        '가': {'en': 'subject marker / go', 'ko': '가 (subject particle / to go)'},
        '는': {'en': 'topic marker', 'ko': '는 (topic particle)'},
        '은': {'en': 'topic marker', 'ko': '은 (topic particle)'},
        '의': {'en': 'possessive marker', 'ko': '의 (possessive particle)'},
        '에': {'en': 'at, in, to (location)', 'ko': '에 (location/time particle)'},
        '도': {'en': 'also, too', 'ko': '도 (also particle)'},
        '만': {'en': 'only', 'ko': '만 (only particle)'},
        '고': {'en': 'and then', 'ko': '고 (connector)'},
        '지만': {'en': 'but, although', 'ko': '지만 (but connector)'},
        '아': {'en': 'informal verb ending', 'ko': '아 (informal ending)'},
        '어': {'en': 'informal verb ending', 'ko': '어 (informal ending)'},
    }

    if word in common_definitions:
        return common_definitions[word]

    # Placeholder for words we don't have definitions for yet
    return {
        'en': f'[Definition needed]',
        'ko': f'[{word}의 뜻]'
    }


def determine_difficulty_level(word: str, pos: str, count: int) -> str:
    """
    Determine difficulty level: beginner, intermediate, advanced

    Based on:
    - Word frequency in Korean language
    - POS type (pronouns/particles are usually beginner)
    - Word length/complexity

    Args:
        word: Korean word
        pos: POS tag
        count: Number of times word appears in song

    Returns:
        Difficulty level: 'beginner', 'intermediate', or 'advanced'
    """
    # Very common beginner words
    beginner_words = [
        # Pronouns
        '나', '너', '저', '우리', '당신',
        # Particles
        '이', '가', '을', '를', '은', '는', '의', '에', '도', '만', '와', '과',
        # Common verbs/adjectives
        '있다', '없다', '하다', '되다', '보다', '오다', '가다',
        # Demonstratives
        '이', '그', '저', '이거', '그거', '저거',
        # Basic adverbs
        '그냥', '너무', '정말', '아주', '좀', '잘', '안',
        # Basic time
        '지금', '오늘', '어제', '내일',
    ]

    # Check if it's a very common word
    if word in beginner_words:
        return 'beginner'

    # Pronouns and particles are typically beginner level
    if pos in ['Pronoun', 'Josa']:
        return 'beginner'

    # Short connectors and endings are often beginner
    if pos in ['Conjunction', 'Eomi'] and len(word) <= 2:
        return 'beginner'

    # Very short words (1-2 chars) are often basic
    if len(word) <= 2:
        return 'beginner'

    # Common verbs/adjectives (3-4 chars) might be intermediate
    if pos in ['Verb', 'Adjective'] and len(word) <= 4:
        return 'intermediate'

    # Longer or complex words are advanced
    if len(word) >= 5:
        return 'advanced'

    # Default to intermediate
    return 'intermediate'


def get_word_frequency(word: str, pos: str) -> float:
    """
    Get word frequency (0-1 scale)
    1.0 = extremely common (e.g., 이, 가, 나)
    0.0 = very rare

    TODO: Use proper Korean frequency dictionary
    For Phase 2A, use heuristics based on word commonality

    Args:
        word: Korean word
        pos: POS tag

    Returns:
        Frequency score (0.0 to 1.0)
    """
    # Very high frequency words (particles, pronouns)
    high_freq_words = {
        '이': 1.0, '가': 1.0, '을': 1.0, '를': 1.0,
        '은': 0.98, '는': 0.98, '의': 0.95,
        '나': 0.95, '너': 0.90, '저': 0.85,
        '에': 0.92, '도': 0.88, '만': 0.85,
        '그냥': 0.80, '아': 0.75, '어': 0.75,
    }

    if word in high_freq_words:
        return high_freq_words[word]

    # Estimate based on POS and length
    if pos == 'Josa':  # Particles are generally high frequency
        return 0.90

    if pos == 'Pronoun':
        return 0.85

    if pos in ['Conjunction', 'Eomi']:
        return 0.70

    # Shorter words tend to be more common
    if len(word) == 1:
        return 0.60
    elif len(word) == 2:
        return 0.50
    elif len(word) <= 4:
        return 0.40
    else:
        return 0.30


def get_vocabulary_stats(vocabulary: List[Dict]) -> Dict:
    """
    Get statistics about extracted vocabulary

    Args:
        vocabulary: List of vocabulary items

    Returns:
        Statistics dict with counts by level, POS, etc.
    """
    stats = {
        'total': len(vocabulary),
        'byLevel': Counter([v['level'] for v in vocabulary]),
        'byPOS': Counter([v['pos'] for v in vocabulary]),
        'totalOccurrences': sum([v['count'] for v in vocabulary]),
        'avgOccurrences': sum([v['count'] for v in vocabulary]) / len(vocabulary) if vocabulary else 0,
    }

    return stats


# Test function for development
def test_vocabulary():
    """Test vocabulary extraction with sample tokens"""
    # Simulated tokens (would come from tokenizer)
    sample_tokens = [
        {'morpheme': '나', 'pos': 'pronoun', 'posTag': 'Pronoun', 'lineIndex': 0, 'charOffset': 0},
        {'morpheme': '를', 'pos': 'particle', 'posTag': 'Josa', 'lineIndex': 0, 'charOffset': 1},
        {'morpheme': '그냥', 'pos': 'adverb', 'posTag': 'Adverb', 'lineIndex': 0, 'charOffset': 2},
        {'morpheme': '가', 'pos': 'verb', 'posTag': 'Verb', 'lineIndex': 0, 'charOffset': 4},
        {'morpheme': '나', 'pos': 'pronoun', 'posTag': 'Pronoun', 'lineIndex': 1, 'charOffset': 10},
        {'morpheme': '는', 'pos': 'particle', 'posTag': 'Josa', 'lineIndex': 1, 'charOffset': 11},
    ]

    sample_lyrics = "나를 그냥 가\n나는 좋아"

    print("Testing Vocabulary Extraction")
    print("=" * 50)

    try:
        vocabulary = extract_vocabulary(sample_tokens, sample_lyrics)
        print(f"\nExtracted {len(vocabulary)} unique words:\n")

        for word in vocabulary:
            print(f"Word: {word['word']}")
            print(f"  POS: {word['pos']}")
            print(f"  Definition (EN): {word['definition']['en']}")
            print(f"  Level: {word['level']}")
            print(f"  Frequency: {word['frequency']:.2f}")
            print(f"  Count: {word['count']}")
            print(f"  Lines: {word['lineIndices']}")
            if word['variants']:
                print(f"  Variants: {', '.join(word['variants'])}")
            print()

        # Print stats
        stats = get_vocabulary_stats(vocabulary)
        print("Statistics:")
        print(f"  Total words: {stats['total']}")
        print(f"  By level: {dict(stats['byLevel'])}")
        print(f"  By POS: {dict(stats['byPOS'])}")
        print(f"  Total occurrences: {stats['totalOccurrences']}")
        print(f"  Average occurrences: {stats['avgOccurrences']:.2f}")

    except Exception as e:
        print(f"Error: {str(e)}")


if __name__ == '__main__':
    # Run test if executed directly
    test_vocabulary()
