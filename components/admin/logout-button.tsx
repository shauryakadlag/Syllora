"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LogoutButtonProps {
  className?: string;
  variant?: "outline" | "default" | "destructive" | "secondary" | "ghost";
}

export function LogoutButton({ className, variant = "outline" }: LogoutButtonProps) {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      await fetch("/api/admin/auth/logout", {
        method: "POST",
      });
    } catch {
      // Regardless of network status, redirect to login to clear client view
    } finally {
      router.push("/admin/login");
      router.refresh();
    }
  }

  return (
    <Button
      type="button"
      variant={variant}
      size="sm"
      onClick={handleLogout}
      disabled={isLoggingOut}
      className={`gap-1.5 ${className || ""}`}
      aria-label="Sign out of admin session"
    >
      {isLoggingOut ? (
        <RotateCw className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden="true" />
      ) : (
        <LogOut className="h-4 w-4" aria-hidden="true" />
      )}
      <span>{isLoggingOut ? "Signing out..." : "Sign Out"}</span>
    </Button>
  );
}
