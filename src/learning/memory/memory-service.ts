import type { ConceptMasteryRepository, ConceptRepository, ReviewCardRepository, SkillAttemptRepository } from '../../db/repositories/learning-repositories'
import type { SkillAttemptRecord } from '../../db/schema/types'

export type MemorySnapshot = {
  conceptCount: number
  strongCount: number
  weakCount: number
  reviewCardCount: number
  averageStrength: number
  skillCounts: Record<SkillAttemptRecord['mode'], number>
  recentSkillAttempts: SkillAttemptRecord[]
  strongest: Array<{ id: string; label: string; strength: number }>
  weakest: Array<{ id: string; label: string; strength: number }>
}

export class MemoryService {
  constructor(
    private readonly concepts: ConceptRepository,
    private readonly mastery: ConceptMasteryRepository,
    private readonly reviewCards: ReviewCardRepository,
    private readonly skillAttempts: SkillAttemptRepository,
  ) {}

  async getSnapshot(): Promise<MemorySnapshot> {
    const [concepts, mastery, reviewCards, recentSkillAttempts] = await Promise.all([
      this.concepts.listAll(),
      this.mastery.listAll(),
      this.reviewCards.listAll(),
      this.skillAttempts.listRecent(40),
    ])
    const byConcept = new Map(concepts.map((concept) => [concept.id, concept]))
    const ranked = mastery
      .map((row) => ({ id: row.conceptId, label: byConcept.get(row.conceptId)?.canonicalLabel ?? 'Unknown concept', strength: row.strength }))
      .sort((a, b) => b.strength - a.strength)
    const averageStrength = mastery.length === 0 ? 0 : mastery.reduce((sum, row) => sum + row.strength, 0) / mastery.length
    return {
      conceptCount: concepts.length,
      strongCount: mastery.filter((row) => row.strength >= 0.75).length,
      weakCount: mastery.filter((row) => row.isWeak || row.strength < 0.45).length,
      reviewCardCount: reviewCards.length,
      averageStrength,
      skillCounts: {
        pronunciation: recentSkillAttempts.filter((item) => item.mode === 'pronunciation').length,
        listening: recentSkillAttempts.filter((item) => item.mode === 'listening').length,
        reading: recentSkillAttempts.filter((item) => item.mode === 'reading').length,
      },
      recentSkillAttempts,
      strongest: ranked.slice(0, 5),
      weakest: [...ranked].reverse().slice(0, 5),
    }
  }
}
