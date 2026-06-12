import { NextResponse } from "next/server";
import { apiErrorResponse, requireApiOwner } from "@/lib/api-auth";
import { updateUserSchema } from "@/lib/validation";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { admin } = await requireApiOwner();
    const { userId } = await params;
    const parsed = updateUserSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid user update." }, { status: 400 });
    }

    const { error } = await admin
      .from("profiles")
      .update(parsed.data)
      .eq("id", userId);

    if (error) {
      throw error;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
