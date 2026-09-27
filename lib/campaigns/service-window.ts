export function isWithinServiceWindow(lastInboundAt: Date | null | undefined, hours = 24) {
  return Boolean(lastInboundAt && Date.now() - lastInboundAt.getTime() <= hours * 60 * 60 * 1000);
}
