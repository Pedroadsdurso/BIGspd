import * as React from "react";
import { cn } from "@/lib/utils";
export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) { return <input className={cn("h-11 w-full rounded-xl border bg-[var(--surface)] px-3 text-sm outline-none placeholder:text-[var(--muted)] focus:ring-2 focus:ring-[var(--primary)]", className)} {...props} />; }
export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) { return <label className={cn("mb-1.5 block text-sm font-medium", className)} {...props} />; }
