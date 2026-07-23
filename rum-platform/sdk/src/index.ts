/**
 * PerfMonitor RUM SDK
 * Drop-in Real User Monitoring for React, Next.js, and HTML applications.
 * Automatically intercepts Fetch, Axios, and XMLHttpRequest.
 */

export interface MonitoringConfig {
  apiKey: string;
  appName: string;
  environment?: string;
  version?: string;
  endpoint?: string;
  batchSize?: number;
  flushInterval?: number;
  sampleRate?: number;
  debug?: boolean;
}

interface RumEvent {
  api_key: string;
  session_id: string;
  user_id?: string;
  anonymous_id: string;
  app_name: string;
  environment: string;
  version: string;
  api_url: string;
  api_name: string;
  method: string;
  status_code: number | null;
  success: boolean;
  error_message: string;
  response_time_ms: number | null;
  dns_time_ms: number | null;
  ttfb_ms: number | null;
  download_time_ms: number | null;
  page_url: string;
  previous_url: string;
  route_name: string;
  referrer: string;
  browser_name: string;
  browser_version: string;
  os_name: string;
  device_type: string;
  screen_resolution: string;
  network_type: string;
  timestamp: number;
}

// ── Browser detection ─────────────────────────────────────────────────────────

function detectBrowser(): { name: string; version: string } {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  if (/Edg\//.test(ua)) return { name: "Edge", version: ua.match(/Edg\/([\d.]+)/)?.[1] ?? "" };
  if (/Chrome\//.test(ua) && !/Chromium/.test(ua)) return { name: "Chrome", version: ua.match(/Chrome\/([\d.]+)/)?.[1] ?? "" };
  if (/Firefox\//.test(ua)) return { name: "Firefox", version: ua.match(/Firefox\/([\d.]+)/)?.[1] ?? "" };
  if (/Safari\//.test(ua) && !/Chrome/.test(ua)) return { name: "Safari", version: ua.match(/Version\/([\d.]+)/)?.[1] ?? "" };
  return { name: "Unknown", version: "" };
}

function detectOS(): string {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  if (/Windows/.test(ua)) return "Windows";
  if (/Mac OS X/.test(ua) && !/iPhone|iPad/.test(ua)) return "macOS";
  if (/Android/.test(ua)) return "Android";
  if (/iPhone|iPad/.test(ua)) return "iOS";
  if (/Linux/.test(ua)) return "Linux";
  return "Unknown";
}

function detectDevice(): string {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  if (/tablet|ipad/i.test(ua)) return "tablet";
  if (/mobile|android|iphone/i.test(ua)) return "mobile";
  return "desktop";
}

function detectNetwork(): string {
  const nav = typeof navigator !== "undefined" ? (navigator as any) : null;
  return nav?.connection?.effectiveType ?? nav?.connection?.type ?? "unknown";
}

function getScreenRes(): string {
  if (typeof screen === "undefined") return "";
  return `${screen.width}x${screen.height}`;
}

function generateId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// ── Core Monitor class ────────────────────────────────────────────────────────

class Monitor {
  private config!: Required<MonitoringConfig>;
  private queue: object[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private sessionId: string = generateId();
  private anonymousId: string = generateId();
  private userId: string = "";
  private browser = detectBrowser();
  private os = detectOS();
  private device = detectDevice();
  private initialized = false;
  private originalFetch: typeof fetch | null = null;
  private originalXhrOpen: typeof XMLHttpRequest.prototype.open | null = null;
  private originalXhrSend: typeof XMLHttpRequest.prototype.send | null = null;

  init(config: MonitoringConfig): void {
    if (this.initialized) return;
    this.initialized = true;

    this.config = {
      apiKey: config.apiKey,
      appName: config.appName,
      environment: config.environment ?? "production",
      version: config.version ?? "1.0.0",
      endpoint: config.endpoint ?? "http://localhost:8000/api/v1/rum/events/",
      batchSize: config.batchSize ?? 20,
      flushInterval: config.flushInterval ?? 5000,
      sampleRate: config.sampleRate ?? 1.0,
      debug: config.debug ?? false,
    };

    if (typeof window === "undefined") {
      this.log("SSR detected — deferring interception until client hydration.");
      return;
    }

    this.patchFetch();
    this.patchXHR();
    this.startFlushTimer();
    this.listenOffline();
    this.log("RUM SDK initialized.", this.config.appName);
  }

  identify(userId: string): void {
    this.userId = userId;
  }

  // ── Fetch interception ────────────────────────────────────────────────────

  private patchFetch(): void {
    if (typeof fetch === "undefined") return;
    this.originalFetch = window.fetch.bind(window);
    const self = this;

    window.fetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
      if (!self.shouldSample()) return self.originalFetch!(input, init);

      const url = typeof input === "string" ? input : input instanceof URL ? input.href : (input as Request).url;
      if (self.isInternalEndpoint(url)) return self.originalFetch!(input, init);

      const method = init?.method ?? (input instanceof Request ? input.method : "GET");
      const t0 = performance.now();
      const startTs = Date.now();
      let status: number | null = null;
      let success = true;
      let errorMsg = "";

      try {
        const response = await self.originalFetch!(input, init);
        const t1 = performance.now();
        status = response.status;
        success = response.ok;
        if (!response.ok) errorMsg = `HTTP ${response.status}`;
        self.push({ url, method: method.toUpperCase(), status, success, errorMsg, duration: t1 - t0, startTs });
        return response;
      } catch (err: any) {
        const t1 = performance.now();
        success = false;
        errorMsg = err?.message ?? "Network error";
        self.push({ url, method: method.toUpperCase(), status: null, success, errorMsg, duration: t1 - t0, startTs });
        throw err;
      }
    };
  }

  // ── XHR interception ─────────────────────────────────────────────────────

  private patchXHR(): void {
    if (typeof XMLHttpRequest === "undefined") return;
    this.originalXhrOpen = XMLHttpRequest.prototype.open;
    this.originalXhrSend = XMLHttpRequest.prototype.send;
    const self = this;

    XMLHttpRequest.prototype.open = function (
      method: string, url: string | URL,
      async?: boolean, user?: string | null, password?: string | null
    ) {
      (this as any)._rum_method = method.toUpperCase();
      (this as any)._rum_url = typeof url === "string" ? url : url.href;
      return self.originalXhrOpen!.call(this, method, url, async ?? true, user, password);
    };

    XMLHttpRequest.prototype.send = function (body?: Document | XMLHttpRequestBodyInit | null) {
      const rumUrl: string = (this as any)._rum_url ?? "";
      if (!self.shouldSample() || self.isInternalEndpoint(rumUrl)) {
        return self.originalXhrSend!.call(this, body);
      }

      const method: string = (this as any)._rum_method ?? "GET";
      const t0 = performance.now();
      const startTs = Date.now();

      this.addEventListener("loadend", () => {
        const duration = performance.now() - t0;
        const status = this.status;
        const success = status >= 200 && status < 400;
        self.push({ url: rumUrl, method, status: status || null, success, errorMsg: success ? "" : `HTTP ${status}`, duration, startTs });
      });

      return self.originalXhrSend!.call(this, body);
    };
  }

  // ── Event creation & queue ────────────────────────────────────────────────

  private push(data: { url: string; method: string; status: number | null; success: boolean; errorMsg: string; duration: number; startTs: number }): void {
    const event: RumEvent = {
      api_key: this.config.apiKey,
      session_id: this.sessionId,
      user_id: this.userId || undefined,
      anonymous_id: this.anonymousId,
      app_name: this.config.appName,
      environment: this.config.environment,
      version: this.config.version,
      api_url: data.url,
      api_name: this.urlToName(data.url),
      method: data.method,
      status_code: data.status,
      success: data.success,
      error_message: data.errorMsg,
      response_time_ms: Math.round(data.duration * 100) / 100,
      dns_time_ms: null,
      ttfb_ms: null,
      download_time_ms: null,
      page_url: typeof location !== "undefined" ? location.href : "",
      previous_url: typeof document !== "undefined" ? document.referrer : "",
      route_name: typeof location !== "undefined" ? location.pathname : "",
      referrer: typeof document !== "undefined" ? document.referrer : "",
      browser_name: this.browser.name,
      browser_version: this.browser.version,
      os_name: this.os,
      device_type: this.device,
      screen_resolution: getScreenRes(),
      network_type: detectNetwork(),
      timestamp: data.startTs,
    };

    this.queue.push(event);
    this.log("Queued event:", data.url, data.status);

    if (this.queue.length >= this.config.batchSize) {
      this.flush();
    }
  }

  private urlToName(url: string): string {
    try {
      const u = new URL(url);
      return u.pathname;
    } catch {
      return url;
    }
  }

  private isInternalEndpoint(url: string): boolean {
    return url.includes(this.config.endpoint) || url.includes("/rum/events");
  }

  private shouldSample(): boolean {
    return Math.random() <= this.config.sampleRate;
  }

  // ── Flush ─────────────────────────────────────────────────────────────────

  flush(): void {
    if (this.queue.length === 0) return;
    const batch = this.queue.splice(0, this.config.batchSize);
    this.sendBatch(batch);
  }

  private async sendBatch(events: object[], retries = 3): Promise<void> {
    const payload = { api_key: this.config.apiKey, events };
    try {
      const fn = this.originalFetch ?? fetch;
      const res = await fn(this.config.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true,
      });
      if (!res.ok && retries > 0) {
        setTimeout(() => this.sendBatch(events, retries - 1), 2000);
      }
    } catch {
      if (retries > 0) setTimeout(() => this.sendBatch(events, retries - 1), 2000);
      else this.queue.unshift(...events);
    }
  }

  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => this.flush(), this.config.flushInterval);
    if (typeof window !== "undefined") {
      window.addEventListener("beforeunload", () => this.flush());
      window.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") this.flush();
      });
    }
  }

  private listenOffline(): void {
    if (typeof window === "undefined") return;
    window.addEventListener("online", () => {
      this.log("Back online — flushing queued events.");
      this.flush();
    });
  }

  private log(...args: any[]): void {
    if (this.config?.debug) console.log("[RUM]", ...args);
  }
}

export const monitor = new Monitor();

export function initMonitoring(config: MonitoringConfig): void {
  monitor.init(config);
}

export function identifyUser(userId: string): void {
  monitor.identify(userId);
}

// Browser global (for HTML script tag usage)
if (typeof window !== "undefined") {
  (window as any).Monitoring = { init: initMonitoring, identify: identifyUser };
}

export default monitor;
