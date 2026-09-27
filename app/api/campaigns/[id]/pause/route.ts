import { withApi } from "@/lib/api/response";
import { requireApiUser } from "@/lib/auth/session";
import { pauseCampaign } from "@/lib/campaigns/service";
import { assertSameOrigin } from "@/lib/security/request";

export async function POST(request: Request, context: RouteContext<"/api/campaigns/[id]/pause">) {
  return withApi(async () => { assertSameOrigin(request); const session = await requireApiUser(); return pauseCampaign((await context.params).id, session.userId); });
}
