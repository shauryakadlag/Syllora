import React from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, UserCheck, KeyRound, ArrowLeft, CheckCircle2, Lock, BookOpen, ArrowRight, ShieldAlert } from "lucide-react";
import { verifyAdminSession } from "@/lib/auth/admin";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LogoutButton } from "@/components/admin/logout-button";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Admin Dashboard | Syllora",
  description: "Syllora Administrative Management Portal",
};

export default async function AdminDashboardPage() {
  // Authoritative server-side authorization check
  const authResult = await verifyAdminSession();

  // If unauthenticated or not an active admin, redirect immediately to login
  if (!authResult.authorized) {
    redirect("/admin/login");
  }

  const { user, admin } = authResult;

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:py-12 space-y-8">
      {/* Top Header & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Syllora Admin
            </h1>
            <Badge variant="academic" className="font-mono text-xs uppercase px-2 py-0.5">
              {admin.role}
            </Badge>
            <Badge variant="secondary" className="text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20">
              Active
            </Badge>
          </div>
          <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 pt-1">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            <span>Authenticated administrator access verified.</span>
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/admin/resources"
            className="inline-flex items-center gap-1.5 text-xs text-primary font-medium hover:text-primary/80 transition-colors py-1.5 px-2.5 rounded-md border border-primary/20 bg-primary/5 hover:bg-primary/10"
          >
            <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Learning Resources</span>
          </Link>
          <Link
            href="/admin/resource-reports"
            className="inline-flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400 font-medium hover:text-amber-800 dark:hover:text-amber-300 transition-colors py-1.5 px-2.5 rounded-md border border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10"
          >
            <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Resource Reports</span>
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-1.5 px-2.5 rounded-md border border-border bg-background hover:bg-muted/40"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Student Portal</span>
          </Link>
          <LogoutButton />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Administrator Identity Card */}
        <Card className="border-border/80 shadow-xs">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-primary" aria-hidden="true" />
              <CardTitle className="text-base font-bold text-foreground">
                Administrator Identity
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-muted-foreground">
              Verified identity details from Supabase Auth and PostgreSQL admins roster.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-2">
            <div className="rounded-lg bg-muted/40 border border-border/60 p-3.5 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground font-medium">Email:</span>
                <span className="font-mono text-foreground font-semibold">
                  {user.email}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground font-medium">Assigned Role:</span>
                <Badge variant="outline" className="font-mono text-[11px] capitalize">
                  {admin.role}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground font-medium">Account Status:</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                  Active (Verified)
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground font-medium">User ID:</span>
                <span className="font-mono text-[10px] text-muted-foreground truncate max-w-[200px]">
                  {user.id}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security & Authorization Foundation Card */}
        <Card className="border-border/80 shadow-xs">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-primary" aria-hidden="true" />
              <CardTitle className="text-base font-bold text-foreground">
                Security Architecture
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-muted-foreground">
              Server-side authorization and PostgreSQL Row Level Security parameters.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-2">
            <div className="rounded-lg bg-muted/40 border border-border/60 p-3.5 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground font-medium">Session Guard:</span>
                <span className="font-medium text-foreground">
                  @supabase/ssr HTTP Cookies
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground font-medium">Authorization Mechanism:</span>
                <span className="font-mono text-[11px] text-foreground">
                  public.is_admin() (PostgreSQL)
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground font-medium">Client Role Trust:</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                  Zero Trust (Server Authoritative)
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground font-medium">Service-Role Key:</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                  None (Least Privilege Anon + RLS)
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Administrative Modules */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-border/80 shadow-xs hover:border-primary/40 transition-all">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" aria-hidden="true" />
                <CardTitle className="text-base font-bold text-foreground">
                  Learning Resources
                </CardTitle>
              </div>
              <Badge variant="outline" className="font-mono text-xs">
                Phase 7F
              </Badge>
            </div>
            <CardDescription className="text-xs text-muted-foreground">
              Create, edit, verify, reject, and link curated learning resources with learning topics.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-1">
            <Link
              href="/admin/resources"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
            >
              <span>Manage Resources</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-xs hover:border-amber-500/40 transition-all">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                <CardTitle className="text-base font-bold text-foreground">
                  Resource Reports
                </CardTitle>
              </div>
              <Badge variant="outline" className="font-mono text-xs">
                Phase 8B
              </Badge>
            </div>
            <CardDescription className="text-xs text-muted-foreground">
              Review and moderate student-submitted problem reports (broken, misleading, irrelevant) on verified resources.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-1">
            <Link
              href="/admin/resource-reports"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 transition-colors"
            >
              <span>Manage Reports</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Scope Notice Card */}
      <Card className="border-primary/20 bg-primary/[0.02] dark:bg-primary/[0.05] shadow-xs">
        <CardContent className="p-5 flex items-start gap-3.5 text-xs text-muted-foreground">
          <Lock className="h-5 w-5 text-primary shrink-0 mt-0.5" aria-hidden="true" />
          <div className="space-y-1">
            <p className="font-semibold text-foreground">
              Phase 7E Administrative Foundation Active
            </p>
            <p className="leading-relaxed">
              The secure authentication and authorization foundation is successfully established.
              Resource curation, moderation workflows, and management controls will be introduced
              in subsequent phases following the strict security boundaries defined here.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
