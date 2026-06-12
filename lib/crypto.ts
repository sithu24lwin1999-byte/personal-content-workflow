import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { getMissingGeminiEncryptionEnv, logMissingEnv } from "@/lib/env";

function getKey() {
  const missingNames = getMissingGeminiEncryptionEnv();

  if (missingNames.length > 0) {
    logMissingEnv("Gemini API key encryption", missingNames);
    throw new Error(`Missing environment variables: ${missingNames.join(", ")}`);
  }

  const rawKey = process.env.APP_ENCRYPTION_KEY!;

  return createHash("sha256").update(rawKey).digest();
}

export function encryptSecret(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${iv.toString("base64")}:${tag.toString("base64")}:${encrypted.toString(
    "base64"
  )}`;
}

export function decryptSecret(value: string) {
  const [ivBase64, tagBase64, encryptedBase64] = value.split(":");

  if (!ivBase64 || !tagBase64 || !encryptedBase64) {
    throw new Error("Stored secret is not in the expected format.");
  }

  const decipher = createDecipheriv(
    "aes-256-gcm",
    getKey(),
    Buffer.from(ivBase64, "base64")
  );
  decipher.setAuthTag(Buffer.from(tagBase64, "base64"));

  return Buffer.concat([
    decipher.update(Buffer.from(encryptedBase64, "base64")),
    decipher.final()
  ]).toString("utf8");
}
