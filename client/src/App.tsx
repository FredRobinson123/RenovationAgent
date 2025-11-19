import { SignedIn, UserButton } from "@clerk/clerk-react";
import { AppRoutes } from "@app/routes";

export default function App() {
  return (
    <>
      <SignedIn>
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
          <UserButton afterSignOutUrl="/" />
        </div>
      </SignedIn>
      <AppRoutes />
    </>
  );
}
