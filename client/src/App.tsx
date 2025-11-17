import { SignedIn, SignedOut, SignIn, UserButton } from "@clerk/clerk-react";
import { AppRoutes } from "@app/routes";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function App() {
  return (
    <>
      <SignedIn>
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
          <ThemeToggle />
          <UserButton afterSignOutUrl="/" />
        </div>
        <AppRoutes />
      </SignedIn>

      <SignedOut>
        <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
          <div className="mb-6 text-center space-y-2">
            <p className="text-xl font-semibold text-foreground">Welcome to Ren</p>
            <p className="text-muted-foreground">Sign in to chat with your renovation assistant.</p>
          </div>
          <SignIn appearance={{ elements: { formButtonPrimary: "bg-primary" } }} afterSignInUrl="/" />
        </div>
      </SignedOut>
    </>
  );
}
