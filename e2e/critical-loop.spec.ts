import { expect, test, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'

/**
 * Critical Learning Studio loop with a page-level mock of Chat Completions.
 * Covers provider config -> AI pack -> practice -> multimodal study -> memory -> export/restore.
 */
test.describe('Learning Studio critical loop', () => {
  test('mock provider through practice, multimodal study, memory, export restore', async ({ page }) => {
    await installMockProvider(page)

    await page.goto('/')
    await expect(page.getByRole('heading', { name: /^today$/i })).toBeVisible()

    await page.goto('/settings/ai')
    await page.getByLabel(/model \(free text\)/i).fill('mock-e2e-model')
    await page.getByLabel('API key', { exact: true }).fill('sk-e2e-test-key-not-real')
    await page.getByRole('button', { name: /save provider/i }).click()
    await expect(page.getByText(/provider profile saved/i)).toBeVisible({ timeout: 10_000 })

    await page.goto('/learn/new')
    await page.getByLabel(/paste content/i).fill(
      'Despite the heavy rain, the team continued the match. Although fans left early, players stayed focused.',
    )
    await page.getByRole('button', { name: /generate lesson/i }).click()

    await expect(page.getByText(/concepts/i).first()).toBeVisible({ timeout: 20_000 })

    await page.getByRole('button', { name: /generate exercises/i }).click()
    await expect(page.getByText(/generated/i)).toBeVisible({ timeout: 20_000 })

    await page.getByRole('button', { name: /regenerate exercises/i }).click()
    await expect(page.getByText(/generated/i)).toBeVisible({ timeout: 20_000 })
    await expect(page.getByRole('heading', { name: /exercises \(2\)/i })).toBeVisible()

    await page.getByRole('button', { name: /start practice/i }).click()
    await expect(page.getByRole('heading', { name: /practice/i })).toBeVisible()
    await expect(page.getByText('1 / 2')).toBeVisible()

    const showAnswer = page.getByRole('button', { name: /show answer/i })
    if (await showAnswer.isVisible().catch(() => false)) {
      await showAnswer.click()
      await page.getByRole('button', { name: /^good$/i }).click()
      const next = page.getByRole('button', { name: /^next$/i })
      if (await next.isVisible().catch(() => false)) {
        await next.click()
      }
    }

    const mcqOption = page.locator('label.choice-card').first()
    if (await mcqOption.isVisible().catch(() => false)) {
      await mcqOption.click()
      await page.getByRole('button', { name: /^submit$/i }).click()
      await expect(page.getByText(/explanation/i)).toBeVisible()
    }

    await page.goto('/study')
    await expect(page.getByRole('heading', { name: /^study$/i })).toBeVisible()
    await page.getByRole('link', { name: /listening/i }).click()
    await expect(page.getByRole('heading', { name: /^listening$/i })).toBeVisible()
    await page.getByLabel(/type what you hear/i).fill('Despite the heavy rain')
    await page.getByRole('button', { name: /check dictation/i }).click()
    await expect(page.getByText(/100% match/i)).toBeVisible()

    await page.goto('/study')
    await page.getByRole('link', { name: /pronunciation/i }).click()
    await expect(page.getByRole('heading', { name: /^pronunciation$/i })).toBeVisible()

    await page.goto('/memory')
    await expect(page.getByRole('heading', { name: /^memory$/i })).toBeVisible()
    await expect(page.getByLabel('Listening attempts')).toContainText('1')

    await page.goto('/')
    await expect(page.getByRole('link', { name: /e2e connectors/i }).first()).toBeVisible({ timeout: 10_000 })

    await page.goto('/review')
    await expect(page.getByRole('heading', { name: /due review/i })).toBeVisible()

    await page.goto('/settings/data')
    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: /download export/i }).click()
    const download = await downloadPromise
    const path = await download.path()
    expect(path).toBeTruthy()

    page.once('dialog', (dialog) => dialog.accept())
    await page.getByRole('button', { name: /clear learning data/i }).click()
    await expect(page.getByText(/cleared/i)).toBeVisible({ timeout: 10_000 })

    const jsonText = await readFile(path!, 'utf8')
    expect(jsonText).not.toMatch(/apiKey/i)
    expect(jsonText).not.toMatch(/sk-e2e-test-key/)
    const envelope = JSON.parse(jsonText) as {
      format: string
      schemaVersion: number
      data: { learningPacks: unknown[]; skillAttempts: unknown[] }
    }
    expect(envelope.format).toBe('pwa-learning-english-export')
    expect(envelope.schemaVersion).toBe(4)
    expect(envelope.data.learningPacks.length).toBeGreaterThan(0)
    expect(envelope.data.skillAttempts.length).toBeGreaterThan(0)

    await page.setInputFiles('#importFile', {
      name: 'restore.json',
      mimeType: 'application/json',
      buffer: Buffer.from(jsonText, 'utf8'),
    })
    await expect(page.getByText(/import valid/i)).toBeVisible({ timeout: 10_000 })
    page.once('dialog', (dialog) => dialog.accept())
    await page.getByRole('button', { name: /replace local data from import/i }).click()
    await expect(page.getByText(/restored/i)).toBeVisible({ timeout: 15_000 })

    await page.goto('/')
    await expect(page.getByRole('link', { name: /e2e connectors/i }).first()).toBeVisible({ timeout: 15_000 })
  })
})

async function installMockProvider(page: Page): Promise<void> {
  await page.route('**/chat/completions', async (route) => {
    const body = route.request().postData() ?? ''
    const lower = body.toLowerCase()
    let content: unknown = {
      schemaVersion: 'analysis.v1',
      title: 'E2E connectors',
      estimatedCefr: 'B1',
      learningObjectives: ['Use despite correctly'],
      skills: ['grammar'],
      concepts: [
        {
          label: 'despite + noun/V-ing',
          kind: 'grammar',
          definition: 'Despite takes a noun phrase.',
          evidenceText: 'Despite the heavy rain',
          patternHint: 'despite + noun',
        },
        {
          label: 'although + clause',
          kind: 'grammar',
          definition: 'Although takes a clause.',
          evidenceText: 'Although fans left early',
          patternHint: 'although + clause',
        },
      ],
      suggestedProgression: ['recognize', 'produce'],
      notes: null,
    }

    if (lower.includes('exercise-plan.v1') || lower.includes('plan english')) {
      content = {
        schemaVersion: 'exercise-plan.v1',
        items: [
          {
            conceptLabel: 'despite + noun/V-ing',
            exerciseType: 'flashcard',
            skill: 'grammar',
          },
          {
            conceptLabel: 'despite + noun/V-ing',
            exerciseType: 'multiple_choice',
            skill: 'grammar',
          },
        ],
      }
    } else if (lower.includes('exercises.v1') || lower.includes('generate english learning')) {
      content = {
        schemaVersion: 'exercises.v1',
        exercises: [
          {
            type: 'flashcard',
            skill: 'grammar',
            targetConceptLabels: ['despite + noun/V-ing'],
            prompt: 'despite pattern',
            payload: {
              type: 'flashcard',
              front: 'despite + ?',
              back: 'noun or V-ing',
            },
            explanation: 'Despite takes a noun phrase.',
          },
          {
            type: 'multiple_choice',
            skill: 'grammar',
            targetConceptLabels: ['despite + noun/V-ing'],
            prompt: 'Choose',
            payload: {
              type: 'multiple_choice',
              question: 'Which is correct?',
              options: [
                'Despite the rain, we went out.',
                'Despite it rained, we went out.',
              ],
              correctIndex: 0,
            },
            explanation: 'Despite + noun.',
          },
        ],
      }
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        choices: [{ message: { role: 'assistant', content: JSON.stringify(content) } }],
      }),
    })
  })
}
