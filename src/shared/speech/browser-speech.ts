export type SpeakOptions = {
  rate?: number
  pitch?: number
  voiceURI?: string
}

export type SpeechVoiceOption = {
  name: string
  lang: string
  voiceURI: string
  localService: boolean
}

interface SpeechRecognitionResultLike {
  0: { transcript: string; confidence: number }
}

interface SpeechRecognitionEventLike extends Event {
  results: ArrayLike<SpeechRecognitionResultLike>
}

interface SpeechRecognitionErrorEventLike extends Event {
  error?: string
  message?: string
}

interface SpeechRecognitionLike extends EventTarget {
  lang: string
  interimResults: boolean
  continuous: boolean
  maxAlternatives: number
  start(): void
  stop(): void
  abort(): void
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null
  onend: (() => void) | null
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike

function getRecognitionConstructor(): SpeechRecognitionConstructor | null {
  const scope = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor
    webkitSpeechRecognition?: SpeechRecognitionConstructor
  }
  return scope.SpeechRecognition ?? scope.webkitSpeechRecognition ?? null
}

export function speechSynthesisSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window
}

export function speechRecognitionSupported(): boolean {
  return typeof window !== 'undefined' && getRecognitionConstructor() !== null
}

export function listEnglishVoices(): SpeechVoiceOption[] {
  if (!speechSynthesisSupported()) return []
  return window.speechSynthesis
    .getVoices()
    .filter((voice) => voice.lang.toLowerCase().startsWith('en'))
    .map((voice) => ({
      name: voice.name,
      lang: voice.lang,
      voiceURI: voice.voiceURI,
      localService: voice.localService,
    }))
}

export function speakEnglish(text: string, options: SpeakOptions = {}): Promise<void> {
  if (!speechSynthesisSupported()) {
    return Promise.reject(new Error('Speech synthesis is not supported in this browser.'))
  }
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'en-US'
  utterance.rate = options.rate ?? 0.9
  utterance.pitch = options.pitch ?? 1
  if (options.voiceURI) {
    const voice = window.speechSynthesis.getVoices().find((item) => item.voiceURI === options.voiceURI)
    if (voice) {
      utterance.voice = voice
      utterance.lang = voice.lang
    }
  }
  return new Promise((resolve, reject) => {
    utterance.onend = () => resolve()
    utterance.onerror = (event) => reject(new Error(event.error || 'Speech playback failed.'))
    window.speechSynthesis.speak(utterance)
  })
}

export function stopSpeaking(): void {
  if (speechSynthesisSupported()) window.speechSynthesis.cancel()
}

export function recognizeEnglishOnce(): Promise<{ transcript: string; confidence: number | null }> {
  const Recognition = getRecognitionConstructor()
  if (!Recognition) {
    return Promise.reject(new Error('Speech recognition is not supported in this browser.'))
  }
  return new Promise((resolve, reject) => {
    const recognition = new Recognition()
    let settled = false
    recognition.lang = 'en-US'
    recognition.interimResults = false
    recognition.continuous = false
    recognition.maxAlternatives = 1
    recognition.onresult = (event) => {
      const best = event.results[0]?.[0]
      settled = true
      recognition.stop()
      resolve({ transcript: best?.transcript ?? '', confidence: Number.isFinite(best?.confidence) ? best.confidence : null })
    }
    recognition.onerror = (event) => {
      settled = true
      reject(new Error(event.message || event.error || 'Speech recognition failed.'))
    }
    recognition.onend = () => {
      if (!settled) reject(new Error('No speech was detected.'))
    }
    recognition.start()
  })
}
