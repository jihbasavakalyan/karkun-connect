/**
 * KC-016 — Local speech playback helpers for Digital Rafeeq UI.
 * Uses browser speechSynthesis only — no cloud TTS.
 * Future cloud adapters can implement the same SpeakPlaybackAdapter shape.
 */

export type SpeakPlaybackState = 'idle' | 'loading' | 'playing' | 'error'

export type SpeakPlaybackAdapter = {
  speak: (text: string) => Promise<void>
  stop: () => void
  isAvailable: () => boolean
}

function pickUrduVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null
  const voices = window.speechSynthesis.getVoices()
  return (
    voices.find((voice) => /^ur(-|$)/i.test(voice.lang)) ??
    voices.find((voice) => /urdu/i.test(voice.name)) ??
    null
  )
}

export function isLocalSpeechAvailable(): boolean {
  return typeof window !== 'undefined' && Boolean(window.speechSynthesis)
}

export function stopLocalSpeech(): void {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel()
  }
}

/**
 * Speak Rafeeq response text via local browser TTS.
 * Notifies when falling back from Urdu voice — UI shows the message.
 */
export function speakRafeeqText(
  text: string,
  onFallbackNotice?: (message: string) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!isLocalSpeechAvailable()) {
      onFallbackNotice?.(
        'اردو آواز اس آلے پر دستیاب نہیں۔ جواب متن میں دکھایا گیا ہے؛ اگر ضروری ہو تو انگریزی آواز استعمال ہو سکتی ہے۔',
      )
      reject(new Error('speech-unavailable'))
      return
    }

    window.speechSynthesis.cancel()
    const spoken = text.replace(/^السلام علیکم\s*/u, '').trim() || text
    const utterance = new SpeechSynthesisUtterance(spoken)
    utterance.rate = 1
    const urduVoice = pickUrduVoice()
    if (urduVoice) {
      utterance.voice = urduVoice
      utterance.lang = urduVoice.lang || 'ur-IN'
    } else {
      onFallbackNotice?.(
        'اردو آواز اس براؤزر میں دستیاب نہیں۔ جواب اردو متن میں ہے؛ بولنے کے لیے انگریزی آواز استعمال ہو رہی ہے۔',
      )
      utterance.lang = 'en-IN'
    }
    utterance.onend = () => resolve()
    utterance.onerror = () => reject(new Error('speech-error'))
    window.speechSynthesis.speak(utterance)
  })
}

export const localSpeechAdapter: SpeakPlaybackAdapter = {
  speak: (text) => speakRafeeqText(text),
  stop: stopLocalSpeech,
  isAvailable: isLocalSpeechAvailable,
}
