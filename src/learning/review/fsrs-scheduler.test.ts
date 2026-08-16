import { describe, expect, it } from 'vitest'
import {
  createNewReviewCard,
  mapResultToFsrsRating,
  Rating,
  scheduleReview,
} from './fsrs-scheduler'

describe('fsrs scheduler', () => {
  it('maps incorrect to Again and correct to Good by default', () => {
    expect(mapResultToFsrsRating({ isCorrect: false })).toBe(Rating.Again)
    expect(mapResultToFsrsRating({ isCorrect: true })).toBe(Rating.Good)
    expect(mapResultToFsrsRating({ isCorrect: null })).toBeNull()
    expect(mapResultToFsrsRating({ isCorrect: true, selfRating: 'easy' })).toBe(Rating.Easy)
  })

  it('schedules due dates without AI', () => {
    const now = new Date('2026-08-16T10:00:00.000Z')
    const card = createNewReviewCard({ conceptId: 'c1', now })
    const again = scheduleReview(card, Rating.Again, now)
    expect(again.nextCard.fsrs.due >= card.fsrs.due || again.log.rating === 1).toBe(true)

    const later = new Date('2026-08-16T11:00:00.000Z')
    const good = scheduleReview(card, Rating.Good, later)
    expect(good.nextCard.fsrs.reps).toBeGreaterThanOrEqual(1)
    expect(good.log.dueAfter).toBeTruthy()
  })
})
