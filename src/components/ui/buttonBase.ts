export type ButtonSize = 'sm' | 'md' | 'lg'

export const BUTTON_SIZE_CLASS: Record<ButtonSize, string> = {
  sm: 'min-h-9 px-3 py-1.5 text-sm rounded-lg',
  md: 'min-h-11 px-5 py-2.5 text-sm rounded-lg',
  lg: 'min-h-12 px-6 py-3 text-base rounded-xl',
}

export const BUTTON_BASE_CLASS =
  'inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]'

export function buttonLoadingSpinner(): string {
  return 'inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent'
}
