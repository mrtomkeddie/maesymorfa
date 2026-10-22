import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

export const ai = genkit({
  plugins: [googleAI()],
  // Google retired the 1.5 models; 3.8 Flash had no shutdown date on 20 Oct 2026
  // (ai.google.dev/gemini-api/docs/deprecations). Needs GEMINI_API_KEY on the server.
  model: 'googleai/gemini-3.8-flash',
});
