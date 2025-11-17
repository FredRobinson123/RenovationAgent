import { ClerkProvider } from "@clerk/clerk-react";
import type { PropsWithChildren } from "react";
import { TooltipProvider } from "@/components/tooltip";
import { Toaster } from "@/components/toaster";

type AppProvidersProps = PropsWithChildren<{
  clerkPublishableKey: string;
}>;

export function AppProviders({ clerkPublishableKey, children }: AppProvidersProps) {
  return (
    <ClerkProvider publishableKey={clerkPublishableKey}>
      <TooltipProvider>
        <Toaster />
        {children}
      </TooltipProvider>
    </ClerkProvider>
  );
}

