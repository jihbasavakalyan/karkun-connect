/**
 * KC-035F — Voice navigation Urdu acknowledgements.
 */

export const NAVIGATION_URDU = {
  opening: (label: string) => `جی، ${label} کھول رہا ہوں۔`,
  home: 'جی، مرکزی صفحے پر لے چلتا ہوں۔',
  back: 'جی، واپس جا رہے ہیں۔',
  unknown: 'معذرت، یہ صفحہ نہیں مل سکا۔',
} as const
