
import { createContext } from 'react'
import type { ReactNode } from 'react'
import type { User } from 'firebase/auth'
import type { AuthenticatedUser } from '../services/backendAuth'

export interface AuthContextValue {
  firebaseUser: User | null
  backendUser: AuthenticatedUser | null
  loading: boolean
  error: string | null
  emailVerificationRequired: boolean
  accountSetupRequired: boolean
  refreshSession: () => Promise<void>
  completeAccountSetup: (fullName: string) => Promise<void>
  signOutUser: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined,
)

export type { ReactNode }
