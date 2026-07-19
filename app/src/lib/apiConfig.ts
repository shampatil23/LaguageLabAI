// API configuration for development and production environments
const isDevelopment = import.meta.env.DEV;
const isProduction = import.meta.env.PROD;

// Base URL for API calls
// In development: use relative URLs (handled by Vite proxy or local server)
// In production: use relative URLs (Vercel handles routing automatically)
export const API_BASE_URL = '';

// API endpoints
export const API_ENDPOINTS = {
  chat: `${API_BASE_URL}/api/chat`,
  translate: `${API_BASE_URL}/api/translate`,
  createUser: `${API_BASE_URL}/api/create-user`,
  ai: `${API_BASE_URL}/api/ai`,
};

// Helper function to make API calls with better error handling
export async function callApi(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ ok: boolean; data?: any; error?: string }> {
  const defaultHeaders = {
    'Content-Type': 'application/json',
  };

  const config: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  try {
    const response = await fetch(endpoint, config);
    const data = await response.json().catch(() => null);
    
    if (!response.ok) {
      console.error(`API Error [${response.status}] for ${endpoint}:`, data);
      return {
        ok: false,
        error: data?.error || data?.details || `Request failed with status ${response.status}`,
      };
    }
    
    return {
      ok: true,
      data,
    };
  } catch (error) {
    console.error(`Network error for ${endpoint}:`, error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Network error occurred',
    };
  }
}

// Helper to check if API is reachable
export async function checkApiHealth(): Promise<boolean> {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: 'test' }] }),
    });
    return response.status !== 404;
  } catch {
    return false;
  }
}
