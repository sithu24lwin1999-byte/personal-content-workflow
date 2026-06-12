import { QcResult } from "./types";

export async function generateWithGemini(input: {
  apiKey: string;
  model: string;
  systemInstruction: string;
  prompt: string;
  temperature?: number;
  maxOutputTokens?: number;
}) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${input.model}:generateContent?key=${input.apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: input.systemInstruction }]
        },
        contents: [
          {
            role: "user",
            parts: [{ text: input.prompt }]
          }
        ],
        generationConfig: {
          temperature: input.temperature ?? 0.4,
          maxOutputTokens: input.maxOutputTokens ?? 2048
        }
      })
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${errorText}`);
  }

  const data = (await response.json()) as {
    candidates?: {
      content?: { parts?: { text?: string }[] };
    }[];
  };
  const text = data.candidates?.[0]?.content?.parts
    ?.map((part) => part.text || "")
    .join("")
    .trim();

  if (!text) {
    throw new Error("Gemini returned an empty response.");
  }

  return text;
}

export function parseQcResult(raw: string): QcResult {
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  const jsonText = jsonMatch?.[0] || raw;
  const parsed = JSON.parse(jsonText) as Partial<QcResult>;
  const score = Number(parsed.score);

  return {
    score: Number.isFinite(score) ? Math.max(0, Math.min(100, score)) : 0,
    summary: parsed.summary || "No summary returned.",
    issues: Array.isArray(parsed.issues) ? parsed.issues.map(String) : [],
    recommendedFixes: Array.isArray(parsed.recommendedFixes)
      ? parsed.recommendedFixes.map(String)
      : []
  };
}

export function formatBrandContext(brand: Record<string, unknown>) {
  return [
    `Brand name: ${brand.brand_name || ""}`,
    `Brand voice: ${brand.brand_voice || ""}`,
    `Target audience: ${brand.target_audience || ""}`,
    `Products/services: ${brand.products_services || ""}`,
    `Do words: ${brand.do_words || ""}`,
    `Don't words: ${brand.dont_words || ""}`,
    `Writing style: ${brand.writing_style || ""}`,
    `Offers/promotions: ${brand.offers_promotions || ""}`,
    `Contact info: ${brand.contact_info || ""}`,
    `Reference document: ${brand.reference_document_link || ""}`,
    `Sample content: ${brand.sample_content || ""}`,
    `QC rules: ${brand.qc_rules || ""}`
  ].join("\n");
}
