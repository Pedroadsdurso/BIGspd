import { after } from "next/server";
import { withApi } from "@/lib/api/response";
import { requireApiUser } from "@/lib/auth/session";
import { retryFailedRecipients } from "@/lib/campaigns/service";
import { dispatchAfterResponse } from "@/lib/campaigns/dispatch-after";
import { assertSameOrigin } from "@/lib/security/request";

export const maxDuration = 300;

export async function POST(request: Request, context: RouteContext<"/api/campaigns/[id]/retry-failed">) {
  return withApi(async () => {
    assertSameOrigin(request);
    const session = await requireApiUser();
    const { id } = await context.params;
    const result = await retryFailedRecipients(id, session.userId);
    after(() => dispatchAfterResponse(id));
    return result;
  });
}
