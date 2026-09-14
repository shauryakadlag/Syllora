"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  GraduationCap,
  Lock,
  Mail,
  AlertCircle,
  ArrowLeft,
  RotateCw,
  CheckCircle2,
  Info,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function StudentLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo");

  // Safe redirect destination: must be relative path starting with /
  const safeReturnTo =
    returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/";

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  function switchMode(newMode: "login" | "signup") {
    setMode(newMode);
    setError(null);
    setSuccessMessage(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isLoading) return;

    setError(null);
    setSuccessMessage(null);

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setError("Please enter your email address.");
      return;
    }

    if (!password) {
      setError("Please enter your password.");
      return;
    }

    if (mode === "signup") {
      if (password.length < 6) {
        setError("Password must be at least 6 characters.");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
    }

    setIsLoading(true);

    try {
      const endpoint =
        mode === "login" ? "/api/student/auth/login" : "/api/student/auth/signup";

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: trimmedEmail, password }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.success) {
        setError(json?.error?.message || (mode === "login" ? "Invalid email or password." : "Failed to create account."));
        setIsLoading(false);
        return;
      }

      if (mode === "signup" && !json?.data?.sessionEstablished) {
        setSuccessMessage("Account created successfully! You can now sign in.");
        setMode("login");
        setPassword("");
        setConfirmPassword("");
        setIsLoading(false);
        return;
      }

      // Successful login or signup with session
      router.push(safeReturnTo);
      router.refresh();
    } catch {
      setError("An unexpected network error occurred. Please try again.");
      setIsLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md space-y-6">
      {/* Branding */}
      <div className="text-center space-y-2">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
          <GraduationCap className="h-6 w-6" aria-hidden="true" />
        </div>
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2">
            <span className="text-xl font-bold tracking-tight text-foreground">
              Syllora
            </span>
            <Badge variant="academic" className="text-[10px] font-mono uppercase">
              Student
            </Badge>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {mode === "login" ? "Student Sign In" : "Create Student Account"}
          </h1>
          <p className="text-xs text-muted-foreground">
            {mode === "login"
              ? "Sign in to track your learning progress across topics."
              : "Register to save and track your personal learning progress."}
          </p>
        </div>
      </div>

      {/* Optional Notice */}
      <div className="flex items-start gap-2.5 rounded-lg border border-primary/20 bg-primary/[0.04] p-3 text-xs text-muted-foreground">
        <Info className="h-4 w-4 shrink-0 mt-0.5 text-primary" aria-hidden="true" />
        <p>
          <strong className="font-semibold text-foreground">Note:</strong> Accounts are completely optional. You can browse all curriculum subjects, syllabus units, and learning resources without logging in.
        </p>
      </div>

      {/* Form Card */}
      <Card className="border-border/80 shadow-md">
        <CardHeader className="space-y-3 pb-4">
          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-2 rounded-lg bg-muted p-1 text-xs font-medium" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={mode === "login"}
              onClick={() => switchMode("login")}
              className={`rounded-md py-1.5 transition-all text-center ${
                mode === "login"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "signup"}
              onClick={() => switchMode("signup")}
              className={`rounded-md py-1.5 transition-all text-center ${
                mode === "signup"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Create Account
            </button>
          </div>

          <div>
            <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
              <Lock className="h-4 w-4 text-primary" aria-hidden="true" />
              <span>{mode === "login" ? "Welcome Back" : "Get Started"}</span>
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              {mode === "login"
                ? "Enter your email and password to resume your progress."
                : "Create a simple student account to track completed topics."}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Error Message */}
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

          {/* Success Message */}
          {successMessage && (
            <div
              className="flex items-start gap-2.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-600 dark:text-emerald-400 animate-in fade-in-0 duration-150"
              role="status"
              aria-live="polite"
            >
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
              <div className="flex-1">
                <p className="font-medium">{successMessage}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="student-email"
                className="block text-xs font-medium text-foreground flex items-center gap-1.5"
              >
                <Mail className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                <span>Email Address</span>
              </label>
              <input
                id="student-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@example.com"
                disabled={isLoading}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-50 transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="student-password"
                className="block text-xs font-medium text-foreground flex items-center gap-1.5"
              >
                <Lock className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                <span>Password</span>
              </label>
              <input
                id="student-password"
                type="password"
                required
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                disabled={isLoading}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-50 transition-colors"
              />
              {mode === "signup" && (
                <p className="text-[11px] text-muted-foreground">
                  Must be at least 6 characters.
                </p>
              )}
            </div>

            {mode === "signup" && (
              <div className="space-y-1.5">
                <label
                  htmlFor="student-confirm-password"
                  className="block text-xs font-medium text-foreground flex items-center gap-1.5"
                >
                  <Lock className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                  <span>Confirm Password</span>
                </label>
                <input
                  id="student-confirm-password"
                  type="password"
                  required
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  disabled={isLoading}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-50 transition-colors"
                />
              </div>
            )}

            <Button
              type="submit"
              className="w-full gap-2 font-medium"
              disabled={isLoading}
              aria-busy={isLoading}
            >
              {isLoading ? (
                <>
                  <RotateCw className="h-4 w-4 animate-spin text-primary-foreground" aria-hidden="true" />
                  <span>{mode === "login" ? "Signing in..." : "Creating account..."}</span>
                </>
              ) : (
                <span>{mode === "login" ? "Sign In" : "Create Account"}</span>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Back Link */}
      <div className="text-center">
        <Link
          href={safeReturnTo}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Back to Curriculum</span>
        </Link>
      </div>
    </div>
  );
}

export default function StudentLoginPage() {
  return (
    <div className="min-h-[85vh] flex flex-col justify-center items-center px-4 py-12 sm:px-6 lg:px-8">
      <Suspense fallback={<div className="h-96 w-full max-w-md animate-pulse bg-muted/40 rounded-xl" />}>
        <StudentLoginForm />
      </Suspense>
    </div>
  );
}
