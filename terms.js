/**
 * ===========================================================
 * TERMS LIST
 * ===========================================================
 * Each hype term has:
 *   - term: the actual word/phrase
 *   - explanation: why it's hype, vague, or subjective
 */

window.hypeLessTerms = [
  { term: "extreme", explanation: "Subjective exaggeration, avoid overstating." },
  { term: "extremely", explanation: "Subjective exaggeration, avoid overstating." },
  { term: "giant", explanation: "Vague qualitative descriptor, prefer precise measures." },
  { term: "ultra", explanation: "Promotional or exaggerated emphasis." },
  { term: "impressive", explanation: "Subjective evaluation, avoid opinion." },
  { term: "outstanding", explanation: "Subjective evaluation, avoid opinion." },
  { term: "fascinating", explanation: "Subjective evaluation, avoid opinion." },
  { term: "tremendous", explanation: "Subjective exaggeration." },
  { term: "holistic", explanation: "Vague buzzword, clarify specific aspects." },
  { term: "powerful", explanation: "Subjective, prefer concrete descriptions." },
  { term: "pave the way", explanation: "Promotional metaphor, avoid hype." },
  { term: "elegant", explanation: "Subjective praise, avoid opinionated language." },
  { term: "strikingly", explanation: "Subjective emphasis, avoid hype." },
  { term: "unconventional", explanation: "Vague term, clarify precise novelty." },
  { term: "open up a splendid era", explanation: "Promotional and vague phrase." },
  { term: "to the best of our knowledge", explanation: "Often unnecessary hedging, use precise claims." },
  { term: "ultimate", explanation: "Overstated finality, avoid absolutes." },
  { term: "surprisingly", explanation: "Subjective reaction, avoid opinion." },
  { term: "remarkable", explanation: "Subjective evaluation." },
  { term: "notably", explanation: "Subjective emphasis, prefer data-driven statements." },
  { term: "record", explanation: "Potential hype unless clearly defined." },
  { term: "unprecedented", explanation: "Often overused; novelty should be clear from context." },
  { term: "open new avenues", explanation: "Promotional phrase, avoid hype." },
  { term: "paves the way", explanation: "Promotional metaphor." },
  { term: "open the window", explanation: "Vague metaphor." },
  { term: "next generation", explanation: "Buzzword, avoid unnecessary hype." },
  { term: "novel", explanation: "Novelty should be inferred from context." },
  { term: "new", explanation: "Novelty should be inferred from context." },
  { term: "first", explanation: "Claims of priority can be contentious." },
  { term: "unique", explanation: "Subjective absolute, avoid." },
  { term: "breakthrough", explanation: "Strong hype term implying major advance; use cautiously." },
  { term: "paradigm shift", explanation: "Strong claim implying fundamental change; often subjective." },
  { term: "paradigm-shift", explanation: "Strong claim implying fundamental change; often subjective." },
  { term: "groundbreaking", explanation: "Promotional and subjective; prefer objective description." },
  { term: "opens up new avenues", explanation: "Promotional phrase; avoid vague hype." },
  { term: "holy grail", explanation: "Highly subjective metaphor, avoid in scientific writing." },
  { term: "best", explanation: "Absolute superlative; usually subjective." },
  { term: "highest", explanation: "Superlative requiring precise data context." },
  { term: "lowest", explanation: "Superlative requiring precise data context." },
  { term: "strongest", explanation: "Subjective; specify metrics instead." },
  { term: "unparalleled", explanation: "Absolute claim, often unverifiable." },
  { term: "unmatched", explanation: "Absolute claim, avoid subjective superlatives." },
  { term: "unrivaled", explanation: "Absolute claim, usually promotional." },
  { term: "extraordinary", explanation: "Subjective hype term." },
  { term: "exceptional", explanation: "Subjective evaluation." },
  { term: "unprecedentedly", explanation: "Adverb form of 'unprecedented', same caution applies." },
  { term: "landmark", explanation: "Strong hype implying major significance." },
  { term: "transformative", explanation: "Subjective; describe specific impact instead." },
  { term: "revolutionary", explanation: "Promotional, avoid hype in scientific claims." },
  { term: "state-of-the-art", explanation: "Buzzword; specify technical advances concretely." },
  { term: "game changer", explanation: "Informal and promotional phrase." },
  { term: "cutting-edge", explanation: "Buzzword; clarify novelty and contribution." },
  { term: "best-in-class", explanation: "Marketing phrase; avoid in objective writing." },
  { term: "leading", explanation: "Subjective, relative to what? Be specific." },
  { term: "break new ground", explanation: "Promotional phrase, avoid vague claims." },
  { term: "benchmark", explanation: "Often used vaguely; specify exact standards." },
  { term: "exciting", explanation: "Subjective, avoid in scientific writing." },

];

/**
 * Exceptions list
 * These are phrases that should NOT be flagged,
 * even though they contain hype words.
 */
window.hypeLessExceptions = [
  "first-principles",
  "unique identifier",
  "to record",
  "recording",
  "benchmark experiment",
  "benchmark test",
  "first step",
  "First,",
  "firstly",
  "first-order",
  "leading to",
  "we first",
  "best practice",
  "New Zealand",
  "lowest unoccupied molecular orbital",
  "highest occupied molecular orbital",
  "extreme value theory"// Add more if needed
];

