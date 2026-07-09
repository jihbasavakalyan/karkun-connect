export type UserRole = 'administrator' | 'rukn'

export type AuthStatus =
  | 'initializing'
  | 'signing-in'
  | 'sending-otp'
  | 'verifying-otp'
  | 'authenticated'
  | 'unauthenticated'
  | 'session-expired'
  | 'offline'

export type AuthUser = {
  uid: string
  email: string
  phone?: string
  role: UserRole
  ruknId?: string
  displayName?: string
}

export type LoginResult =
  | { success: true; user: AuthUser }
  | { success: false; error: string }

export type OtpSendResult =
  | { success: true }
  | { success: false; error: string }

export type PasswordResetResult =
  | { success: true }
  | { success: false; error: string }

export type AuthContextValue = {
  user: AuthUser | null
  status: AuthStatus
  isAuthenticated: boolean
  isInitializing: boolean
  loginWithEmail: (email: string, password: string, rememberMe: boolean) => Promise<LoginResult>
  sendOtp: (mobile: string) => Promise<OtpSendResult>
  verifyOtp: (code: string, rememberMe: boolean) => Promise<LoginResult>
  resendOtp: (mobile: string) => Promise<OtpSendResult>
  resetPassword: (email: string) => Promise<PasswordResetResult>
  reauthenticateWithPassword: (password: string) => Promise<boolean>
  logout: () => Promise<void>
}
