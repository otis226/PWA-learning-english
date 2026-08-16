import type { AIProviderCapabilities } from '../../ai/schemas/capabilities'

export type ProviderProtocol = 'chat_completions'

/** Non-secret AI provider profile persisted in IndexedDB. */
export type ProviderProfileRecord = {
  id: string
  displayName: string
  baseUrl: string
  model: string
  protocol: ProviderProtocol
  capabilityOverrides?: Partial<AIProviderCapabilities>
  createdAt: string
  updatedAt: string
}

export type AppSettingsRecord = {
  id: 'app'
  activeProviderProfileId: string | null
  updatedAt: string
  /** ISO timestamp of last meaningful learning-data change (backup reminder). */
  lastMeaningfulChangeAt?: string | null
  lastExportAt?: string | null
}

export type MetaRecord = {
  key: string
  value: string
}

export type SourceType = 'pasted_text' | 'vocabulary_list' | 'custom_topic'

export type LearningGoal =
  | 'vocabulary'
  | 'grammar'
  | 'prepositions'
  | 'collocations'
  | 'reading'
  | 'mixed'
  | 'custom'

export type PackStatus = 'draft' | 'ready' | 'archived'

export type ConceptKind =
  | 'vocabulary'
  | 'grammar'
  | 'preposition'
  | 'collocation'
  | 'reading'
  | 'other'

export type ExerciseType =
  | 'flashcard'
  | 'multiple_choice'
  | 'cloze'
  | 'true_false'
  | 'short_answer'

export type StudySessionKind = 'practice' | 'review'
export type StudySessionStatus = 'in_progress' | 'completed' | 'abandoned'

export type GenerationProvenance = {
  providerProfileId: string
  model: string
  promptVersion: string
  schemaVersion: string
  sourceContentHash: string
  generatedAt: string
  strategy?: string
}

export type SourceRecord = {
  id: string
  type: SourceType
  title: string
  rawContent: string
  normalizedContent: string
  contentHash: string
  charCount: number
  createdAt: string
  updatedAt: string
}

export type LearningPackRecord = {
  id: string
  sourceId: string
  title: string
  learningGoal: LearningGoal
  customGoalText?: string
  status: PackStatus
  estimatedCefr?: string | null
  learningObjectives: string[]
  skills: string[]
  conceptIds: string[]
  exerciseIds: string[]
  suggestedProgression: string[]
  analysisNotes?: string | null
  provenance: GenerationProvenance
  createdAt: string
  updatedAt: string
}

export type ConceptRecord = {
  id: string
  /** Conservative identity key for dedup (normalized lemma|kind|pattern). */
  identityKey: string
  canonicalLabel: string
  kind: ConceptKind
  definition?: string | null
  notes?: string | null
  createdAt: string
  updatedAt: string
}

export type ConceptOccurrenceRecord = {
  id: string
  conceptId: string
  sourceId: string
  packId: string
  evidenceText?: string | null
  contextNote?: string | null
  createdAt: string
}

export type ExercisePayload =
  | {
      type: 'flashcard'
      front: string
      back: string
    }
  | {
      type: 'multiple_choice'
      question: string
      options: string[]
      correctIndex: number
    }
  | {
      type: 'cloze'
      sentenceWithBlank: string
      acceptedAnswers: string[]
    }
  | {
      type: 'true_false'
      statement: string
      correct: boolean
    }
  | {
      type: 'short_answer'
      prompt: string
      acceptedAnswers: string[]
      allowAiGrade: boolean
    }

export type ExerciseRecord = {
  id: string
  packId: string
  sourceId: string
  type: ExerciseType
  skill: string
  targetConceptIds: string[]
  prompt: string
  payload: ExercisePayload
  explanation: string
  evidenceText?: string | null
  difficulty?: string | null
  provenance: GenerationProvenance
  createdAt: string
}

export type StudySessionRecord = {
  id: string
  packId: string | null
  kind: StudySessionKind
  status: StudySessionStatus
  exerciseIds: string[]
  currentIndex: number
  correctCount: number
  incorrectCount: number
  startedAt: string
  completedAt?: string | null
  updatedAt: string
}

export type AttemptRecord = {
  id: string
  sessionId: string
  exerciseId: string
  packId: string | null
  conceptIds: string[]
  answer: unknown
  isCorrect: boolean | null
  score: number | null
  selfRating?: 'again' | 'hard' | 'good' | 'easy' | null
  gradingMode: 'deterministic' | 'self' | 'ai' | 'uncertain'
  explanationShown?: string | null
  misconceptionTags: string[]
  responseTimeMs?: number | null
  createdAt: string
}

export type MistakeSignalRecord = {
  id: string
  conceptId: string
  attemptId: string
  tag: string
  detail?: string | null
  createdAt: string
}

export type ConceptMasteryRecord = {
  conceptId: string
  strength: number
  correctCount: number
  incorrectCount: number
  lastPracticedAt: string | null
  isWeak: boolean
  updatedAt: string
}

/** Serialized ts-fsrs Card fields we persist. */
export type FsrsCardState = {
  due: string
  stability: number
  difficulty: number
  elapsed_days: number
  scheduled_days: number
  learning_steps: number
  reps: number
  lapses: number
  state: number
  last_review?: string | null
}

export type ReviewCardRecord = {
  id: string
  conceptId: string
  /** Preferred stored exercise for offline review when available. */
  preferredExerciseId?: string | null
  fsrs: FsrsCardState
  createdAt: string
  updatedAt: string
}

export type ReviewLogRecord = {
  id: string
  reviewCardId: string
  conceptId: string
  rating: 1 | 2 | 3 | 4
  stateBefore: number
  stateAfter: number
  dueBefore: string
  dueAfter: string
  scheduledDays: number
  attemptId?: string | null
  createdAt: string
}
