import { withApi } from "@/lib/api/response";
import { requireApiUser } from "@/lib/auth/session";
import { prepareAndQueueCampaign } from "@/lib/campaigns/service";
import { assertSameOrigin } from "@/lib/security/request";

export async function POST(request: Request, context: RouteContext<"/api/campaigns/[id]/start">) {
  return withApi(async () => {
    assertSameOrigin(request);
    const session = await requireApiUser();
    const { id } = await context.params;
    return prepareAndQueueCampaign(id, session.userId);
  });
}
