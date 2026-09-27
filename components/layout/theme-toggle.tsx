"use client";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  return <Button variant="ghost" size="icon" aria-label="Alternar tema" onClick={() => { const next = !document.documentElement.classList.contains("dark"); document.documentElement.classList.toggle("dark", next); localStorage.setItem("theme", next ? "dark" : "light"); }}><Moon className="h-4 w-4 dark:hidden" /><Sun className="hidden h-4 w-4 dark:block" /></Button>;
}
