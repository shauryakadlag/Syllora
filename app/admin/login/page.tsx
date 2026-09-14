"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, Lock, AlertCircle, ArrowLeft, RotateCw } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isLoading) return;

    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.success) {
        // Safe generic authentication error message
        setError(json?.error?.message || "Invalid email or password.");
        setIsLoading(false);
        return;
      }

      // Successful login -> Navigate to protected admin dashboard
      router.push("/admin");
      router.refresh();
    } catch {
      setError("An unexpected error occurred. Please try again.");
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-[85vh] flex flex-col justify-center items-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-6">
        {/* Syllora Admin Header Branding */}
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <ShieldCheck className="h-6 w-6" aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2">
              <span className="text-xl font-bold tracking-tight text-foreground">
                Syllora
              </span>
              <Badge variant="academic" className="text-[10px] font-mono uppercase">
                Admin
              </Badge>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Administrator Portal
            </h1>
            <p className="text-xs text-muted-foreground">
              Secure authentication for authorized Syllora administrators.
            </p>
          </div>
        </div>

        {/* Login Form Card */}
        <Card className="border-border/80 shadow-md">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Lock className="h-4 w-4 text-primary" aria-hidden="true" />
              <span>Sign In</span>
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Enter your administrator credentials to access the management portal.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Generic Error Alert */}
            {error && (
              <div
                className="flex items-start gap-2.5 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive animate-in fade-in-0 duration-150"
                role="alert"
                aria-live="polite"
              >
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
                <div className="flex-1">
                  <p className="font-medium">{error}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="admin-email"
                  className="block text-xs font-medium text-foreground"
                >
                  Email Address
                </label>
                <input
                  id="admin-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@syllora.app"
                  disabled={isLoading}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-50 transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="admin-password"
                  className="block text-xs font-medium text-foreground"
                >
                  Password
                </label>
                <input
                  id="admin-password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  disabled={isLoading}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-50 transition-colors"
                />
              </div>

              <Button
                type="submit"
                className="w-full gap-2 font-medium"
                disabled={isLoading}
                aria-busy={isLoading}
              >
                {isLoading ? (
                  <>
                    <RotateCw className="h-4 w-4 animate-spin text-primary-foreground" aria-hidden="true" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <span>Sign In</span>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Back Link to Public Student Portal */}
        <div className="text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Return to Student Curriculum Portal</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
