"use client";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
export function LogoutButton() { const router = useRouter(); return <Button variant="ghost" size="icon" title="Sair" onClick={async () => { await fetch("/api/auth/logout", { method: "POST" }); router.replace("/login"); router.refresh(); }}><LogOut className="h-4 w-4" /></Button>; }
