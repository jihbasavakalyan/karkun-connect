/**
 * KC-035F — Voice navigation Urdu acknowledgements.
 */

export const NAVIGATION_URDU = {
  opening: (label: string) => {
    if (label.includes('ڈیش')) return 'جی، ڈیش بورڈ پیش کر رہا ہوں۔'
    if (label.includes('رجسٹری')) return 'جی، کارکن رجسٹری کھول رہا ہوں۔'
    if (label.includes('فالو')) return 'جی، زیر التواء فالو اپ پیش کر رہا ہوں۔'
    return `جی، ${label} کھول رہا ہوں۔`
  },
  home: 'جی، مرکزی صفحے پر لے چلتا ہوں۔',
  back: 'جی، واپس جا رہے ہیں۔',
  unknown: 'معذرت، یہ صفحہ نہیں مل سکا۔',
  presentingPerson: (name: string) => `جی، ${name} کی تفصیلات پیش کر رہا ہوں۔`,
  searchNoResults: (query: string) =>
    `معذرت، “${query}” کے لیے کوئی نتیجہ نہیں ملا۔`,
  searchResults: (count: number) =>
    count === 1
      ? 'جی، نتیجہ مل گیا۔ تفصیلات پیش کر رہا ہوں۔'
      : `جی، ${count} نتائج ملے ہیں۔ مناسب نتیجہ منتخب کیجیے۔`,
} as const
