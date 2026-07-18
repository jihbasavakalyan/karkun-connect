import { useUserPreferences } from '@/hooks/useUserPreferences'
import type { RafeeqVoiceLanguage, RafeeqVoiceSpeed } from '@/types/userPreferences.types'
import {
  SettingsPlaceholder,
  SettingsRow,
  SettingsSection,
  SettingsSelect,
  SettingsToggle,
} from './SettingsPrimitives'

const SPEED_OPTIONS = [
  { value: 'slow', label: 'Slow' },
  { value: 'normal', label: 'Normal' },
  { value: 'fast', label: 'Fast' },
] as const

const LANGUAGE_OPTIONS = [
  { value: 'urdu', label: 'Urdu' },
  { value: 'urdu_english_names', label: 'Urdu + English Names' },
] as const

export function RafeeqSettingsSection() {
  const { preferences, setRafeeq } = useUserPreferences()
  const { rafeeq } = preferences

  return (
    <SettingsSection
      title="Digital Rafeeq"
      description="Personalize the companion experience. Recommendations stay optional."
    >
      <SettingsRow label="Voice Responses" hint="Play spoken replies when you ask">
        <SettingsToggle
          label="Voice Responses"
          checked={rafeeq.voiceResponses}
          onChange={(voiceResponses) => setRafeeq({ voiceResponses })}
        />
      </SettingsRow>
      <SettingsRow label="Voice Speed">
        <SettingsSelect
          aria-label="Voice Speed"
          value={rafeeq.voiceSpeed}
          options={SPEED_OPTIONS}
          onChange={(value) => setRafeeq({ voiceSpeed: value as RafeeqVoiceSpeed })}
        />
      </SettingsRow>
      <SettingsRow label="Voice Language">
        <SettingsSelect
          aria-label="Voice Language"
          value={rafeeq.voiceLanguage}
          options={LANGUAGE_OPTIONS}
          onChange={(value) => setRafeeq({ voiceLanguage: value as RafeeqVoiceLanguage })}
        />
      </SettingsRow>
      <SettingsRow label="Suggested Questions">
        <SettingsToggle
          label="Suggested Questions"
          checked={rafeeq.suggestedQuestions}
          onChange={(suggestedQuestions) => setRafeeq({ suggestedQuestions })}
        />
      </SettingsRow>
      <SettingsRow label="Daily Greeting">
        <SettingsToggle
          label="Daily Greeting"
          checked={rafeeq.dailyGreeting}
          onChange={(dailyGreeting) => setRafeeq({ dailyGreeting })}
        />
      </SettingsRow>
      <SettingsRow
        label="Voice Auto Play"
        hint="Kept off by default so audio never starts unexpectedly"
      >
        <SettingsToggle
          label="Voice Auto Play"
          checked={rafeeq.voiceAutoPlay}
          onChange={(voiceAutoPlay) => setRafeeq({ voiceAutoPlay })}
        />
      </SettingsRow>

      <div className="grid gap-2 sm:grid-cols-3">
        <SettingsPlaceholder label="Personality" />
        <SettingsPlaceholder label="Male / Female Voice" />
        <SettingsPlaceholder label="Conversation History" />
      </div>
    </SettingsSection>
  )
}
