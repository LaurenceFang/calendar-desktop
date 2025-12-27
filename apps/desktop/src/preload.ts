import { contextBridge } from "electron";

const apiBaseUrl = "http://localhost:3101";

contextBridge.exposeInMainWorld("electronAPI", {
  getApiBaseUrl: () => apiBaseUrl,
  pingApi: async () => {
    const response = await fetch(`${apiBaseUrl}/api/health`);
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    return response.json();
  }
});
