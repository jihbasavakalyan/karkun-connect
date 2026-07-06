export interface Rukn {
  id: string
  name: string
  mobile: string
  place: string
  status: 'active' | 'inactive'
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

export const ruknMaster: Rukn[] = RUKN_NAMES.map((name, index) => ({
  id: `R${String(index + 1).padStart(3, '0')}`,
  name,
  mobile: '',
  place: 'Basavakalyan',
  status: 'active',
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

  return ruknMaster.filter((rukn) => rukn.name.toLowerCase().includes(normalized))
}

export function getActiveRuknNames(): string[] {
  return ruknMaster.filter((rukn) => rukn.status === 'active').map((rukn) => rukn.name)
}
