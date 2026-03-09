import { createGoogleGenerativeAI } from '@ai-sdk/google';

export const INPUT_GUARD_THRESHOLD = 0.9;

const geminiApiKey =
  process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;

if (!geminiApiKey) {
  throw new Error(
    'A Google model API key is required. Set GEMINI_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY in the deployment environment.'
  );
}

const googleProvider = createGoogleGenerativeAI({
  apiKey: geminiApiKey,
});

export const geminiFasttModel = googleProvider('gemini-2.5-flash');
export const geminiThreeProModel = googleProvider('gemini-3-pro-preview');

// Separate export so we can later swap to a cheaper or specialized guard model
// without touching individual agent definitions.
export const geminiGuardModel = geminiFasttModel;
