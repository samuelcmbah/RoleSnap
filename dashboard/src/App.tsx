import { 
  SignedIn, 
  SignedOut, 
  SignInButton, 
  UserButton, 
  useUser 
} from "@clerk/clerk-react";

function App() {
  const { user } = useUser();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-blue-600">RoleSnap</h1>
        <p className="text-slate-500">Your AI-Powered Job Tracker</p>
      </header>

      <SignedOut>
        <div className="bg-white p-8 rounded-xl shadow-md border border-slate-200">
          <p className="mb-4 text-center">Sign in to manage your job applications</p>
          <div className="flex justify-center bg-blue-600 text-white rounded-lg px-4 py-2 hover:bg-blue-700 transition-colors">
            <SignInButton mode="modal" />
          </div>
        </div>
      </SignedOut>

      <SignedIn>
        <div className="flex flex-col items-center gap-4">
          <UserButton afterSignOutUrl="/" />
          <h2 className="text-xl">Welcome back, {user?.firstName}!</h2>
          <div className="p-4 bg-green-100 text-green-800 rounded-md">
            Authentication is working.
          </div>
        </div>
      </SignedIn>
    </div>
  )
}

export default App