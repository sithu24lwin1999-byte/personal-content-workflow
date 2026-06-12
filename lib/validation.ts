import { z } from "zod";
import { FEATURE_PERMISSIONS } from "@/lib/types";

export const emailSchema = z.string().email();

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(6)
});

export const createUserSchema = z.object({
  email: emailSchema,
  password: z.string().min(8),
  full_name: z.string().optional(),
  role: z.enum(["owner", "user"]).default("user"),
  daily_usage_limit: z.coerce.number().int().min(1).max(10000).default(25)
});

export const updateUserSchema = z.object({
  full_name: z.string().nullable().optional(),
  role: z.enum(["owner", "user"]).optional(),
  is_active: z.boolean().optional(),
  daily_usage_limit: z.coerce.number().int().min(1).max(10000).optional()
});

export const permissionSchema = z.object({
  user_id: z.string().uuid(),
  permissions: z.record(z.enum(FEATURE_PERMISSIONS), z.boolean())
});

export const brandSchema = z.object({
  brand_name: z.string().min(1),
  brand_voice: z.string().optional(),
  target_audience: z.string().optional(),
  products_services: z.string().optional(),
  do_words: z.string().optional(),
  dont_words: z.string().optional(),
  writing_style: z.string().optional(),
  offers_promotions: z.string().optional(),
  contact_info: z.string().optional(),
  reference_document_link: z.string().url().or(z.literal("")).optional(),
  sample_content: z.string().optional(),
  qc_rules: z.string().optional()
});

export const geminiSettingsSchema = z.object({
  api_key: z.string().optional(),
  model_name: z.string().min(1),
  temperature: z.coerce.number().min(0).max(2),
  max_output_tokens: z.coerce.number().int().min(1).max(8192),
  content_system_prompt: z.string().min(1),
  qc_system_prompt: z.string().min(1),
  daily_usage_limit_default: z.coerce.number().int().min(1).max(10000)
});

export const aiRequestSchema = z.object({
  brand_id: z.string().uuid(),
  input: z.string().min(1)
});
