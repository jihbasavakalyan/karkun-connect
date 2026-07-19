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
  /** KC-0058 — soft archive / recovery metadata (optional; additive). */
  isArchived?: boolean
  createdBy?: string
  archivedAt?: string
  archivedBy?: string
  restoredAt?: string
  restoredBy?: string
  version?: number
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

/** Verified Basavakalyan Rukn mobile numbers — matched by name. */
const RUKN_VERIFIED_MOBILES: Record<(typeof RUKN_NAMES)[number], string> = {
  'Ruqia Tahaniyat': '8095788236',
  'Amir Khan': '9035668228',
  'Mohd Minhajuddin': '9844918585',
  'Syeda Zainab Ghazala': '7019044178',
  'Shoukat Begum': '8073594303',
  'Md Ehtesham Akhtar': '8050348195',
  'Ruksana Tahsin': '8095513141',
  'Zulfiqar Ahmed': '9448256432',
  'Muhammad Faruq': '9341892372',
  'Shahida Banu Qureshi': '9986022289',
  'Mohammad Faizuddin (Imran)': '8050555893',
  'Syeda Sumaiya Parveen': '8050206664',
  'Tafheemuddin': '9036965907',
  'Syeda Amatul Azeez Kokab': '6366346489',
  'Farzana Nazmi': '6362493266',
  'Shamsunnisa': '9036255250',
  'Shah Jahan Begum': '7411172327',
  'Md Yousufuddin': '9035563469',
  'Mohammed Nayeemuddin': '9448350164',
  'Mohammad Aslam': '9019668306',
  'Qyamuddin Baagh': '7975422103',
  'Mohammed Alauddin': '9590437221',
  'Syeda Atiya Rabi': '7760992286',
  'Abdul Khader': '9916811010',
  'Bushra Fathima': '7019400343',
  'Syed Sher Ali': '8123738051',
  'Riyaz Patel': '9108296672',
  'Salma Naaz': '7975818814',
  'Zeenat Anjum': '9353787515',
  'Shahla Anjum': '8951225700',
  'Abdul Khaleel Gobre': '9986791928',
  'Mir Mukaram Ali Jamadar': '9242962265',
  'Ayesha Siddiqa': '9380018424',
  'Fazeelat Saleha': '9379596338',
  'Md Arafat Ahmad': '9632017069',
  'Abdul Qadir': '8073828545',
  'Shaheen Tabassum': '9449028481',
  'M Althaf Amjad': '9845563350',
  'Nadira Begum': '9035683558',
  'Mohammed Ghulam Rasool': '9900934197',
  'Aejaz Ahmed Gobre': '8867477283',
  'Ishrat Khanum': '7795661980',
  'Sabiha Sultana': '9845725162',
  'Izhar ul Haque': '8884073582',
  'Yasmin Sultana': '7795767086',
  'Asadulla Khan Zaki': '7019951060',
  'Mubashira Begum': '6361767037',
  'Rahmat Khanam': '9972048281',
  'Mujahid Pasha Qureshi': '9742319121',
}

const SEED_DATE = '2026-01-15T08:00:00.000Z'
const MOBILE_UPDATE_DATE = '2026-07-07T00:00:00.000Z'

export const ruknMaster: Rukn[] = RUKN_NAMES.map((name, index) => {
  const verifiedMobile = RUKN_VERIFIED_MOBILES[name] ?? ''

  return {
    id: `R${String(index + 1).padStart(3, '0')}`,
    name,
    gender: RUKN_GENDERS[index] ?? 'Male',
    mobile: verifiedMobile,
    place: DEFAULT_PLACE,
    status: 'active',
    createdAt: SEED_DATE,
    updatedAt: verifiedMobile ? MOBILE_UPDATE_DATE : SEED_DATE,
    updatedBy: verifiedMobile ? 'Production Migration' : 'System',
  }
})

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
