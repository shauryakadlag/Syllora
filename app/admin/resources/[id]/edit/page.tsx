import React from "react";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Edit3, ArrowLeft, AlertCircle, BookOpen } from "lucide-react";
import { verifyAdminSession } from "@/lib/auth/admin";
import {
  getAdminResourceById,
  getAdminResourceTopics,
  getAdminPublishedTopics,
  UUID_REGEX,
} from "@/lib/services/admin-resources";
import { ResourceForm } from "@/components/admin/resource-form";
import { ResourceTopicLinks } from "@/components/admin/resource-topic-links";
import { LogoutButton } from "@/components/admin/logout-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

interface EditResourcePageProps {
  params: {
    id: string;
  };
}

export async function generateMetadata({ params }: EditResourcePageProps) {
  return {
    title: `Edit Resource | Syllora Admin`,
    description: `Edit metadata for resource ${params.id}`,
  };
}

export default async function EditAdminResourcePage({ params }: EditResourcePageProps) {
  const authResult = await verifyAdminSession();

  if (!authResult.authorized) {
    redirect("/admin/login");
  }

  const { id } = params;
  if (!id || !UUID_REGEX.test(id)) {
    notFound();
  }

  const [resourceResult, linkedTopicsResult, publishedTopicsResult] = await Promise.all([
    getAdminResourceById(id),
    getAdminResourceTopics(id),
    getAdminPublishedTopics(),
  ]);

  if (!resourceResult.success || !resourceResult.data) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-12 space-y-6 text-center">
        <Card className="border-border/80 p-8 space-y-4">
          <AlertCircle className="h-10 w-10 text-destructive mx-auto" aria-hidden="true" />
          <div className="space-y-1">
            <h1 className="text-xl font-bold text-foreground">Resource Not Found</h1>
            <p className="text-xs text-muted-foreground">
              The requested resource could not be found or may have been removed.
            </p>
          </div>
          <div className="pt-2">
            <Button variant="outline" asChild size="sm">
              <Link href="/admin/resources" className="inline-flex items-center gap-1.5">
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Return to Resources Roster</span>
              </Link>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const resource = resourceResult.data;
  const linkedTopics = linkedTopicsResult.success ? linkedTopicsResult.data : [];
  const publishedTopics = publishedTopicsResult.success ? publishedTopicsResult.data : [];
  const { admin } = authResult;

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:py-12 space-y-8">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-6">
        <div className="space-y-1">
          {/* Breadcrumb Navigation */}
          <nav className="flex items-center gap-1.5 text-xs text-muted-foreground pb-1">
            <Link href="/admin" className="hover:text-foreground transition-colors">
              Admin
            </Link>
            <span>/</span>
            <Link href="/admin/resources" className="hover:text-foreground transition-colors">
              Resources
            </Link>
            <span>/</span>
            <span className="text-foreground font-medium">Edit</span>
          </nav>

          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs">
              <Edit3 className="h-5 w-5" aria-hidden="true" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Edit Resource
            </h1>
            <Badge variant="academic" className="font-mono text-xs uppercase px-2 py-0.5">
              {admin.role}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground pt-0.5 truncate max-w-lg">
            {resource.title}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/admin/resources"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-1.5 px-2.5 rounded-md border border-border bg-background hover:bg-muted/40"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Roster</span>
          </Link>
          <LogoutButton />
        </div>
      </div>

      {/* Edit Metadata Form */}
      <ResourceForm mode="edit" initialData={resource} />

      {/* Curriculum Topic Links Section */}
      <ResourceTopicLinks
        resourceId={resource.id}
        initialLinkedTopics={linkedTopics}
        availableTopics={publishedTopics}
      />
    </div>
  );
}
