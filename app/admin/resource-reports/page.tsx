import React from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ShieldAlert,
  ArrowLeft,
  BookOpen,
  ExternalLink,
  CheckCircle2,
  Clock,
  Ban,
  AlertTriangle,
  Info,
  Pencil,
  FileQuestion,
  MessageSquareWarning,
} from "lucide-react";
import { verifyAdminSession } from "@/lib/auth/admin";
import { getAdminResourceReports } from "@/lib/services/admin-reports";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LogoutButton } from "@/components/admin/logout-button";
import { ReportModerationActions } from "@/components/admin/report-moderation-actions";
import { ReportReason, ReportStatus } from "@/types/database";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Resource Reports | Syllora Admin",
  description: "Administrative moderation and resolution of student-reported learning resources",
};

function getReportStatusBadge(status: ReportStatus) {
  switch (status) {
    case "open":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
          <Clock className="h-3 w-3" aria-hidden="true" />
          <span>Open</span>
        </span>
      );
    case "resolved":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
          <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
          <span>Resolved</span>
        </span>
      );
    case "dismissed":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold text-muted-foreground bg-muted/60 border border-border">
          <Ban className="h-3 w-3" aria-hidden="true" />
          <span>Dismissed</span>
        </span>
      );
    default:
      return (
        <Badge variant="outline" className="text-xs">
          {status}
        </Badge>
      );
  }
}

function getReasonLabel(reason: ReportReason): string {
  switch (reason) {
    case "broken":
      return "Broken / Unavailable";
    case "misleading":
      return "Misleading / Incorrect";
    case "irrelevant":
      return "Not Relevant to Topic";
    case "other":
    default:
      return "Other Issue";
  }
}

function formatDateTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return "Unknown";
    return date.toLocaleString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "Unknown";
  }
}

export default async function AdminResourceReportsPage() {
  // 1. Authoritative server-side authorization check
  const authResult = await verifyAdminSession();

  if (!authResult.authorized) {
    redirect("/admin/login");
  }

  // 2. Fetch reports list
  const reportsResult = await getAdminResourceReports();
  const reports = reportsResult.success ? reportsResult.data.reports : [];
  const counts = reportsResult.success
    ? reportsResult.data.counts
    : { total: 0, open: 0, resolved: 0, dismissed: 0 };

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-12 space-y-8">
      {/* Top Header & Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 shadow-xs">
              <ShieldAlert className="h-5 w-5" aria-hidden="true" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Resource Reports
            </h1>
            <Badge variant="academic" className="font-mono text-xs uppercase px-2 py-0.5">
              Phase 8B
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground pt-1">
            Review and moderate student issue reports submitted for verified learning resources.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-1.5 px-2.5 rounded-md border border-border bg-background hover:bg-muted/40"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Admin Home</span>
          </Link>
          <Link
            href="/admin/resources"
            className="inline-flex items-center gap-1.5 text-xs text-primary font-medium hover:text-primary/80 transition-colors py-1.5 px-2.5 rounded-md border border-primary/20 bg-primary/5 hover:bg-primary/10"
          >
            <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Resources Roster</span>
          </Link>
          <LogoutButton />
        </div>
      </div>

      {/* Summary Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-border/80 shadow-xs">
          <CardHeader className="p-4 pb-1">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total Reports
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-foreground font-mono">
              {counts.total}
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-500/20 bg-amber-500/[0.02] shadow-xs">
          <CardHeader className="p-4 pb-1">
            <CardTitle className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1">
              <Clock className="h-3 w-3" aria-hidden="true" />
              <span>Open</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-amber-700 dark:text-amber-400 font-mono">
              {counts.open}
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-500/20 bg-emerald-500/[0.02] shadow-xs">
          <CardHeader className="p-4 pb-1">
            <CardTitle className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
              <span>Resolved</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 font-mono">
              {counts.resolved}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-xs">
          <CardHeader className="p-4 pb-1">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <Ban className="h-3 w-3" aria-hidden="true" />
              <span>Dismissed</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-muted-foreground font-mono">
              {counts.dismissed}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Reports List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <MessageSquareWarning className="h-4 w-4 text-primary" aria-hidden="true" />
            <span>Reports Roster</span>
            <span className="text-xs font-normal text-muted-foreground">
              ({reports.length} {reports.length === 1 ? "report" : "reports"})
            </span>
          </h2>
        </div>

        {/* Empty State */}
        {reports.length === 0 && (
          <Card className="border-dashed border-border py-12 text-center shadow-none">
            <CardContent className="flex flex-col items-center justify-center space-y-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/60 text-muted-foreground">
                <FileQuestion className="h-6 w-6" aria-hidden="true" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">No reports found</p>
                <p className="text-xs text-muted-foreground max-w-sm">
                  Student issue reports submitted from the curriculum pages will appear here for administrator review.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Reports Cards */}
        {reports.length > 0 && (
          <div className="space-y-3">
            {reports.map((report) => (
              <Card
                key={report.id}
                className={`border transition-all ${
                  report.status === "open"
                    ? "border-amber-500/30 bg-amber-500/[0.01] hover:border-amber-500/50"
                    : "border-border/80 hover:border-border"
                } shadow-xs`}
              >
                <CardContent className="p-4 sm:p-5 space-y-3.5">
                  {/* Row 1: Badges, reason & date */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-2.5">
                    <div className="flex items-center gap-2">
                      {getReportStatusBadge(report.status)}
                      <Badge variant="outline" className="font-medium text-xs">
                        {getReasonLabel(report.reason)}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground font-mono">
                      Reported {formatDateTime(report.createdAt)}
                    </div>
                  </div>

                  {/* Row 2: Target Resource Information */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-muted-foreground">
                          Reported Resource:
                        </span>
                        {report.resource ? (
                          <>
                            <a
                              href={report.resource.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-semibold text-sm text-foreground hover:text-primary transition-colors inline-flex items-center gap-1 truncate max-w-md"
                              title={`Open ${report.resource.title} in new tab`}
                            >
                              <span>{report.resource.title}</span>
                              <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
                            </a>
                            {report.resource.provider && (
                              <span className="text-xs text-muted-foreground font-medium">
                                ({report.resource.provider})
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-sm font-mono text-muted-foreground">
                            {report.resourceId} (Deleted or Unreachable)
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {report.resource && (
                        <Link
                          href={`/admin/resources/${report.resource.id}/edit`}
                          className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium py-1 px-2 rounded hover:bg-primary/5 transition-colors border border-transparent hover:border-border"
                          title={`Edit resource in admin`}
                        >
                          <Pencil className="h-3 w-3" aria-hidden="true" />
                          <span>Edit Resource</span>
                        </Link>
                      )}
                    </div>
                  </div>

                  {/* Row 3: Student Description (if provided) */}
                  {report.description && (
                    <div className="rounded-md bg-muted/40 border border-border/70 p-3 text-xs space-y-1">
                      <div className="font-semibold text-muted-foreground text-[11px] uppercase tracking-wider">
                        Student Note
                      </div>
                      <p className="text-foreground whitespace-pre-wrap leading-relaxed">
                        {report.description}
                      </p>
                    </div>
                  )}

                  {/* Row 4: Resolution info or Action Buttons */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-border/40">
                    <div className="text-xs text-muted-foreground">
                      {report.status !== "open" && report.resolvedAt && (
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">
                            {report.status === "resolved" ? "Resolved" : "Dismissed"}:
                          </span>
                          <span>{formatDateTime(report.resolvedAt)}</span>
                          {report.resolvedBy && (
                            <span className="font-mono text-[11px] text-muted-foreground truncate max-w-[180px]">
                              by {report.resolvedBy}
                            </span>
                          )}
                        </div>
                      )}
                      {report.status === "open" && (
                        <span className="text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                          <span>Action required: determine whether resource needs correction or dismissal.</span>
                        </span>
                      )}
                    </div>

                    <div>
                      <ReportModerationActions
                        reportId={report.id}
                        status={report.status}
                        resourceTitle={report.resource?.title}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Guidance and Invariants Notice */}
      <Card className="border-border/80 bg-muted/20 shadow-xs">
        <CardContent className="p-4 sm:p-5 flex items-start gap-3.5 text-xs text-muted-foreground">
          <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" aria-hidden="true" />
          <div className="space-y-1">
            <p className="font-semibold text-foreground">
              Resource Moderation Policy & Safety Boundary
            </p>
            <p className="leading-relaxed">
              Resolving or dismissing a report serves as a moderation status signal and does not automatically alter, reject, or remove the target learning resource. If a reported link is genuinely broken or inaccurate, navigate to the resource edit interface to update its URL, or use moderation controls to reject the resource.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
