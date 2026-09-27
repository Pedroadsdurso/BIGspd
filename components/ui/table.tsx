import * as React from "react";
import { cn } from "@/lib/utils";
export function Table({ className, ...props }: React.TableHTMLAttributes<HTMLTableElement>) { return <div className="w-full overflow-x-auto"><table className={cn("w-full min-w-[680px] text-left text-sm", className)} {...props} /></div>; }
export function THead(props: React.HTMLAttributes<HTMLTableSectionElement>) { return <thead className="border-b text-xs uppercase tracking-wide text-[var(--muted)]" {...props} />; }
export function TBody(props: React.HTMLAttributes<HTMLTableSectionElement>) { return <tbody className="divide-y" {...props} />; }
export function TH(props: React.ThHTMLAttributes<HTMLTableCellElement>) { return <th className="px-4 py-3 font-medium" {...props} />; }
export function TD(props: React.TdHTMLAttributes<HTMLTableCellElement>) { return <td className="px-4 py-3.5 align-middle" {...props} />; }
