import { NextResponse } from "next/server";
import { apiErrorResponse, requireApiOwner } from "@/lib/api-auth";
import { brandSchema } from "@/lib/validation";

function nullableText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function POST(request: Request) {
  try {
    const { admin, profile } = await requireApiOwner();
    const parsed = brandSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid brand payload." }, { status: 400 });
    }

    const { brand_name, ...fields } = parsed.data;
    const payload = Object.fromEntries(
      Object.entries(fields).map(([key, value]) => [key, nullableText(value)])
    );
    const { error } = await admin.from("brands").insert({
      ...payload,
      brand_name: brand_name.trim(),
      created_by: profile.id
    });

    if (error) {
      throw error;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
