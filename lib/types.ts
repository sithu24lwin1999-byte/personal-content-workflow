export const FEATURE_PERMISSIONS = [
  "content_generate",
  "qc_check",
  "brand_database_view",
  "history_view",
  "export_output",
  "gemini_settings"
] as const;

export type FeaturePermission = (typeof FEATURE_PERMISSIONS)[number];

export const FEATURE_LABELS: Record<FeaturePermission, string> = {
  content_generate: "Content Generator",
  qc_check: "QC Checker",
  brand_database_view: "Brand Database Viewer",
  history_view: "History",
  export_output: "Export Output",
  gemini_settings: "Gemini Settings"
};

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  role: "owner" | "user";
  is_active: boolean;
  daily_usage_limit: number;
  created_at: string;
  updated_at: string;
};

export type UserPermission = {
  user_id: string;
  permission: FeaturePermission;
  enabled: boolean;
};

export type Brand = {
  id: string;
  brand_name: string;
  brand_voice: string | null;
  target_audience: string | null;
  products_services: string | null;
  do_words: string | null;
  dont_words: string | null;
  writing_style: string | null;
  offers_promotions: string | null;
  contact_info: string | null;
  reference_document_link: string | null;
  sample_content: string | null;
  qc_rules: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type GeminiSettings = {
  model_name: string;
  temperature: number;
  max_output_tokens: number;
  content_system_prompt: string;
  qc_system_prompt: string;
  daily_usage_limit_default: number;
  has_api_key?: boolean;
};

export type UsageLog = {
  id: string;
  user_id: string;
  feature: FeaturePermission;
  brand_id: string | null;
  input_chars: number;
  output_chars: number;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type AiOutput = {
  id: string;
  user_id: string;
  brand_id: string | null;
  output_type: "content_generation" | "qc_check";
  prompt: string;
  output: string;
  qc_score: number | null;
  issues: string[] | null;
  suggestions: string[] | null;
  model_name: string | null;
  created_at: string;
};

export type QcResult = {
  score: number;
  summary: string;
  issues: string[];
  recommendedFixes: string[];
};
