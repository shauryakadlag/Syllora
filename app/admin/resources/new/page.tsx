import React from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { PlusCircle, ArrowLeft, BookOpen } from "lucide-react";
import { verifyAdminSession } from "@/lib/auth/admin";
import { ResourceForm } from "@/components/admin/resource-form";
import { LogoutButton } from "@/components/admin/logout-button";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Add Learning Resource | Syllora Admin",
  description: "Register a new learning resource into the Syllora curriculum catalog",
};

export default async function NewAdminResourcePage() {
  const authResult = await verifyAdminSession();

  if (!authResult.authorized) {
    redirect("/admin/login");
  }

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
            <span className="text-foreground font-medium">New</span>
          </nav>

          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs">
              <PlusCircle className="h-5 w-5" aria-hidden="true" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Add Resource
            </h1>
            <Badge variant="academic" className="font-mono text-xs uppercase px-2 py-0.5">
              {admin.role}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground pt-0.5">
            Register a new educational resource in the Syllora curriculum catalog.
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

      {/* Creation Form */}
      <ResourceForm mode="create" />
    </div>
  );
}
