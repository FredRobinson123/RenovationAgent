import { createGoogleGenerativeAI } from '@ai-sdk/google';

export const INPUT_GUARD_THRESHOLD = 0.9;

const geminiApiKey = process.env.GEMINI_API_KEY;

if (!geminiApiKey) {
  throw new Error('GEMINI_API_KEY is required to use the Gemini model.');
}

const googleProvider = createGoogleGenerativeAI({
  apiKey: geminiApiKey,
});

export const geminiFasttModel = googleProvider('gemini-2.5-flash');
export const geminiThreeProModel = googleProvider('gemini-3-pro-preview');

// Separate export so we can later swap to a cheaper or specialized guard model
// without touching individual agent definitions.
export const geminiGuardModel = geminiFasttModel;
