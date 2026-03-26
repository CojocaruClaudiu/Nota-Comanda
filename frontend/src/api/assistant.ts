import { API_BASE_URL } from './baseUrl';

export type PublicAssistantIntent = 'expItp' | 'expRca' | 'expRovi' | 'expCasco';

export type PublicAssistantResponse = {
  intent?: PublicAssistantIntent | null;
  matchedPlate?: string | null;
  expiresAt?: string | null;
  answer: string;
};

export type PublicAssistantContext = {
  intent?: PublicAssistantIntent | null;
  matchedPlate?: string | null;
};

const isJson = (ct: string | null) => !!ct && ct.toLowerCase().includes('application/json');

export async function askPublicAssistant(
  question: string,
  context?: PublicAssistantContext,
): Promise<PublicAssistantResponse> {
  const res = await fetch(`${API_BASE_URL}/assistant/public-ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(context ? { question, context } : { question }),
  });

  if (!res.ok) {
    let message = 'Nu am putut contacta asistentul.';
    try {
      if (isJson(res.headers.get('content-type'))) {
        const payload = await res.json();
        if (payload?.error) message = String(payload.error);
      }
    } catch {
      // keep fallback message
    }
    throw new Error(message);
  }

  return res.json() as Promise<PublicAssistantResponse>;
}
