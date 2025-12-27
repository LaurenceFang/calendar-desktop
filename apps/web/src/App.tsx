import { useEffect, useState } from "react";
import { APP_NAME, HealthResponseSchema } from "@calendar/shared";

const fallbackApiBaseUrl = "http://localhost:3101";

const getApiClient = () => {
  if (window.electronAPI) {
    return {
      baseUrl: window.electronAPI.getApiBaseUrl(),
      ping: window.electronAPI.pingApi
    };
  }

  return {
    baseUrl: fallbackApiBaseUrl,
    ping: async () => {
      const response = await fetch(`${fallbackApiBaseUrl}/api/health`);
      const data = await response.json();
      return HealthResponseSchema.parse(data);
    }
  };
};

const App = () => {
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [healthMessage, setHealthMessage] = useState<string>("");

  useEffect(() => {
    const load = async () => {
      setStatus("loading");
      try {
        const api = getApiClient();
        const health = await api.ping();
        setHealthMessage(`ok=${health.ok} time=${health.time}`);
        setStatus("ready");
      } catch (error) {
        setHealthMessage(`failed: ${(error as Error).message}`);
        setStatus("error");
      }
    };

    load();
  }, []);

  return (
    <div className="app">
      <header className="header">
        <h1>Calendar Desktop (Bootstrap)</h1>
        <p>Web is running.</p>
      </header>
      <section className="panel">
        <h2>Status</h2>
        <dl>
          <div>
            <dt>API Base URL</dt>
            <dd>{getApiClient().baseUrl}</dd>
          </div>
          <div>
            <dt>API Health</dt>
            <dd>
              {status === "loading" ? "Checking..." : healthMessage || "Not checked"}
            </dd>
          </div>
          <div>
            <dt>Shared Package</dt>
            <dd>{APP_NAME}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
};

export default App;
