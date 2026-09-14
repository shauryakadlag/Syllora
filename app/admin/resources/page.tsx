import React from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ShieldCheck,
  ArrowLeft,
  BookOpen,
  ExternalLink,
  CheckCircle2,
  Clock,
  XCircle,
  FileText,
  Video,
  ListVideo,
  FileCode,
  Layers,
  AlertTriangle,
  Info,
  Plus,
  Pencil,
  ShieldAlert,
} from "lucide-react";
import { verifyAdminSession } from "@/lib/auth/admin";
import { getAdminResources, AdminResourceSummary } from "@/lib/services/admin-resources";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LogoutButton } from "@/components/admin/logout-button";
import { ResourceModerationActions } from "@/components/admin/resource-moderation-actions";
import { ResourceStatus, ResourceType } from "@/types/database";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Learning Resources Roster | Syllora Admin",
  description: "Administrative read-only learning resource catalog and verification roster",
};

function getStatusBadge(status: ResourceStatus) {
  switch (status) {
    case "verified":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
          <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
          <span>Verified</span>
        </span>
      );
    case "pending":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
          <Clock className="h-3 w-3" aria-hidden="true" />
          <span>Pending</span>
        </span>
      );
    case "rejected":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800">
          <XCircle className="h-3 w-3" aria-hidden="true" />
          <span>Rejected</span>
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

function getTypeIcon(type: ResourceType) {
  switch (type) {
    case "video":
      return <Video className="h-3.5 w-3.5" aria-hidden="true" />;
    case "playlist":
      return <ListVideo className="h-3.5 w-3.5" aria-hidden="true" />;
    case "pdf":
      return <FileText className="h-3.5 w-3.5" aria-hidden="true" />;
    case "documentation":
      return <FileCode className="h-3.5 w-3.5" aria-hidden="true" />;
    case "article":
    default:
      return <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />;
  }
}

function formatDate(isoString: string): string {
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return "Unknown";
    return date.toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "Unknown";
  }
}

export default async function AdminResourcesPage() {
  // 1. Authoritative server-side authorization check
  const authResult = await verifyAdminSession();

  if (!authResult.authorized) {
    redirect("/admin/login");
  }

  const { admin } = authResult;

  // 2. Fetch all resources via admin resource service
  const resourcesResult = await getAdminResources();

  const resources = resourcesResult.success ? resourcesResult.data.resources : [];
  const counts = resourcesResult.success
    ? resourcesResult.data.counts
    : { total: 0, verified: 0, pending: 0, rejected: 0 };

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-12 space-y-8">
      {/* Top Header & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs">
              <BookOpen className="h-5 w-5" aria-hidden="true" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Learning Resources
            </h1>
            <Badge variant="academic" className="font-mono text-xs uppercase px-2 py-0.5">
              {admin.role}
            </Badge>
            <Badge variant="secondary" className="text-xs text-muted-foreground font-mono">
              Phase 7F-C
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground pt-0.5">
            Curated learning resources catalog across subjects and topics.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/admin/resources/new"
            className="inline-flex items-center gap-1.5 text-xs text-primary-foreground font-semibold py-1.5 px-3 rounded-md bg-primary hover:bg-primary/90 transition-colors shadow-xs"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Add Resource</span>
          </Link>
          <Link
            href="/admin/resource-reports"
            className="inline-flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400 font-medium hover:text-amber-800 dark:hover:text-amber-300 transition-colors py-1.5 px-2.5 rounded-md border border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10"
          >
            <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Reports</span>
          </Link>
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-1.5 px-2.5 rounded-md border border-border bg-background hover:bg-muted/40"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Dashboard</span>
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-1.5 px-2.5 rounded-md border border-border bg-background hover:bg-muted/40"
          >
            <span>Student Portal</span>
          </Link>
          <LogoutButton />
        </div>
      </div>

      {/* Summary Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-border/80 shadow-xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Total Catalog</span>
              <Layers className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            </div>
            <div className="mt-2 text-2xl font-extrabold tracking-tight text-foreground">
              {counts.total}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">All registered resources</p>
          </CardContent>
        </Card>

        <Card className="border-emerald-500/20 bg-emerald-500/[0.02] shadow-xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                Verified
              </span>
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            </div>
            <div className="mt-2 text-2xl font-extrabold tracking-tight text-emerald-700 dark:text-emerald-400">
              {counts.verified}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Active & student-visible</p>
          </CardContent>
        </Card>

        <Card className="border-amber-500/20 bg-amber-500/[0.02] shadow-xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
                Pending
              </span>
              <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />
            </div>
            <div className="mt-2 text-2xl font-extrabold tracking-tight text-amber-700 dark:text-amber-400">
              {counts.pending}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Awaiting moderation</p>
          </CardContent>
        </Card>

        <Card className="border-rose-500/20 bg-rose-500/[0.02] shadow-xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-rose-700 dark:text-rose-400">
                Rejected
              </span>
              <XCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" aria-hidden="true" />
            </div>
            <div className="mt-2 text-2xl font-extrabold tracking-tight text-rose-700 dark:text-rose-400">
              {counts.rejected}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Excluded from catalog</p>
          </CardContent>
        </Card>
      </div>

      {/* Error Banner (if service failed) */}
      {!resourcesResult.success && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-xs text-destructive flex items-start gap-2.5">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <span className="font-semibold">Unable to fetch resources: </span>
            <span>{resourcesResult.error.message}</span>
          </div>
        </div>
      )}

      {/* Resources Roster */}
      <Card className="border-border/80 shadow-xs overflow-hidden">
        <CardHeader className="border-b border-border/60 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base font-bold text-foreground">
                Resource Catalog Roster
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                Comprehensive list of all learning resources currently recorded in the database.
              </CardDescription>
            </div>
            <div className="text-xs text-muted-foreground font-mono">
              Showing {resources.length} {resources.length === 1 ? "resource" : "resources"}
            </div>
          </div>
        </CardHeader>

        {resources.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <BookOpen className="h-10 w-10 text-muted-foreground/40 mx-auto" aria-hidden="true" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">No resources registered</p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                No learning resources have been added to the database yet.
              </p>
            </div>
          </div>
        ) : (
          <div>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 border-b border-border text-muted-foreground font-semibold">
                  <tr>
                    <th scope="col" className="px-4 py-3 w-28">Status</th>
                    <th scope="col" className="px-4 py-3">Resource & URL</th>
                    <th scope="col" className="px-4 py-3 w-32">Type</th>
                    <th scope="col" className="px-4 py-3 w-36">Provider</th>
                    <th scope="col" className="px-4 py-3">Linked Topic</th>
                    <th scope="col" className="px-4 py-3 w-28 text-right">Added</th>
                    <th scope="col" className="px-4 py-3 w-48 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {resources.map((item: AdminResourceSummary) => (
                    <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                      {/* Status */}
                      <td className="px-4 py-3.5 align-top">
                        {getStatusBadge(item.status)}
                      </td>

                      {/* Title & URL */}
                      <td className="px-4 py-3.5 align-top space-y-1 max-w-md">
                        <div className="font-semibold text-foreground leading-snug">
                          {item.title}
                        </div>
                        {item.isSafeUrl ? (
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 font-mono text-[11px] text-primary hover:underline break-all"
                          >
                            <span className="truncate max-w-xs">{item.url}</span>
                            <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
                          </a>
                        ) : (
                          <span className="font-mono text-[11px] text-muted-foreground truncate max-w-xs block">
                            {item.url}
                          </span>
                        )}
                        {item.description && (
                          <p className="text-[11px] text-muted-foreground line-clamp-2 pt-0.5 leading-relaxed">
                            {item.description}
                          </p>
                        )}
                      </td>

                      {/* Type */}
                      <td className="px-4 py-3.5 align-top">
                        <span className="inline-flex items-center gap-1.5 text-xs text-foreground capitalize">
                          {getTypeIcon(item.type)}
                          <span>{item.type}</span>
                        </span>
                      </td>

                      {/* Provider */}
                      <td className="px-4 py-3.5 align-top">
                        <span className="font-medium text-foreground">
                          {item.provider || "—"}
                        </span>
                      </td>

                      {/* Linked Topic */}
                      <td className="px-4 py-3.5 align-top">
                        {item.topic ? (
                          <div className="space-y-0.5">
                            <span className="font-medium text-foreground text-xs leading-snug line-clamp-2">
                              {item.topic.normalizedTitle}
                            </span>
                            <span className="font-mono text-[10px] text-muted-foreground truncate block">
                              ID: {item.topic.id.slice(0, 8)}...
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground italic text-xs">
                            Unlinked
                          </span>
                        )}
                      </td>

                      {/* Added Date */}
                      <td className="px-4 py-3.5 align-top text-right font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                        {formatDate(item.createdAt)}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 align-top text-right">
                        <ResourceModerationActions
                          resourceId={item.id}
                          status={item.status}
                          resourceTitle={item.title}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List View */}
            <div className="md:hidden divide-y divide-border/60">
              {resources.map((item: AdminResourceSummary) => (
                <div key={item.id} className="p-4 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    {getStatusBadge(item.status)}
                    <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground capitalize">
                      {getTypeIcon(item.type)}
                      <span>{item.type}</span>
                    </span>
                  </div>

                  <div className="space-y-1">
                    <h2 className="font-semibold text-foreground text-sm leading-snug">
                      {item.title}
                    </h2>
                    {item.isSafeUrl && (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-mono text-xs text-primary hover:underline break-all"
                      >
                        <span className="truncate max-w-[240px]">{item.url}</span>
                        <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
                      </a>
                    )}
                    {item.description && (
                      <p className="text-xs text-muted-foreground pt-0.5 leading-relaxed">
                        {item.description}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-muted-foreground border-t border-border/40">
                    <div>
                      <span className="font-medium text-foreground">Provider: </span>
                      <span>{item.provider || "—"}</span>
                    </div>
                    <div>
                      <span>Added: </span>
                      <span className="font-mono">{formatDate(item.createdAt)}</span>
                    </div>
                  </div>

                  {item.topic && (
                    <div className="text-[11px] bg-muted/40 rounded p-2 text-muted-foreground">
                      <span className="font-medium text-foreground">Topic: </span>
                      <span>{item.topic.normalizedTitle}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-end pt-1">
                    <ResourceModerationActions
                      resourceId={item.id}
                      status={item.status}
                      resourceTitle={item.title}
                      compact
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Scope / Invariants Notice Banner */}
      <Card className="border-primary/20 bg-primary/[0.02] dark:bg-primary/[0.05] shadow-xs">
        <CardContent className="p-4 sm:p-5 flex items-start gap-3.5 text-xs text-muted-foreground">
          <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" aria-hidden="true" />
          <div className="space-y-1">
            <p className="font-semibold text-foreground">
              Phase 7F-C: Resource Verification & Rejection Moderation Active
            </p>
            <p className="leading-relaxed">
              Administrators can verify or reject pending catalog resources. Verified resources are published immediately to the student curriculum experience, while rejected resources remain excluded. Topic linking and rating workflows remain strictly scoped to upcoming phases.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
