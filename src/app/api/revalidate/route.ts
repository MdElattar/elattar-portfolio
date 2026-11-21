import { revalidateTag } from "next/cache";
import { requireAdminOrResponse } from "../../../lib/require-admin";

export async function POST() {
  const guard = await requireAdminOrResponse();
  if (guard.response) return guard.response;

  revalidateTag("projects", "max");
  return Response.json({ revalidated: true });
}
