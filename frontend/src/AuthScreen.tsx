import { useState, type FormEvent } from 'react'
import {
  loginWithEmail,
  registerWithEmail,
  resendVerificationEmail,
  sendPasswordReset,
} from './services/auth'
import { useAuth } from './context/useAuth'
import './AuthScreen.css'

type AuthMode = 'login' | 'register' | 'reset'

function getAuthErrorMessage(error: unknown): string {
  const code =
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string'
      ? error.code
      : ''

  const messages: Record<string, string> = {
    'auth/email-already-in-use': 'An account with this email already exists.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/invalid-credential': 'Incorrect email or password.',
    'auth/user-not-found': 'No account was found with this email.',
    'auth/wrong-password': 'Incorrect email or password.',
    'auth/weak-password': 'Choose a stronger password (minimum 8 characters).',
    'auth/too-many-requests': 'Too many attempts. Please try again later.',
    'auth/network-request-failed': 'Network connection error. Check your connection.',
    'auth/user-disabled': 'This operator account has been disabled.',
    'auth/operation-not-allowed': 'This sign-in method is currently disabled.',
  }

  if (code && messages[code]) {
    return messages[code]
  }

  return error instanceof Error
    ? error.message
    : 'Authentication failed. Please check your credentials.'
}

interface AuthScreenProps {
  onBackToHome?: () => void
}

export default function AuthScreen({ onBackToHome }: AuthScreenProps = {}) {
  const {
    firebaseUser,
    loading,
    error: sessionError,
    emailVerificationRequired,
    accountSetupRequired,
    refreshSession,
    completeAccountSetup,
    signOutUser,
  } = useAuth()

  const [mode, setMode] = useState<AuthMode>('login')
  const [fullName, setFullName] = useState(firebaseUser?.displayName ?? '')
  const [email, setEmail] = useState(firebaseUser?.email ?? '')
  const [password, setPassword] = useState('')
  const [setupName, setSetupName] = useState(firebaseUser?.displayName ?? '')
  const [localError, setLocalError] = useState('')
  const [notice, setNotice] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const clearMessages = () => {
    setLocalError('')
    setNotice('')
  }

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    clearMessages()
    setSubmitting(true)

    try {
      await loginWithEmail(email, password)
      await refreshSession()
    } catch (error) {
      setLocalError(getAuthErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  const handleRegistration = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    clearMessages()

    if (fullName.trim().length < 2) {
      setLocalError('Please enter your full name.')
      return
    }

    if (password.length < 8) {
      setLocalError('Password must contain at least 8 characters.')
      return
    }

    setSubmitting(true)

    try {
      await registerWithEmail(fullName, email, password)
      await refreshSession()
      setNotice('Verification email transmitted. Please check your inbox.')
    } catch (error) {
      setLocalError(getAuthErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  const handlePasswordReset = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    clearMessages()
    setSubmitting(true)

    try {
      await sendPasswordReset(email)
      setNotice('If an account is associated with this email, a password reset link has been sent.')
    } catch (error) {
      setLocalError(getAuthErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  const handleResendVerification = async () => {
    clearMessages()
    setSubmitting(true)

    try {
      await resendVerificationEmail()
      setNotice('Verification email re-sent. Please check your spam folder if not received.')
    } catch (error) {
      setLocalError(getAuthErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  const handleVerificationRefresh = async () => {
    clearMessages()
    setSubmitting(true)

    try {
      await refreshSession()
    } catch (error) {
      setLocalError(getAuthErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  const handleAccountSetup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    clearMessages()

    if (setupName.trim().length < 2) {
      setLocalError('Please enter your full name.')
      return
    }

    setSubmitting(true)

    try {
      await completeAccountSetup(setupName)
    } catch (error) {
      setLocalError(getAuthErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  const handleSignOut = async () => {
    clearMessages()

    try {
      await signOutUser()
    } catch (error) {
      setLocalError(getAuthErrorMessage(error))
    }
  }

  const displayedError = localError || sessionError

  return (
    <div className="auth-viewport">
      {/* Background ambient lighting */}
      <div className="auth-ambient-glow" aria-hidden="true" />

      <main className="auth-card" aria-labelledby="auth-heading">
        {/* Brand Header */}
        <div className="auth-header">
          {onBackToHome && (
            <button
              type="button"
              className="auth-btn-ghost"
              style={{
                marginBottom: '14px',
                padding: '4px 10px',
                fontSize: '12px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                alignSelf: 'flex-start',
              }}
              onClick={onBackToHome}
            >
              ← Back to Platform Overview
            </button>
          )}
          <div className="auth-brand-badge">
            <span className="auth-brand-cx">CX</span>
          </div>
          <h1 id="auth-heading" className="auth-title">
            CYBERGUARD<span className="auth-title-accent">-X</span>
          </h1>
          <p className="auth-subtitle">
            Autonomous Cyber Defense &amp; Digital Twin Platform
          </p>
        </div>

        {/* Global Feedback Banners */}
        {displayedError && (
          <div className="auth-banner error" role="alert">
            <span className="auth-banner-icon" aria-hidden="true">✕</span>
            <p>{displayedError}</p>
          </div>
        )}

        {notice && (
          <div className="auth-banner success" role="status">
            <span className="auth-banner-icon" aria-hidden="true">✓</span>
            <p>{notice}</p>
          </div>
        )}

        {/* Flow 1: Email Verification Required */}
        {emailVerificationRequired && (
          <div className="auth-flow-block">
            <div className="auth-flow-icon">✉</div>
            <h2>Verify Your Email</h2>
            <p className="auth-flow-text">
              A verification link was transmitted to{' '}
              <strong>{firebaseUser?.email ?? 'your email'}</strong>. Click the link to authorize
              this console.
            </p>
            <div className="auth-flow-actions">
              <button
                className="auth-btn-primary"
                type="button"
                onClick={() => void handleVerificationRefresh()}
                disabled={submitting || loading}
              >
                {submitting || loading ? 'Verifying...' : "I've Verified My Email"}
              </button>
              <button
                className="auth-btn-secondary"
                type="button"
                onClick={() => void handleResendVerification()}
                disabled={submitting || loading}
              >
                Resend Verification Link
              </button>
              <button
                className="auth-btn-ghost"
                type="button"
                onClick={() => void handleSignOut()}
                disabled={submitting || loading}
              >
                Sign Out
              </button>
            </div>
          </div>
        )}

        {/* Flow 2: Account Setup Required */}
        {!emailVerificationRequired && accountSetupRequired && (
          <form className="auth-form" onSubmit={handleAccountSetup}>
            <div className="auth-form-intro">
              <h2>Complete Profile</h2>
              <p>Enter your full name to link your identity with your operator role.</p>
            </div>

            <div className="auth-field">
              <label htmlFor="setup-name">Full Name</label>
              <input
                id="setup-name"
                type="text"
                autoComplete="name"
                value={setupName}
                onChange={(e) => setSetupName(e.target.value)}
                placeholder="Alex Vance"
                required
                minLength={2}
              />
            </div>

            <div className="auth-field">
              <label htmlFor="setup-email">Verified Email</label>
              <input
                id="setup-email"
                type="email"
                value={firebaseUser?.email ?? ''}
                readOnly
                disabled
              />
            </div>

            <button className="auth-btn-primary" type="submit" disabled={submitting || loading}>
              {submitting || loading ? 'Configuring Profile...' : 'Complete Setup'}
            </button>

            <button
              className="auth-btn-ghost"
              type="button"
              onClick={() => void handleSignOut()}
              disabled={submitting || loading}
            >
              Sign Out
            </button>
          </form>
        )}

        {/* Flow 3: Session Sync Wait */}
        {firebaseUser && !emailVerificationRequired && !accountSetupRequired && (
          <div className="auth-flow-block">
            <div className="auth-flow-icon">⟳</div>
            <h2>Synchronizing Session</h2>
            <p className="auth-flow-text">
              Firebase identity verified. Linking security tokens with local PostgreSQL RBAC.
            </p>
            <div className="auth-flow-actions">
              <button
                className="auth-btn-primary"
                type="button"
                onClick={() => void handleVerificationRefresh()}
                disabled={submitting || loading}
              >
                {submitting || loading ? 'Synchronizing...' : 'Retry Session Sync'}
              </button>
              <button
                className="auth-btn-ghost"
                type="button"
                onClick={() => void handleSignOut()}
                disabled={submitting || loading}
              >
                Sign Out
              </button>
            </div>
          </div>
        )}

        {/* Flow 4: Default Sign In / Register / Reset Form */}
        {!firebaseUser && !emailVerificationRequired && !accountSetupRequired && (
          <>
            {/* 21st.dev Segmented Tab Switcher */}
            {mode !== 'reset' && (
              <div className="auth-tabs" role="tablist" aria-label="Sign in mode">
                <button
                  type="button"
                  role="tab"
                  className={mode === 'login' ? 'active' : ''}
                  aria-selected={mode === 'login'}
                  onClick={() => {
                    setMode('login')
                    clearMessages()
                  }}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  role="tab"
                  className={mode === 'register' ? 'active' : ''}
                  aria-selected={mode === 'register'}
                  onClick={() => {
                    setMode('register')
                    clearMessages()
                  }}
                >
                  Create Account
                </button>
              </div>
            )}

            {mode === 'reset' ? (
              <form className="auth-form" onSubmit={handlePasswordReset}>
                <div className="auth-form-intro">
                  <h2>Reset Password</h2>
                  <p>Enter your email and we'll transmit a password recovery link.</p>
                </div>

                <div className="auth-field">
                  <label htmlFor="reset-email">Email Address</label>
                  <input
                    id="reset-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="operator@security.local"
                    required
                  />
                </div>

                <button className="auth-btn-primary" type="submit" disabled={submitting || loading}>
                  {submitting ? 'Transmitting...' : 'Send Recovery Link'}
                </button>

                <button
                  className="auth-btn-ghost"
                  type="button"
                  onClick={() => {
                    setMode('login')
                    clearMessages()
                  }}
                >
                  Back to Sign In
                </button>
              </form>
            ) : (
              <form
                className="auth-form"
                onSubmit={mode === 'register' ? handleRegistration : handleLogin}
              >
                {mode === 'register' && (
                  <div className="auth-field">
                    <label htmlFor="register-name">Full Name</label>
                    <input
                      id="register-name"
                      type="text"
                      autoComplete="name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Alex Vance"
                      required
                      minLength={2}
                    />
                  </div>
                )}

                <div className="auth-field">
                  <label htmlFor="auth-email">Operator Email</label>
                  <input
                    id="auth-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="operator@security.local"
                    required
                  />
                </div>

                <div className="auth-field">
                  <div className="auth-field-header">
                    <label htmlFor="auth-password">Password</label>
                    {mode === 'login' && (
                      <button
                        className="auth-forgot-link"
                        type="button"
                        onClick={() => {
                          setMode('reset')
                          clearMessages()
                        }}
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <input
                    id="auth-password"
                    type="password"
                    autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={
                      mode === 'register' ? 'At least 8 characters' : 'Enter your password'
                    }
                    required
                    minLength={mode === 'register' ? 8 : undefined}
                  />
                </div>

                <button className="auth-btn-primary" type="submit" disabled={submitting || loading}>
                  {submitting
                    ? 'Authenticating...'
                    : mode === 'register'
                      ? 'Create Operator Account'
                      : 'Sign In to Console'}
                </button>
              </form>
            )}
          </>
        )}

        {/* Security Trust Micro-Footer */}
        <div className="auth-card-footer">
          <span className="auth-trust-dot" aria-hidden="true" />
          <span>Zero-Trust RBAC &amp; Row-Level Security Enforced</span>
        </div>
      </main>

      <footer className="auth-page-footer">
        <span>CYBERGUARD-X · Defense Platform v0.1</span>
        <span>Predict · Protect · Respond</span>
      </footer>
    </div>
  )
}
