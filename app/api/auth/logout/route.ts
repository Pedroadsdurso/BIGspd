import { destroySession } from "@/lib/auth/session";
import { withApi } from "@/lib/api/response";
import { assertSameOrigin } from "@/lib/security/request";

export async function POST(request: Request) {
  return withApi(async () => {
    assertSameOrigin(request);
    await destroySession();
    return { ok: true };
  });
}
