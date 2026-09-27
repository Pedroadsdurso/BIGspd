import { Badge } from "@/components/ui/badge";
export function StatusBadge({ status }: { status: string }) {
  const success = ["APPROVED", "CONNECTED", "DELIVERED", "READ", "COMPLETED", "OPTED_IN"];
  const warning = ["PENDING", "SCHEDULED", "QUEUED", "PROCESSING", "PAUSED", "UNKNOWN"];
  const danger = ["FAILED", "REJECTED", "DISABLED", "CANCELLED", "OPTED_OUT", "INVALID_PHONE"];
  const tone = success.includes(status) ? "success" : danger.includes(status) ? "danger" : warning.includes(status) ? "warning" : "neutral";
  return <Badge tone={tone}>{status.replaceAll("_", " ")}</Badge>;
}
