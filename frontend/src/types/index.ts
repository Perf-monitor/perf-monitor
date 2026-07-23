export type UserRole = "admin" | "user" | "viewer";

export interface User {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  organization: string;
  avatar: string | null;
  is_active: boolean;
  created_at: string;
}

export interface AuthTokens {
  access: string;
  refresh: string;
  user: User;
}

export type Framework = "react" | "nextjs" | "vue" | "nuxt" | "angular" | "svelte" | "other";
export type Environment = "production" | "staging" | "development" | "preview";
export type ProjectStatus = "healthy" | "warning" | "critical" | "unknown";
export type Strategy = "mobile" | "desktop";
export type MetricStatus = "good" | "needs-improvement" | "poor" | "unknown";

export interface Project {
  id: string;
  name: string;
  url: string;
  framework: Framework;
  environment: Environment;
  owner: string;
  owner_email: string;
  organization: string;
  description: string;
  active: boolean;
  scan_mobile: boolean;
  scan_desktop: boolean;
  deployment_version: string;
  git_commit_id: string;
  build_time: string;
  status: ProjectStatus;
  latest_performance: number | null;
  latest_accessibility: number | null;
  latest_seo: number | null;
  latest_best_practices: number | null;
  latest_lcp: number | null;
  latest_cls: number | null;
  latest_inp: number | null;
  last_scan: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectFormData {
  name: string;
  url: string;
  framework: Framework;
  environment: Environment;
  organization?: string;
  description?: string;
  active?: boolean;
  scan_mobile?: boolean;
  scan_desktop?: boolean;
  deployment_version?: string;
  git_commit_id?: string;
  build_time?: string;
}

export interface PerformanceReport {
  id: string;
  project: string;
  project_name: string;
  project_url: string;
  performance_score: number;
  accessibility_score: number;
  seo_score: number;
  best_practices_score: number;
  lcp: number | null;
  cls: number | null;
  inp: number | null;
  fcp: number | null;
  ttfb: number | null;
  speed_index: number | null;
  total_blocking_time: number | null;
  strategy: Strategy;
  status: ProjectStatus;
  lcp_status: MetricStatus;
  cls_status: MetricStatus;
  inp_status: MetricStatus;
  bundle_size: number | null;
  largest_js_bundle: number | null;
  image_optimization_score: number | null;
  unused_javascript: number | null;
  unused_css: number | null;
  compression_enabled: boolean | null;
  caching_enabled: boolean | null;
  cdn_detected: boolean | null;
  tested_at: string;
}

export interface DashboardStats {
  total_projects: number;
  active_projects: number;
  average_performance: number;
  projects_healthy: number;
  projects_warning: number;
  projects_critical: number;
  latest_scan_time: string | null;
  total_reports: number;
}

export interface MonthlyAverage {
  month: string;
  avg_performance: number;
  avg_accessibility: number;
  avg_seo: number;
  avg_best_practices: number;
}

export type AlertType = "performance" | "lcp" | "cls" | "inp";
export type AlertSeverity = "low" | "medium" | "high" | "critical";
export type AlertChannel = "email" | "slack";

export interface Alert {
  id: string;
  project: string;
  project_name: string;
  report: string;
  alert_type: AlertType;
  alert_type_display: string;
  severity: AlertSeverity;
  severity_display: string;
  message: string;
  value: number;
  threshold: number;
  channel: AlertChannel;
  sent: boolean;
  sent_at: string | null;
  acknowledged: boolean;
  acknowledged_at: string | null;
  is_acknowledged: boolean;
  created_at: string;
}

export interface AppSettings {
  id: number;
  scan_interval_hours: number;
  alert_performance_threshold: number;
  alert_lcp_threshold: number;
  alert_cls_threshold: number;
  alert_inp_threshold: number;
  alert_threshold_performance?: number;
  alert_threshold_lcp?: number;
  alert_threshold_cls?: number;
  alert_threshold_inp?: number;
  email_alerts_enabled: boolean;
  slack_alerts_enabled: boolean;
  slack_webhook_url?: string;
  alert_email?: string;
  email_recipients: string;
  google_api_key?: string;
  updated_at: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  total_pages: number;
  current_page: number;
  results: T[];
}

export interface ApiError {
  message: string;
  detail?: string;
  errors?: Record<string, string[]>;
}

export interface TrendDataPoint {
  tested_at: string;
  performance_score: number;
  accessibility_score: number;
  seo_score: number;
  best_practices_score: number;
  lcp: number | null;
  cls: number | null;
  inp: number | null;
  fcp: number | null;
  ttfb: number | null;
  speed_index: number | null;
  total_blocking_time: number | null;
  strategy: Strategy;
}

export interface FilterParams {
  page?: number;
  page_size?: number;
  search?: string;
  ordering?: string;
  framework?: string;
  environment?: string;
  strategy?: Strategy;
  project?: string;
  tested_after?: string;
  tested_before?: string;
  min_performance?: number;
  max_performance?: number;
  min_performance_score?: number;
  max_performance_score?: number;
}
