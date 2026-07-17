/**
 * Browser SpeechRecognition hook (KC-007).
 * Falls back gracefully when unsupported or permission denied.
 */

import { useCallback, useEffect, useRef, useState } from 'react'

export type VoiceStatus = 'idle' | 'listening' | 'unsupported' | 'denied' | 'error'

type SpeechRecognitionLike = {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
}

type SpeechRecognitionEventLike = {
  resultIndex: number
  results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean; length: number }>
}

function getSpeechRecognitionConstructor():
  | (new () => SpeechRecognitionLike)
  | undefined {
  if (typeof window === 'undefined') return undefined
  const w = window as Window & {
    SpeechRecognition?: new () => SpeechRecognitionLike
    webkitSpeechRecognition?: new () => SpeechRecognitionLike
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition
}

export function useSpeechRecognition(options?: {
  lang?: string
  onFinalTranscript?: (text: string) => void
}) {
  const [status, setStatus] = useState<VoiceStatus>('idle')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [supported, setSupported] = useState(true)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const silenceTimerRef = useRef<number | null>(null)
  const onFinalRef = useRef(options?.onFinalTranscript)
  onFinalRef.current = options?.onFinalTranscript

  useEffect(() => {
    const Ctor = getSpeechRecognitionConstructor()
    if (!Ctor) {
      setSupported(false)
      setStatus('unsupported')
      return
    }

    const recognition = new Ctor()
    recognition.lang = options?.lang ?? 'en-IN'
    recognition.continuous = false
    recognition.interimResults = true
    recognition.maxAlternatives = 1

    recognition.onresult = (event) => {
      let interim = ''
      let finalText = ''
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i]
        const transcript = result[0]?.transcript ?? ''
        if (result.isFinal) {
          finalText += transcript
        } else {
          interim += transcript
        }
      }
      setInterimTranscript(interim)
      if (finalText.trim()) {
        onFinalRef.current?.(finalText.trim())
        setInterimTranscript('')
      }
      if (silenceTimerRef.current) {
        window.clearTimeout(silenceTimerRef.current)
      }
      silenceTimerRef.current = window.setTimeout(() => {
        try {
          recognition.stop()
        } catch {
          // ignore
        }
      }, 2500)
    }

    recognition.onerror = (event) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setStatus('denied')
      } else if (event.error !== 'aborted' && event.error !== 'no-speech') {
        setStatus('error')
      }
    }

    recognition.onend = () => {
      setStatus((current) => (current === 'listening' ? 'idle' : current))
      setInterimTranscript('')
    }

    recognitionRef.current = recognition
    return () => {
      try {
        recognition.abort()
      } catch {
        // ignore
      }
      if (silenceTimerRef.current) {
        window.clearTimeout(silenceTimerRef.current)
      }
    }
  }, [options?.lang])

  const start = useCallback(() => {
    if (!recognitionRef.current) {
      setStatus('unsupported')
      return
    }
    try {
      setStatus('listening')
      setInterimTranscript('')
      recognitionRef.current.start()
    } catch {
      setStatus('error')
    }
  }, [])

  const stop = useCallback(() => {
    try {
      recognitionRef.current?.stop()
    } catch {
      // ignore
    }
    setStatus('idle')
  }, [])

  return {
    supported,
    status,
    interimTranscript,
    start,
    stop,
  }
}
