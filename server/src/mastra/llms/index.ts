import { createGoogleGenerativeAI } from '@ai-sdk/google';

const geminiApiKey = process.env.GEMINI_API_KEY;

if (!geminiApiKey) {
  throw new Error('GEMINI_API_KEY is required to use the Gemini model.');
}

const googleProvider = createGoogleGenerativeAI({
  apiKey: geminiApiKey,
});

export const geminiFasttModel = googleProvider('gemini-2.5-flash');
