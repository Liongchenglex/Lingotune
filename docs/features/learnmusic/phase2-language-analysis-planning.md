# Phase 2: Language Analysis & Learning Features - Planning Document

**Date:** 2026-01-13
**Status:** Planning & Discussion
**Goal:** Enable deep language learning through song lyrics (vocabulary, grammar, syntax, semantics, emotion)

---

## TL;DR: Phased Rollout Strategy

**User's Requirements:**
- ✅ **UX:** Read-only lyrics + flashcard mechanics + interactive quiz mode
- ✅ **Processing:** Tokenization + pre-processing (cache results)
- ✅ **Rollout:** Phased approach (vocab first → grammar/syntax → semantics/emotion)

**Recommendation:** Start with **Phase 2A (Vocabulary)**, iterate based on user feedback, then add **Phase 2B (Grammar/Syntax)** and **Phase 2C (Semantics/Emotion)**.

---

## Language Learning Dimensions

### 1. Vocabulary (Phase 2A - MVP)

**What it means:**
- Individual word meanings
- Definitions in target language + user's native language
- Pronunciation (romanization for non-Latin scripts)
- Frequency/difficulty level (beginner/intermediate/advanced)

**Example (Korean song):**
```
Lyric line: "나를 그냥 짓밟고 가"

Vocabulary breakdown:
- 나를 (nareul) = "me" (object marker)
  - Base: 나 (na) = "I/me"
  - Particle: 를 (reul) = object marker
  - Level: Beginner

- 그냥 (geunyang) = "just, simply"
  - Level: Beginner

- 짓밟고 (jitbapgo) = "trample, step on"
  - Base: 짓밟다 (jitbapda) = "to trample"
  - Form: -고 (and/then connector)
  - Level: Intermediate

- 가 (ga) = "go"
  - Base: 가다 (gada) = "to go"
  - Form: imperative
  - Level: Beginner
```

**Technical Approach:**
- **Tokenization:** Use language-specific libraries
  - Korean: `konlpy` (mecab, okt)
  - Chinese: `jieba`
  - Japanese: `kuromoji` or `mecab`
  - Spanish/French/etc: `spaCy`
- **Pre-processing:** When song is added, tokenize lyrics and cache results
- **Dictionary API:** Use existing APIs for word definitions
  - Korean: Naver Dictionary API, Korean-English Dict
  - Chinese: CC-CEDICT, Pleco API
  - Multi-language: Google Translate API (fallback)
- **AI Enhancement:** Use Claude/GPT to generate context-aware definitions
  - "In this song, 짓밟고 means 'trample' figuratively - the singer feels emotionally crushed"

**Data Structure:**
```typescript
/songs/{songId}/analysis
{
  vocabulary: [
    {
      word: "나를",
      baseForm: "나",
      romanization: "nareul",
      definition: {
        en: "me (object)",
        native: "나 (I/me) + 를 (object marker)"
      },
      partOfSpeech: "pronoun + particle",
      level: "beginner",
      frequency: 0.95,  // How common this word is (0-1)
      lineIndices: [0, 5, 12],  // Which lines contain this word
    },
    // ... more words
  ],
  processedAt: Timestamp,
  languageCode: "ko"
}
```

**User Experience:**
1. User opens lyrics screen
2. Lyrics displayed with clickable words (different colors by difficulty level)
3. User taps "나를" → tooltip shows definition, pronunciation, level
4. User can add word to flashcard deck for practice
5. Quiz mode: "What does 나를 mean in this context?"

---

### 2. Grammar (Phase 2B)

**What it means:**
- Verb conjugations
- Tenses (past, present, future)
- Particles (Korean/Japanese)
- Sentence endings (formal/informal)
- Grammatical structures (passive, causative, conditional)

**Example (Korean):**
```
Lyric line: "나를 그냥 짓밟고 가"

Grammar breakdown:
- 나를: Object marker particle (를)
  - Explanation: "를 marks 나 (me) as the direct object of the verb 짓밟다 (to trample)"
  - Pattern: [noun] + 를/을 → direct object

- 짓밟고: Verb stem + -고 connector
  - Explanation: "-고 connects two actions: 'trample AND go'"
  - Pattern: [verb stem] + -고 → sequential actions

- 가: Verb in imperative form
  - Explanation: "Casual imperative - commanding someone to go"
  - Pattern: [verb stem] → imperative (casual)
```

**Technical Approach:**
- **Tokenization + POS Tagging:** Extract grammatical information
  - Korean: konlpy with POS tags (JKO = object marker, VV = verb, etc.)
  - Chinese: jieba with POS tags
- **Grammar Pattern Detection:** Rule-based + AI
  - Rule-based: Detect common patterns (e.g., "-고" connector, "-았/었" past tense)
  - AI-enhanced: Claude explains **why** this grammar is used in context
- **Pre-processing:** Generate grammar explanations when song added
- **Database:** Cache grammar patterns per line

**Data Structure:**
```typescript
/songs/{songId}/analysis
{
  grammar: [
    {
      lineIndex: 0,
      line: "나를 그냥 짓밟고 가",
      patterns: [
        {
          pattern: "를/을",
          explanation: "Object marker particle - marks 나 (me) as direct object",
          example: "나를 사랑해 (Love me)",
          level: "beginner",
          patternType: "particle"
        },
        {
          pattern: "-고",
          explanation: "Sequential connector - links two actions (trample AND go)",
          example: "먹고 자다 (eat and sleep)",
          level: "beginner",
          patternType: "connector"
        }
      ]
    },
    // ... more lines
  ]
}
```

**User Experience:**
1. User taps line → shows grammar breakdown
2. Each grammar pattern highlighted with explanation
3. "Learn this pattern" button → adds to flashcards
4. Quiz mode: "Which particle marks the direct object in this sentence?"

---

### 3. Syntax (Phase 2B - Combined with Grammar)

**What it means:**
- Word order (SOV vs SVO)
- Sentence structure
- Clause relationships (main clause, subordinate clause)
- Phrase construction

**Example (Korean SOV order):**
```
Korean: 나를 그냥 짓밟고 가
        [Object] [Adverb] [Verb] [Verb]

English equivalent: "Just trample me and go"
                    [Adverb] [Verb] [Object] [Connector] [Verb]

Syntax explanation:
- Korean is SOV (Subject-Object-Verb)
- Verbs come at the end
- Particles mark grammatical role (not word order)
```

**Technical Approach:**
- **Dependency Parsing:** Use NLP libraries to extract syntax tree
  - spaCy, Stanford CoreNLP, language-specific parsers
- **AI Explanation:** Claude explains word order differences
  - "Korean places verbs at the end, unlike English (SVO). This is why 가 (go) comes last."
- **Pre-processing:** Generate syntax trees when song added

**Data Structure:**
```typescript
/songs/{songId}/analysis
{
  syntax: [
    {
      lineIndex: 0,
      line: "나를 그냥 짓밟고 가",
      syntaxTree: {
        type: "SOV",
        components: [
          { text: "나를", role: "object", order: 1 },
          { text: "그냥", role: "adverb", order: 2 },
          { text: "짓밟고", role: "verb1", order: 3 },
          { text: "가", role: "verb2", order: 4 }
        ],
        explanation: "Korean SOV order: Object comes before verb, unlike English SVO"
      }
    }
  ]
}
```

**User Experience:**
1. User taps "Why is word order different?" button
2. Shows visual syntax tree with color-coded roles
3. Compares to English word order side-by-side
4. Explanation: "Korean is SOV, English is SVO"

---

### 4. Semantics (Phase 2C)

**What it means:**
- **Meaning in context** (not just dictionary definition)
- **Idioms and expressions** ("kick the bucket" ≠ literal kicking)
- **Cultural nuances** (honorifics, politeness levels)
- **Connotations** (positive/negative associations)
- **Metaphorical meanings** (songs use lots of metaphors)

**Example (Korean):**
```
Lyric line: "나를 그냥 짓밟고 가"
Dictionary meaning: "Just trample me and go"

Semantic analysis:
- Literal meaning: "Step on me and leave"
- Figurative meaning: "You can hurt me emotionally and walk away"
- Emotional tone: Pain, resignation, acceptance of heartbreak
- Cultural context: Common metaphor in Korean breakup songs
- Connotation: 짓밟다 (trample) is violent imagery → emphasizes emotional pain
```

**Another Example (Chinese idiom):**
```
Lyric line: "画蛇添足"
Dictionary meaning: "Draw snake, add feet"

Semantic analysis:
- Literal meaning: Drawing feet on a snake
- Idiomatic meaning: "Ruin something by doing unnecessary work"
- Cultural context: Ancient Chinese idiom from historical story
- Usage: Warning against over-complication
```

**Technical Approach:**
- **AI-Powered Analysis:** Claude/GPT excels at semantic interpretation
  - Prompt: "Explain the figurative meaning of this lyric line in context of the song"
  - Prompt: "Identify idioms, metaphors, and cultural references"
- **Pre-processing:** Generate semantic analysis when song added
- **Contextual Explanations:** Use full song context for interpretation
- **Cultural Database:** Maintain database of common idioms/expressions

**Data Structure:**
```typescript
/songs/{songId}/analysis
{
  semantics: [
    {
      lineIndex: 0,
      line: "나를 그냥 짓밟고 가",
      literalMeaning: "Just trample me and go",
      figurativeMeaning: "You can hurt me emotionally and walk away without guilt",
      metaphors: [
        {
          text: "짓밟고",
          explanation: "Trampling is a violent physical action used metaphorically for emotional pain"
        }
      ],
      culturalContext: "Common imagery in Korean breakup songs - physical violence metaphors for emotional hurt",
      emotionalTone: ["pain", "resignation", "acceptance"],
      idioms: []
    }
  ]
}
```

**User Experience:**
1. User taps "What does this really mean?" button
2. Shows literal vs figurative meaning
3. Explains metaphors and cultural context
4. Highlights emotional tone
5. Optional: Play line with emotion explanation

---

### 5. Emotion & Pragmatics (Phase 2C)

**What it means:**
- **Emotional tone** (sad, angry, joyful, nostalgic)
- **Speaker intent** (commanding, requesting, lamenting)
- **Register/formality** (casual, formal, intimate)
- **Attitude** (sarcastic, sincere, playful)

**Example (Korean formality):**
```
Lyric line: "나를 그냥 짓밟고 가"
Emotion analysis:
- Tone: Melancholic, resigned
- Formality: Casual (uses 가 not 가세요)
- Intent: Permissive command ("Go ahead, hurt me")
- Attitude: Self-deprecating, accepting of pain
- Speaker-listener relationship: Intimate (casual speech to lover)

Contrast with formal version:
- Formal: "저를 그냥 짓밟고 가세요"
- Would feel distant, not intimate
- Changes emotional impact
```

**Technical Approach:**
- **AI Analysis:** Best handled by LLM (Claude/GPT)
  - Prompt: "Analyze the emotional tone and speaker intent of this line"
  - Prompt: "Identify formality level and what it reveals about speaker-listener relationship"
- **Pre-processing:** Generate emotion analysis when song added
- **Sentiment Analysis:** Use sentiment analysis libraries as baseline
- **Lyric-wide Context:** Analyze emotion throughout entire song (arc)

**Data Structure:**
```typescript
/songs/{songId}/analysis
{
  emotion: {
    overallTone: ["melancholic", "resigned", "heartbroken"],
    emotionArc: [
      { lineRange: [0, 5], emotion: "pain", intensity: 0.8 },
      { lineRange: [6, 10], emotion: "resignation", intensity: 0.9 },
      { lineRange: [11, 15], emotion: "acceptance", intensity: 0.6 }
    ],
    lines: [
      {
        lineIndex: 0,
        line: "나를 그냥 짓밟고 가",
        emotion: "resigned pain",
        formality: "casual",
        intent: "permissive command",
        attitude: "self-deprecating",
        explanation: "Speaker tells lover to hurt them and leave - shows resignation and acceptance of heartbreak"
      }
    ]
  }
}
```

**User Experience:**
1. Lyrics display with emotion color gradient (red = pain, blue = sadness, etc.)
2. User taps line → shows emotion analysis
3. "Why is this sad?" explanation
4. Visual emotion arc graph for entire song
5. Compare formality levels (if formal version exists)

---

## Additional Language Dimensions to Consider

### 6. Pronunciation & Phonetics

**What it means:**
- Romanization (Korean Hangul → Latin alphabet)
- IPA (International Phonetic Alphabet)
- Tone marks (Chinese tones: 妈 mā, 麻 má, 马 mǎ, 骂 mà)
- Pitch accent (Japanese: 橋 hashi = bridge vs 箸 hashi = chopsticks)

**Technical Approach:**
- **Romanization Libraries:**
  - Korean: `hangul-romanization` (Revised Romanization)
  - Chinese: `pinyin` library
  - Japanese: `kuroshiro` (hiragana/katakana conversion)
- **TTS (Text-to-Speech):** Google Cloud TTS, Azure TTS
  - Generate audio pronunciation for each line
  - Slow-speed version for learning
- **Pre-processing:** Generate romanization + audio when song added

**Data Structure:**
```typescript
/songs/{songId}/analysis
{
  pronunciation: [
    {
      lineIndex: 0,
      line: "나를 그냥 짓밟고 가",
      romanization: "nareul geunyang jitbapgo ga",
      ipa: "naɾɯl kɯɲaŋ tɕitpapko ka",
      audioUrl: "gs://lingotune/audio/song-ko-001/line-0.mp3",
      slowAudioUrl: "gs://lingotune/audio/song-ko-001/line-0-slow.mp3"
    }
  ]
}
```

**User Experience:**
1. Romanization displayed below lyrics (toggle on/off)
2. Speaker icon → plays pronunciation
3. Slow-motion playback for practice
4. Record yourself → compare to native pronunciation (future)

---

### 7. Collocations & Word Combinations

**What it means:**
- Words that commonly appear together
- "Strong tea" ✅ vs "Powerful tea" ❌
- Natural phrasing vs literal translation

**Example (Korean):**
```
Correct: 커피를 타다 (lit: "ride coffee" = make coffee)
Wrong: 커피를 만들다 (lit: "make coffee" - grammatically correct but unnatural)

Natural: 눈이 내리다 (lit: "snow descends" = it snows)
Unnatural: 눈이 떨어지다 (lit: "snow falls" - technically correct but not idiomatic)
```

**Technical Approach:**
- **Collocation Database:** Pre-built databases of common word pairs
- **AI Detection:** Claude identifies collocations in lyrics
- **Frequency Analysis:** Mark common vs rare combinations

**User Experience:**
1. Highlight natural collocations
2. Explain why this phrase is used (not literal translation)
3. Show alternative (incorrect) phrasings for comparison

---

### 8. Pragmatic Functions (Speech Acts)

**What it means:**
- Requesting, commanding, apologizing, thanking
- Indirect speech ("Could you...?" = polite request, not question)
- Implicature (implied meaning)

**Example (Korean politeness):**
```
직접: 문 닫아! (Shut the door!) - Direct command, rude
간접: 문 좀 닫아줄래? (Could you close the door?) - Indirect request, polite
```

**Technical Approach:**
- AI analysis of speech acts in lyrics
- Identify when singer is commanding, requesting, lamenting, etc.

---

### 9. Cultural References

**What it means:**
- References to movies, books, historical events
- Cultural practices, holidays, traditions
- Pop culture references (other songs, celebrities)

**Example (K-pop):**
```
Lyric: "Like a Netflix movie" (BLACKPINK)
Cultural reference: Western streaming service → global pop culture
Meaning: Dramatic, cinematic love story
```

**Technical Approach:**
- AI-powered cultural reference detection
- Link to external resources (Wikipedia, cultural databases)
- Community contributions (users submit cultural context)

---

## Technical Architecture

### Processing Pipeline (Korean Language)

```
User adds song
  ↓
[1. Tokenization] (Real-time, <1s)
    Tool: KoNLPy (Mecab or Okt tokenizer)
    Input: "나를 그냥 짓밟고 가"
    Output: [("나", "NP"), ("를", "JKO"), ("그냥", "MAG"), ("짓밟", "VV"), ("고", "EC"), ("가", "VV")]
    Purpose: Split into morphemes + POS tags
  ↓
[2. Vocabulary Extraction] (Fast, <2s)
    Tool: KoNLPy + Dictionary API (Naver Dictionary or custom)
    Input: Tokens from step 1
    Output: { word: "나를", baseForm: "나", definition: "me (object)", level: "beginner" }
    Purpose: Get definitions, base forms, difficulty levels
  ↓
[3. Grammar/Syntax Analysis] (Moderate, ~5s)
    Tool: KoNLPy POS tags + Rule-based pattern matching
    Input: POS-tagged tokens
    Output: { pattern: "를/을", type: "particle", explanation: "object marker" }
    Purpose: Identify grammar patterns (particles, verb endings, connectors)
  ↓
[4. AI Semantic Analysis] (Slow, ~30s)
    Tool: Claude API (Anthropic) or GPT-4
    Input: Full lyrics + line-by-line context
    Output: { literal: "...", figurative: "...", metaphors: [...], culturalContext: "..." }
    Purpose: Explain meaning, idioms, metaphors
  ↓
[5. Emotion Analysis] (Slow, ~20s)
    Tool: Claude API (Anthropic) or GPT-4
    Input: Full lyrics + song metadata
    Output: { tone: ["melancholic", "resigned"], formality: "casual", intent: "permissive" }
    Purpose: Analyze emotional tone, speaker intent, formality
  ↓
[6. Pronunciation Generation] (Moderate, ~10s)
    Tool: hangul-romanization library + Google Cloud TTS
    Input: Korean text
    Output: { romanization: "nareul geunyang...", audioUrl: "gs://..." }
    Purpose: Generate romanization + audio pronunciation
  ↓
Cache all results in Firestore /songs/{songId}/analysis
  ↓
User views lyrics (instant - pre-cached)
```

### Tool Specifications for Korean

| Step | Tool/Library | Language | Installation | Cost |
|------|-------------|----------|--------------|------|
| **Tokenization** | KoNLPy (Mecab) | Python | `pip install konlpy` | Free |
| **Alternative** | KoNLPy (Okt) | Python | `pip install konlpy` | Free |
| **Dictionary** | Naver Dictionary API | REST API | API key required | Free tier available |
| **Alternative** | Korean-English Dict (local) | Python | `pip install korean-dict` | Free |
| **Romanization** | hangul-romanization | JavaScript/Python | `npm install hangul-romanization` | Free |
| **AI Analysis** | Claude API (Anthropic) | REST API | API key required | ~$0.01-0.05/song |
| **Alternative AI** | GPT-4 (OpenAI) | REST API | API key required | ~$0.03-0.10/song |
| **TTS Audio** | Google Cloud TTS | REST API | API key required | $4 per 1M chars |
| **Alternative TTS** | Azure TTS | REST API | API key required | $1 per 1M chars |

### Why These Tools?

**KoNLPy (Mecab):**
- Industry standard for Korean NLP
- Most accurate tokenizer for Korean
- Provides POS tags (essential for grammar analysis)
- Fast performance
- Well-documented

**Mecab vs Okt:**
- Mecab: More accurate, faster, better for formal text
- Okt (Twitter): Better for informal/slang text (better for song lyrics)
- **Recommendation: Start with Okt for songs, fallback to Mecab if needed**

**Claude API (vs GPT-4):**
- Better at nuanced explanations
- Stronger multilingual understanding
- Lower cost per request
- Better at following structured output formats

**hangul-romanization:**
- Implements official Revised Romanization of Korean
- Standard used by Korean government
- Consistent output

### Firestore Structure

```
/songs/{songId}
├── metadata (title, artist, album, etc.)
└── /analysis (subcollection)
    ├── vocabulary
    ├── grammar
    ├── syntax
    ├── semantics
    ├── emotion
    ├── pronunciation
    └── processedAt
```

**Why subcollection?**
- Keeps main song document small
- Can load analysis on-demand (not always needed)
- Easier to regenerate analysis without affecting song metadata

---

## Phased Rollout Plan

### Phase 2A: Vocabulary (4-6 weeks)

**Deliverables:**
- [x] Tokenization for Korean, Chinese, Japanese, Spanish, French
- [x] Word-level click interaction
- [x] Basic definitions (dictionary API + AI enhancement)
- [x] Difficulty levels (beginner/intermediate/advanced)
- [x] Romanization
- [x] Add to flashcard feature
- [x] Basic quiz: "What does X mean?"

**Success Metrics:**
- Users click on average 10+ words per song
- 80%+ of words have accurate definitions
- 50%+ of users add at least 1 word to flashcards

---

### Phase 2B: Grammar & Syntax (6-8 weeks)

**Deliverables:**
- [x] Grammar pattern detection
- [x] Syntax tree visualization
- [x] Line-level explanations
- [x] Grammar flashcards
- [x] Quiz: "Which grammar pattern is used?"

**Success Metrics:**
- Users view grammar explanations for 30%+ of lines
- Grammar explanations rated helpful (4+/5 stars)
- 20%+ of users add grammar patterns to flashcards

---

### Phase 2C: Semantics & Emotion (6-8 weeks)

**Deliverables:**
- [x] AI-powered semantic analysis
- [x] Literal vs figurative meaning
- [x] Metaphor identification
- [x] Cultural context explanations
- [x] Emotion tone analysis
- [x] Emotion visualization (color gradient)

**Success Metrics:**
- Users view semantic explanations for 20%+ of lines
- Cultural context rated helpful
- Emotion analysis resonates with users

---

### Phase 2D: Pronunciation & Advanced Features (4-6 weeks)

**Deliverables:**
- [x] Audio pronunciation (line-by-line)
- [x] Slow-speed playback
- [x] IPA notation
- [x] Collocation highlighting
- [x] Cultural reference links

---

## Is This Too Ambitious?

### Honest Assessment: **YES, if you do it all at once. NO, if you phase it.**

**Why it's ambitious:**
1. **Multiple NLP tasks:** Tokenization, POS tagging, parsing, semantic analysis
2. **Language-specific challenges:** Each language needs different libraries/approaches
3. **AI costs:** Semantic/emotion analysis for every song = expensive
4. **Data quality:** Accuracy of grammar/syntax parsing varies by language
5. **UX complexity:** Presenting all this info without overwhelming users

**Why it's doable:**
1. ✅ You're **phasing** it (vocab → grammar → semantics)
2. ✅ You're **pre-processing** (not real-time)
3. ✅ You're using **existing libraries** (tokenization)
4. ✅ You have **AI** for hard parts (semantics, emotion)
5. ✅ Clear use case: Language learners want this depth

---

## Recommendation: Start Small, Iterate

### Phase 2A: Vocabulary ONLY (MVP)

**What to build first:**
1. Tokenization (Korean, Chinese)
2. Clickable words in lyrics
3. Basic definitions (dictionary API)
4. Add to flashcard deck
5. Simple quiz: "What does this word mean?"

**Time estimate:** 4-6 weeks

**Why start here:**
- Vocabulary is **highest ROI** for learners
- Tokenization is well-solved (existing libraries)
- Clear user value (understand individual words)
- Foundation for everything else

### After Phase 2A Success

**Evaluate:**
- Are users engaging with vocab feature?
- What do users request most? (grammar? cultural context?)
- Which language has most users? (prioritize that language)
- Is AI cost sustainable?

**Then decide:**
- Phase 2B (grammar) if users want deeper understanding
- OR pivot to other features (spaced repetition, social features)

---

## Key Questions for You

1. **Which languages to prioritize?** (Korean first? Chinese? All 10+ languages?)
2. **AI budget?** (Claude API costs ~$0.01-0.05 per song analysis)
3. **User testing?** (Beta users to validate Phase 2A before building 2B?)
4. **Flashcard system?** (Build your own or integrate existing like Anki?)
5. **Quiz system?** (Simple multiple choice or sophisticated adaptive learning?)

Let me know your thoughts, and we can refine this plan further!
