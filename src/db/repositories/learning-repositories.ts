import type { AppDatabase } from '../schema/app-database'
import type {
  AttemptRecord,
  ConceptMasteryRecord,
  ConceptOccurrenceRecord,
  ConceptRecord,
  ExerciseRecord,
  LearningPackRecord,
  MistakeSignalRecord,
  ReviewCardRecord,
  ReviewLogRecord,
  SourceRecord,
  StudySessionRecord,
} from '../schema/types'

export class SourceRepository {
  constructor(private readonly db: AppDatabase) {}

  async put(record: SourceRecord): Promise<void> {
    await this.db.sources.put(record)
  }

  async getById(id: string): Promise<SourceRecord | undefined> {
    return this.db.sources.get(id)
  }

  async listRecent(limit = 20): Promise<SourceRecord[]> {
    return this.db.sources.orderBy('createdAt').reverse().limit(limit).toArray()
  }

  async clear(): Promise<void> {
    await this.db.sources.clear()
  }
}

export class LearningPackRepository {
  constructor(private readonly db: AppDatabase) {}

  async put(record: LearningPackRecord): Promise<void> {
    await this.db.learningPacks.put(record)
  }

  async getById(id: string): Promise<LearningPackRecord | undefined> {
    return this.db.learningPacks.get(id)
  }

  async listRecent(limit = 20): Promise<LearningPackRecord[]> {
    return this.db.learningPacks.orderBy('updatedAt').reverse().limit(limit).toArray()
  }

  async update(record: LearningPackRecord): Promise<void> {
    await this.db.learningPacks.put(record)
  }

  async clear(): Promise<void> {
    await this.db.learningPacks.clear()
  }
}

export class ConceptRepository {
  constructor(private readonly db: AppDatabase) {}

  async put(record: ConceptRecord): Promise<void> {
    await this.db.concepts.put(record)
  }

  async putMany(records: ConceptRecord[]): Promise<void> {
    await this.db.concepts.bulkPut(records)
  }

  async getById(id: string): Promise<ConceptRecord | undefined> {
    return this.db.concepts.get(id)
  }

  async getByIdentityKey(identityKey: string): Promise<ConceptRecord | undefined> {
    return this.db.concepts.where('identityKey').equals(identityKey).first()
  }

  async getMany(ids: string[]): Promise<ConceptRecord[]> {
    const rows = await this.db.concepts.bulkGet(ids)
    return rows.filter((r): r is ConceptRecord => Boolean(r))
  }

  async listAll(): Promise<ConceptRecord[]> {
    return this.db.concepts.toArray()
  }

  async clear(): Promise<void> {
    await this.db.concepts.clear()
  }
}

export class ConceptOccurrenceRepository {
  constructor(private readonly db: AppDatabase) {}

  async putMany(records: ConceptOccurrenceRecord[]): Promise<void> {
    await this.db.conceptOccurrences.bulkPut(records)
  }

  async listByPack(packId: string): Promise<ConceptOccurrenceRecord[]> {
    return this.db.conceptOccurrences.where('packId').equals(packId).toArray()
  }

  async listByConcept(conceptId: string): Promise<ConceptOccurrenceRecord[]> {
    return this.db.conceptOccurrences.where('conceptId').equals(conceptId).toArray()
  }

  async listAll(): Promise<ConceptOccurrenceRecord[]> {
    return this.db.conceptOccurrences.toArray()
  }

  async clear(): Promise<void> {
    await this.db.conceptOccurrences.clear()
  }
}

export class ExerciseRepository {
  constructor(private readonly db: AppDatabase) {}

  async putMany(records: ExerciseRecord[]): Promise<void> {
    await this.db.exercises.bulkPut(records)
  }

  async getById(id: string): Promise<ExerciseRecord | undefined> {
    return this.db.exercises.get(id)
  }

  async getMany(ids: string[]): Promise<ExerciseRecord[]> {
    const rows = await this.db.exercises.bulkGet(ids)
    return rows.filter((r): r is ExerciseRecord => Boolean(r))
  }

  async listByPack(packId: string): Promise<ExerciseRecord[]> {
    return this.db.exercises.where('packId').equals(packId).toArray()
  }

  async listAll(): Promise<ExerciseRecord[]> {
    return this.db.exercises.toArray()
  }

  async clear(): Promise<void> {
    await this.db.exercises.clear()
  }
}

export class StudySessionRepository {
  constructor(private readonly db: AppDatabase) {}

  async put(record: StudySessionRecord): Promise<void> {
    await this.db.studySessions.put(record)
  }

  async getById(id: string): Promise<StudySessionRecord | undefined> {
    return this.db.studySessions.get(id)
  }

  async listRecent(limit = 20): Promise<StudySessionRecord[]> {
    return this.db.studySessions.orderBy('updatedAt').reverse().limit(limit).toArray()
  }

  async listAll(): Promise<StudySessionRecord[]> {
    return this.db.studySessions.toArray()
  }

  async clear(): Promise<void> {
    await this.db.studySessions.clear()
  }
}

export class AttemptRepository {
  constructor(private readonly db: AppDatabase) {}

  async put(record: AttemptRecord): Promise<void> {
    await this.db.attempts.put(record)
  }

  async listBySession(sessionId: string): Promise<AttemptRecord[]> {
    return this.db.attempts.where('sessionId').equals(sessionId).sortBy('createdAt')
  }

  async listRecent(limit = 50): Promise<AttemptRecord[]> {
    return this.db.attempts.orderBy('createdAt').reverse().limit(limit).toArray()
  }

  async listAll(): Promise<AttemptRecord[]> {
    return this.db.attempts.toArray()
  }

  async clear(): Promise<void> {
    await this.db.attempts.clear()
  }
}

export class MistakeSignalRepository {
  constructor(private readonly db: AppDatabase) {}

  async put(record: MistakeSignalRecord): Promise<void> {
    await this.db.mistakeSignals.put(record)
  }

  async putMany(records: MistakeSignalRecord[]): Promise<void> {
    await this.db.mistakeSignals.bulkPut(records)
  }

  async listByConcept(conceptId: string): Promise<MistakeSignalRecord[]> {
    return this.db.mistakeSignals.where('conceptId').equals(conceptId).toArray()
  }

  async listAll(): Promise<MistakeSignalRecord[]> {
    return this.db.mistakeSignals.toArray()
  }

  async clear(): Promise<void> {
    await this.db.mistakeSignals.clear()
  }
}

export class ConceptMasteryRepository {
  constructor(private readonly db: AppDatabase) {}

  async get(conceptId: string): Promise<ConceptMasteryRecord | undefined> {
    return this.db.conceptMastery.get(conceptId)
  }

  async put(record: ConceptMasteryRecord): Promise<void> {
    await this.db.conceptMastery.put(record)
  }

  async listWeak(limit = 20): Promise<ConceptMasteryRecord[]> {
    const all = await this.db.conceptMastery.toArray()
    return all
      .filter((row) => row.isWeak || row.strength < 0.45)
      .sort((a, b) => a.strength - b.strength)
      .slice(0, limit)
  }

  async listAll(): Promise<ConceptMasteryRecord[]> {
    return this.db.conceptMastery.toArray()
  }

  async clear(): Promise<void> {
    await this.db.conceptMastery.clear()
  }
}

export class ReviewCardRepository {
  constructor(private readonly db: AppDatabase) {}

  async put(record: ReviewCardRecord): Promise<void> {
    await this.db.reviewCards.put(record)
  }

  async getById(id: string): Promise<ReviewCardRecord | undefined> {
    return this.db.reviewCards.get(id)
  }

  async getByConceptId(conceptId: string): Promise<ReviewCardRecord | undefined> {
    return this.db.reviewCards.where('conceptId').equals(conceptId).first()
  }

  async listAll(): Promise<ReviewCardRecord[]> {
    return this.db.reviewCards.toArray()
  }

  async listDue(nowIso: string, limit = 50): Promise<ReviewCardRecord[]> {
    const all = await this.db.reviewCards.toArray()
    return all
      .filter((card) => card.fsrs.due <= nowIso)
      .sort((a, b) => a.fsrs.due.localeCompare(b.fsrs.due))
      .slice(0, limit)
  }

  async clear(): Promise<void> {
    await this.db.reviewCards.clear()
  }
}

export class ReviewLogRepository {
  constructor(private readonly db: AppDatabase) {}

  async put(record: ReviewLogRecord): Promise<void> {
    await this.db.reviewLogs.put(record)
  }

  async listAll(): Promise<ReviewLogRecord[]> {
    return this.db.reviewLogs.toArray()
  }

  async clear(): Promise<void> {
    await this.db.reviewLogs.clear()
  }
}
