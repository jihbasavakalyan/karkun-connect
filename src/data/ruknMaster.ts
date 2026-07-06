import type { PersonGender, PersonStatus } from '@/types/people.types'
import { DEFAULT_PLACE } from '@/types/people.types'

export interface Rukn {
  id: string
  name: string
  gender: PersonGender
  mobile: string
  whatsapp?: string
  place: string
  status: PersonStatus
  notes?: string
  createdAt: string
  updatedAt: string
  updatedBy: string
}

const RUKN_NAMES = [
  'Ruqia Tahaniyat',
  'Amir Khan',
  'Mohd Minhajuddin',
  'Syeda Zainab Ghazala',
  'Shoukat Begum',
  'Md Ehtesham Akhtar',
  'Ruksana Tahsin',
  'Zulfiqar Ahmed',
  'Muhammad Faruq',
  'Shahida Banu Qureshi',
  'Mohammad Faizuddin (Imran)',
  'Syeda Sumaiya Parveen',
  'Tafheemuddin',
  'Syeda Amatul Azeez Kokab',
  'Farzana Nazmi',
  'Shamsunnisa',
  'Shah Jahan Begum',
  'Md Yousufuddin',
  'Mohammed Nayeemuddin',
  'Mohammad Aslam',
  'Qyamuddin Baagh',
  'Mohammed Alauddin',
  'Syeda Atiya Rabi',
  'Abdul Khader',
  'Bushra Fathima',
  'Syed Sher Ali',
  'Riyaz Patel',
  'Salma Naaz',
  'Zeenat Anjum',
  'Shahla Anjum',
  'Abdul Khaleel Gobre',
  'Mir Mukaram Ali Jamadar',
  'Ayesha Siddiqa',
  'Fazeelat Saleha',
  'Md Arafat Ahmad',
  'Abdul Qadir',
  'Shaheen Tabassum',
  'M Althaf Amjad',
  'Nadira Begum',
  'Mohammed Ghulam Rasool',
  'Aejaz Ahmed Gobre',
  'Ishrat Khanum',
  'Sabiha Sultana',
  'Izhar ul Haque',
  'Yasmin Sultana',
  'Asadulla Khan Zaki',
  'Mubashira Begum',
  'Rahmat Khanam',
  'Mujahid Pasha Qureshi',
] as const

const RUKN_GENDERS: PersonGender[] = [
  'Female', 'Male', 'Male', 'Female', 'Female', 'Male', 'Female', 'Male', 'Male', 'Female',
  'Male', 'Female', 'Male', 'Female', 'Female', 'Female', 'Female', 'Male', 'Male', 'Male',
  'Male', 'Male', 'Female', 'Male', 'Female', 'Male', 'Male', 'Female', 'Female', 'Female',
  'Male', 'Male', 'Female', 'Female', 'Male', 'Male', 'Female', 'Male', 'Female', 'Male',
  'Male', 'Female', 'Female', 'Male', 'Female', 'Male', 'Female', 'Female', 'Male',
]

const SEED_DATE = '2026-01-15T08:00:00.000Z'

export const ruknMaster: Rukn[] = RUKN_NAMES.map((name, index) => ({
  id: `R${String(index + 1).padStart(3, '0')}`,
  name,
  gender: RUKN_GENDERS[index] ?? 'Male',
  mobile: '',
  place: DEFAULT_PLACE,
  status: 'active',
  createdAt: SEED_DATE,
  updatedAt: SEED_DATE,
  updatedBy: 'System',
}))

export function getRuknById(id: string): Rukn | undefined {
  return ruknMaster.find((rukn) => rukn.id === id)
}

export function getRuknByName(name: string): Rukn | undefined {
  return ruknMaster.find((rukn) => rukn.name === name)
}

export function searchRukn(query: string): Rukn[] {
  const normalized = query.trim().toLowerCase()
  if (!normalized) {
    return ruknMaster
  }

  return ruknMaster.filter(
    (rukn) =>
      rukn.name.toLowerCase().includes(normalized) ||
      rukn.mobile.toLowerCase().includes(normalized),
  )
}

export function getActiveRuknNames(): string[] {
  return ruknMaster.filter((rukn) => rukn.status === 'active').map((rukn) => rukn.name)
}

export function getNextRuknId(): string {
  const maxNum = ruknMaster.reduce((max, rukn) => {
    const num = Number.parseInt(rukn.id.replace('R', ''), 10)
    return Number.isNaN(num) ? max : Math.max(max, num)
  }, 0)
  return `R${String(maxNum + 1).padStart(3, '0')}`
}
