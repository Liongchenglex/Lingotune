"""
Grammar Pattern Analysis
Rule-based detection of Korean grammar patterns (particles, endings, connectors)
"""

import logging
from typing import List, Dict

logger = logging.getLogger(__name__)


def analyze_grammar(tokens: List[Dict], lyrics: str) -> List[Dict]:
    """
    Analyze grammar patterns in tokenized lyrics

    Args:
        tokens: List of tokens from tokenizer
        lyrics: Original lyrics text

    Returns:
        List of grammar patterns found
        Example: [
            {
                "pattern": "를/을",
                "type": "particle",
                "explanation": "Object marker - marks the direct object",
                "example": "나를 사랑해 (Love me)",
                "level": "beginner",
                "lineIndices": [0, 3, 7]
            },
            ...
        ]
    """
    logger.info("Starting grammar analysis")

    patterns = []

    # Split lyrics into lines for reference
    lines = lyrics.strip().split('\n')
    tokens_by_line = group_tokens_by_line(tokens)

    # Detect different pattern types
    particle_patterns = detect_particles(tokens, tokens_by_line, lines)
    patterns.extend(particle_patterns)

    ending_patterns = detect_verb_endings(tokens, tokens_by_line, lines)
    patterns.extend(ending_patterns)

    connector_patterns = detect_connectors(tokens, tokens_by_line, lines)
    patterns.extend(connector_patterns)

    # Remove duplicates (keep first occurrence with all line indices)
    unique_patterns = deduplicate_patterns(patterns)

    logger.info(f"Found {len(unique_patterns)} unique grammar patterns")
    return unique_patterns


def group_tokens_by_line(tokens: List[Dict]) -> Dict[int, List[Dict]]:
    """Group tokens by line index"""
    by_line = {}
    for token in tokens:
        line_idx = token['lineIndex']
        if line_idx not in by_line:
            by_line[line_idx] = []
        by_line[line_idx].append(token)
    return by_line


def detect_particles(tokens: List[Dict], tokens_by_line: Dict, lines: List[str]) -> List[Dict]:
    """
    Detect Korean particles (조사)
    Common particles: 을/를, 이/가, 은/는, 의, 에, 에서, 도, 만, etc.
    """
    logger.info("Detecting particles")
    patterns = []

    for token in tokens:
        if token['posTag'] != 'Josa':
            continue

        particle = token['morpheme']
        pattern = get_particle_pattern(particle, token)

        if pattern:
            patterns.append(pattern)

    return patterns


def get_particle_pattern(particle: str, token: Dict) -> Dict:
    """Get explanation for a specific particle"""

    # Common particles and their explanations
    particle_info = {
        '을': {
            'pattern': '을/를',
            'type': 'particle',
            'explanation': 'Object marker - marks the direct object of a verb',
            'example': '나를 사랑해 (Love me)',
            'level': 'beginner'
        },
        '를': {
            'pattern': '을/를',
            'type': 'particle',
            'explanation': 'Object marker - marks the direct object of a verb',
            'example': '나를 사랑해 (Love me)',
            'level': 'beginner'
        },
        '이': {
            'pattern': '이/가',
            'type': 'particle',
            'explanation': 'Subject marker - marks the subject of a sentence',
            'example': '나이 좋아 (I like it)',
            'level': 'beginner'
        },
        '가': {
            'pattern': '이/가',
            'type': 'particle',
            'explanation': 'Subject marker - marks the subject of a sentence',
            'example': '비가 와 (It rains)',
            'level': 'beginner'
        },
        '은': {
            'pattern': '은/는',
            'type': 'particle',
            'explanation': 'Topic marker - indicates the topic/theme of the sentence',
            'example': '나는 학생이야 (I am a student)',
            'level': 'beginner'
        },
        '는': {
            'pattern': '은/는',
            'type': 'particle',
            'explanation': 'Topic marker - indicates the topic/theme of the sentence',
            'example': '나는 학생이야 (I am a student)',
            'level': 'beginner'
        },
        '의': {
            'pattern': '의',
            'type': 'particle',
            'explanation': 'Possessive particle - indicates possession or relation',
            'example': '나의 친구 (my friend)',
            'level': 'beginner'
        },
        '에': {
            'pattern': '에',
            'type': 'particle',
            'explanation': 'Location/time particle - indicates location or time',
            'example': '학교에 가다 (go to school)',
            'level': 'beginner'
        },
        '에서': {
            'pattern': '에서',
            'type': 'particle',
            'explanation': 'Location particle - indicates location of action',
            'example': '학교에서 공부해 (study at school)',
            'level': 'beginner'
        },
        '도': {
            'pattern': '도',
            'type': 'particle',
            'explanation': 'Addition particle - means "also" or "too"',
            'example': '나도 좋아 (I like it too)',
            'level': 'beginner'
        },
        '만': {
            'pattern': '만',
            'type': 'particle',
            'explanation': 'Limitation particle - means "only"',
            'example': '나만 (only me)',
            'level': 'beginner'
        },
        '와': {
            'pattern': '와/과',
            'type': 'particle',
            'explanation': 'Conjunction particle - means "and" or "with"',
            'example': '친구와 (with friends)',
            'level': 'beginner'
        },
        '과': {
            'pattern': '와/과',
            'type': 'particle',
            'explanation': 'Conjunction particle - means "and" or "with"',
            'example': '친구과 (with friends)',
            'level': 'beginner'
        },
        '한테': {
            'pattern': '한테',
            'type': 'particle',
            'explanation': 'Direction particle - indicates recipient (casual)',
            'example': '친구한테 말해 (tell to friend)',
            'level': 'intermediate'
        },
        '께': {
            'pattern': '께',
            'type': 'particle',
            'explanation': 'Direction particle - indicates recipient (honorific)',
            'example': '선생님께 (to the teacher)',
            'level': 'intermediate'
        },
        '보다': {
            'pattern': '보다',
            'type': 'particle',
            'explanation': 'Comparison particle - means "than"',
            'example': '나보다 (than me)',
            'level': 'intermediate'
        },
    }

    info = particle_info.get(particle)
    if not info:
        # Unknown particle - create basic pattern
        return {
            'pattern': particle,
            'type': 'particle',
            'explanation': f'Particle: {particle}',
            'example': '',
            'level': 'intermediate',
            'lineIndices': [token['lineIndex']]
        }

    return {
        **info,
        'lineIndices': [token['lineIndex']]
    }


def detect_verb_endings(tokens: List[Dict], tokens_by_line: Dict, lines: List[str]) -> List[Dict]:
    """
    Detect verb endings (어미)
    Common endings: -아/어, -았/었, -ㄹ/을, -네, -죠, etc.
    """
    logger.info("Detecting verb endings")
    patterns = []

    for token in tokens:
        if token['posTag'] not in ['Eomi', 'PreEomi']:
            continue

        ending = token['morpheme']
        pattern = get_ending_pattern(ending, token)

        if pattern:
            patterns.append(pattern)

    return patterns


def get_ending_pattern(ending: str, token: Dict) -> Dict:
    """Get explanation for verb ending"""

    ending_info = {
        '아': {
            'pattern': '-아/어',
            'type': 'ending',
            'explanation': 'Informal polite ending - casual speech',
            'example': '좋아 (It\'s good)',
            'level': 'beginner'
        },
        '어': {
            'pattern': '-아/어',
            'type': 'ending',
            'explanation': 'Informal polite ending - casual speech',
            'example': '먹어 (Eat)',
            'level': 'beginner'
        },
        '았': {
            'pattern': '-았/었',
            'type': 'ending',
            'explanation': 'Past tense marker',
            'example': '좋았어 (It was good)',
            'level': 'beginner'
        },
        '었': {
            'pattern': '-았/었',
            'type': 'ending',
            'explanation': 'Past tense marker',
            'example': '먹었어 (Ate)',
            'level': 'beginner'
        },
        '네': {
            'pattern': '-네',
            'type': 'ending',
            'explanation': 'Exclamatory ending - expresses realization',
            'example': '예쁘네 (Oh, it\'s pretty!)',
            'level': 'intermediate'
        },
        '죠': {
            'pattern': '-죠',
            'type': 'ending',
            'explanation': 'Polite confirmatory ending - "isn\'t it?"',
            'example': '좋죠? (It\'s good, isn\'t it?)',
            'level': 'intermediate'
        },
        'ㄹ': {
            'pattern': '-ㄹ/을',
            'type': 'ending',
            'explanation': 'Future tense or adnominal modifier',
            'example': '갈 거야 (Will go)',
            'level': 'intermediate'
        },
        '을': {
            'pattern': '-ㄹ/을',
            'type': 'ending',
            'explanation': 'Future tense or adnominal modifier',
            'example': '먹을 거야 (Will eat)',
            'level': 'intermediate'
        },
    }

    info = ending_info.get(ending)
    if not info:
        # Unknown ending
        return {
            'pattern': f'-{ending}',
            'type': 'ending',
            'explanation': f'Verb ending: {ending}',
            'example': '',
            'level': 'intermediate',
            'lineIndices': [token['lineIndex']]
        }

    return {
        **info,
        'lineIndices': [token['lineIndex']]
    }


def detect_connectors(tokens: List[Dict], tokens_by_line: Dict, lines: List[str]) -> List[Dict]:
    """
    Detect connectors (-고, -지만, -면, etc.)
    These link clauses or sentences
    """
    logger.info("Detecting connectors")
    patterns = []

    # Common connector endings
    connector_endings = ['고', '지만', '면', '어서', '아서', '니까', '는데', '지']

    for token in tokens:
        morpheme = token['morpheme']

        # Check if this is a connector
        if morpheme in connector_endings or (token['posTag'] == 'Eomi' and morpheme in connector_endings):
            pattern = get_connector_pattern(morpheme, token)
            if pattern:
                patterns.append(pattern)

    return patterns


def get_connector_pattern(connector: str, token: Dict) -> Dict:
    """Get explanation for connector"""

    connector_info = {
        '고': {
            'pattern': '-고',
            'type': 'connector',
            'explanation': 'Sequential connector - links two actions ("and then")',
            'example': '먹고 자다 (eat and sleep)',
            'level': 'beginner'
        },
        '지만': {
            'pattern': '-지만',
            'type': 'connector',
            'explanation': 'Contrast connector - means "but" or "although"',
            'example': '좋지만 비싸 (Good but expensive)',
            'level': 'intermediate'
        },
        '면': {
            'pattern': '-면',
            'type': 'connector',
            'explanation': 'Conditional connector - means "if" or "when"',
            'example': '가면 (if you go)',
            'level': 'beginner'
        },
        '어서': {
            'pattern': '-어서/아서',
            'type': 'connector',
            'explanation': 'Reason/sequential connector - "so" or "and then"',
            'example': '좋아서 (because it\'s good)',
            'level': 'beginner'
        },
        '아서': {
            'pattern': '-어서/아서',
            'type': 'connector',
            'explanation': 'Reason/sequential connector - "so" or "and then"',
            'example': '먹어서 (so eat / after eating)',
            'level': 'beginner'
        },
        '니까': {
            'pattern': '-니까',
            'type': 'connector',
            'explanation': 'Cause/reason connector - "because" or "since"',
            'example': '좋으니까 (because it\'s good)',
            'level': 'intermediate'
        },
        '는데': {
            'pattern': '-는데',
            'type': 'connector',
            'explanation': 'Background/contrast connector - provides context',
            'example': '가는데 (I\'m going, but...)',
            'level': 'intermediate'
        },
        '지': {
            'pattern': '-지',
            'type': 'connector',
            'explanation': 'Confirmatory connector - seeking agreement',
            'example': '좋지? (It\'s good, right?)',
            'level': 'beginner'
        },
    }

    info = connector_info.get(connector)
    if not info:
        return {
            'pattern': f'-{connector}',
            'type': 'connector',
            'explanation': f'Connector: {connector}',
            'example': '',
            'level': 'intermediate',
            'lineIndices': [token['lineIndex']]
        }

    return {
        **info,
        'lineIndices': [token['lineIndex']]
    }


def deduplicate_patterns(patterns: List[Dict]) -> List[Dict]:
    """
    Remove duplicate patterns, merging line indices

    Args:
        patterns: List of pattern dicts

    Returns:
        Deduplicated list with merged line indices
    """
    unique = {}

    for pattern in patterns:
        key = pattern['pattern']

        if key not in unique:
            unique[key] = pattern.copy()
            unique[key]['lineIndices'] = set(pattern['lineIndices'])
        else:
            # Merge line indices
            unique[key]['lineIndices'].update(pattern['lineIndices'])

    # Convert sets back to sorted lists
    result = []
    for pattern in unique.values():
        pattern['lineIndices'] = sorted(list(pattern['lineIndices']))
        result.append(pattern)

    # Sort by frequency (number of lines)
    result.sort(key=lambda x: len(x['lineIndices']), reverse=True)

    return result


def get_grammar_stats(patterns: List[Dict]) -> Dict:
    """
    Get statistics about grammar patterns

    Args:
        patterns: List of grammar patterns

    Returns:
        Statistics dict
    """
    from collections import Counter

    stats = {
        'total': len(patterns),
        'byType': Counter([p['type'] for p in patterns]),
        'byLevel': Counter([p['level'] for p in patterns]),
        'totalOccurrences': sum([len(p['lineIndices']) for p in patterns]),
    }

    return stats


# Test function for development
def test_grammar():
    """Test grammar analysis with sample tokens"""
    sample_tokens = [
        {'morpheme': '나', 'pos': 'pronoun', 'posTag': 'Pronoun', 'lineIndex': 0},
        {'morpheme': '를', 'pos': 'particle', 'posTag': 'Josa', 'lineIndex': 0},
        {'morpheme': '그냥', 'pos': 'adverb', 'posTag': 'Adverb', 'lineIndex': 0},
        {'morpheme': '가', 'pos': 'verb', 'posTag': 'Verb', 'lineIndex': 0},
        {'morpheme': '고', 'pos': 'ending', 'posTag': 'Eomi', 'lineIndex': 0},
        {'morpheme': '는', 'pos': 'particle', 'posTag': 'Josa', 'lineIndex': 1},
        {'morpheme': '좋', 'pos': 'adjective', 'posTag': 'Adjective', 'lineIndex': 1},
        {'morpheme': '지만', 'pos': 'ending', 'posTag': 'Eomi', 'lineIndex': 1},
    ]

    sample_lyrics = "나를 그냥 가고\n좋지만"

    print("Testing Grammar Analysis")
    print("=" * 50)

    try:
        patterns = analyze_grammar(sample_tokens, sample_lyrics)
        print(f"\nFound {len(patterns)} grammar patterns:\n")

        for pattern in patterns:
            print(f"Pattern: {pattern['pattern']}")
            print(f"  Type: {pattern['type']}")
            print(f"  Explanation: {pattern['explanation']}")
            print(f"  Example: {pattern['example']}")
            print(f"  Level: {pattern['level']}")
            print(f"  Lines: {pattern['lineIndices']}")
            print()

        # Print stats
        stats = get_grammar_stats(patterns)
        print("Statistics:")
        print(f"  Total patterns: {stats['total']}")
        print(f"  By type: {dict(stats['byType'])}")
        print(f"  By level: {dict(stats['byLevel'])}")
        print(f"  Total occurrences: {stats['totalOccurrences']}")

    except Exception as e:
        print(f"Error: {str(e)}")


if __name__ == '__main__':
    # Run test if executed directly
    test_grammar()
