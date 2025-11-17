import { createRoot } from "react-dom/client";
import App from "./App";
import { AppProviders } from "@app/providers";
import "./index.css";

const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!clerkPublishableKey) {
  throw new Error("VITE_CLERK_PUBLISHABLE_KEY is not defined");
}

createRoot(document.getElementById("root")!).render(
  <AppProviders clerkPublishableKey={clerkPublishableKey}>
    <App />
  </AppProviders>
);
