
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  onAuthStateChanged,
  type User,
} from 'firebase/auth'

import { AuthContext } from './auth-context'
import { auth } from '../lib/firebase'
import { logout } from '../services/auth'
import {
  BackendRequestError,
  getAuthenticatedUser,
  synchronizeUser,
  type AuthenticatedUser,
} from '../services/backendAuth'

const SESSION_TIMEOUT_MS = 15000

async function withSessionTimeout<T>(promise: Promise<T>): Promise<T> {
  let timeoutId: number | undefined

  const timeout = new Promise<never>((_, reject) => {
    timeoutId = window.setTimeout(() => {
      reject(
        new Error(
          'Session validation timed out. Confirm the backend is running and retry.',
        ),
      )
    }, SESSION_TIMEOUT_MS)
  })

  try {
    return await Promise.race([promise, timeout])
  } finally {
    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId)
    }
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null)
  const [backendUser, setBackendUser] = useState<AuthenticatedUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [emailVerificationRequired, setEmailVerificationRequired] =
    useState(false)
  const [accountSetupRequired, setAccountSetupRequired] = useState(false)

  const sessionVersion = useRef(0)

  const loadBackendUser = useCallback(async (user: User) => {
    const currentVersion = sessionVersion.current

    setError(null)
    setBackendUser(null)
    setEmailVerificationRequired(false)
    setAccountSetupRequired(false)

    await user.reload()

    if (sessionVersion.current !== currentVersion) {
      return
    }

    if (!user.emailVerified) {
      setEmailVerificationRequired(true)
      return
    }

    // Firebase automatically refreshes an expired token. Avoid forcing a
    // network refresh during normal session recovery, which can leave the
    // entire app waiting when the identity service is slow or unavailable.
    const token = await user.getIdToken()

    if (sessionVersion.current !== currentVersion) {
      return
    }

    const profile = await getAuthenticatedUser(token)

    if (sessionVersion.current !== currentVersion) {
      return
    }

    setBackendUser(profile)
  }, [])

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      const currentVersion = ++sessionVersion.current

      setFirebaseUser(user)
      setBackendUser(null)
      setError(null)
      setEmailVerificationRequired(false)
      setAccountSetupRequired(false)
      setLoading(true)

      if (!user) {
        setLoading(false)
        return
      }

      try {
        await withSessionTimeout(loadBackendUser(user))
      } catch (sessionError) {
        if (sessionVersion.current !== currentVersion) {
          return
        }

        if (
          sessionError instanceof BackendRequestError &&
          sessionError.status === 404
        ) {
          setAccountSetupRequired(true)
        } else {
          setError(
            sessionError instanceof Error
              ? sessionError.message
              : 'Unable to restore your session.',
          )
        }
      } finally {
        if (sessionVersion.current === currentVersion) {
          setLoading(false)
        }
      }
    })

    return unsubscribe
  }, [loadBackendUser])

  const refreshSession = useCallback(async () => {
    const user = auth.currentUser
    const currentVersion = ++sessionVersion.current

    if (!user) {
      setFirebaseUser(null)
      setBackendUser(null)
      setError(null)
      setEmailVerificationRequired(false)
      setAccountSetupRequired(false)
      setLoading(false)
      return
    }

    setFirebaseUser(user)
    setLoading(true)
    setError(null)
    setBackendUser(null)
    setEmailVerificationRequired(false)
    setAccountSetupRequired(false)

    try {
      await withSessionTimeout(loadBackendUser(user))

      if (sessionVersion.current !== currentVersion) {
        return
      }

      setFirebaseUser(auth.currentUser)
    } catch (sessionError) {
      if (sessionVersion.current !== currentVersion) {
        return
      }

      setBackendUser(null)

      if (
        sessionError instanceof BackendRequestError &&
        sessionError.status === 404
      ) {
        setAccountSetupRequired(true)
        return
      }

      setError(
        sessionError instanceof Error
          ? sessionError.message
          : 'Unable to refresh your session.',
      )

      throw sessionError
    } finally {
      if (sessionVersion.current === currentVersion) {
        setLoading(false)
      }
    }
  }, [loadBackendUser])

  const completeAccountSetup = useCallback(
    async (fullName: string) => {
      const user = auth.currentUser

      if (!user) {
        throw new Error('Please sign in before completing account setup.')
      }

      const normalizedName = fullName.trim()

      if (!normalizedName) {
        throw new Error('Full name is required.')
      }

      const currentVersion = ++sessionVersion.current

      setLoading(true)
      setError(null)

      try {
        await user.reload()

        if (sessionVersion.current !== currentVersion) {
          return
        }

        if (!user.emailVerified) {
          setEmailVerificationRequired(true)
          throw new Error(
            'Please verify your email address before completing account setup.',
          )
        }

        const token = await user.getIdToken(true)

        if (sessionVersion.current !== currentVersion) {
          return
        }

        const profile = await synchronizeUser(normalizedName, token)

        if (sessionVersion.current !== currentVersion) {
          return
        }

        setFirebaseUser(auth.currentUser)
        setBackendUser(profile)
        setEmailVerificationRequired(false)
        setAccountSetupRequired(false)
        setError(null)
      } catch (setupError) {
        if (sessionVersion.current === currentVersion) {
          setBackendUser(null)
          setError(
            setupError instanceof Error
              ? setupError.message
              : 'Unable to complete account setup.',
          )
        }

        throw setupError
      } finally {
        if (sessionVersion.current === currentVersion) {
          setLoading(false)
        }
      }
    },
    [],
  )

  const signOutUser = useCallback(async () => {
    ++sessionVersion.current

    try {
      await logout()
    } finally {
      setFirebaseUser(null)
      setBackendUser(null)
      setError(null)
      setEmailVerificationRequired(false)
      setAccountSetupRequired(false)
      setLoading(false)
    }
  }, [])

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        backendUser,
        loading,
        error,
        emailVerificationRequired,
        accountSetupRequired,
        refreshSession,
        completeAccountSetup,
        signOutUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
