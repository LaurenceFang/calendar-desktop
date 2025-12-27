/// <reference types="vite/client" />

declare global {
  interface Window {
    electronAPI?: {
      getApiBaseUrl: () => string;
      pingApi: () => Promise<{ ok: boolean; time: string }>;
    };
  }
}

export {};
