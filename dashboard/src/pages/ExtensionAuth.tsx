import { useEffect } from 'react'
import { useAuth, SignIn } from '@clerk/clerk-react'

const EXTENSION_AUTH_MESSAGE_TYPE = 'CLERK_TOKEN'

export const ExtensionAuth = () => {
  const { getToken, isLoaded, isSignedIn } = useAuth()

  useEffect(() => {
    const sendTokenToParent = async () => {
      if (!isLoaded) return

      if (window.parent === window) return

      try {
        if (!isSignedIn) {
          window.parent.postMessage(
            { type: EXTENSION_AUTH_MESSAGE_TYPE, token: null, error: 'NOT_SIGNED_IN' },
            '*'
          )
          return
        }

        const token = await getToken()
        window.parent.postMessage(
          { type: EXTENSION_AUTH_MESSAGE_TYPE, token },
          '*'
        )
      } catch (err) {
        window.parent.postMessage(
          {
            type: EXTENSION_AUTH_MESSAGE_TYPE,
            token: null,
            error: (err as Error)?.message || 'TOKEN_ERROR'
          },
          '*'
        )
      }
    }

    sendTokenToParent()
  }, [getToken, isLoaded, isSignedIn])

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="max-w-xl w-full rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900 mb-4">Connect RoleSnap Extension</h1>
        {!isLoaded ? (
          <p className="text-slate-500">Checking your Clerk session...</p>
        ) : isSignedIn ? (
          <p className="text-slate-500">
            You are signed in. The extension should receive a fresh token automatically.
          </p>
        ) : (
          <>
            <p className="text-slate-500 mb-4">
              Sign in to your RoleSnap account so the extension can save jobs to your dashboard.
            </p>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <SignIn routing="path" path="/extension-auth" signUpUrl="/extension-auth" />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
