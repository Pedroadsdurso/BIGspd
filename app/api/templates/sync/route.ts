import { withApi } from "@/lib/api/response";
import { requireApiUser } from "@/lib/auth/session";
import { syncTemplates } from "@/lib/meta/templates";
import { assertSameOrigin } from "@/lib/security/request";

export async function POST(request: Request) {
  return withApi(async () => {
    assertSameOrigin(request);
    const session = await requireApiUser();
    return syncTemplates(session.userId);
  });
}
