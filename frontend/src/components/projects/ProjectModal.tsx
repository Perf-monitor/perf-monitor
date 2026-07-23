"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useCreateProject, useUpdateProject } from "@/hooks/useProjects";
import { toast } from "@/components/ui/Toaster";
import type { Project, ProjectFormData } from "@/types";

interface ProjectModalProps {
  project: Project | null;
  onClose: () => void;
}

export function ProjectModal({ project, onClose }: ProjectModalProps) {
  const isEdit = !!project;
  const createMutation = useCreateProject();
  const updateMutation = useUpdateProject(project?.id ?? "");

  const [form, setForm] = useState<ProjectFormData>({
    name: "",
    url: "",
    framework: "nextjs",
    environment: "production",
    organization: "",
    description: "",
    active: true,
    scan_mobile: true,
    scan_desktop: true,
    deployment_version: "",
    git_commit_id: "",
    build_time: "",
  });

  useEffect(() => {
    if (project) {
      setForm({
        name: project.name,
        url: project.url,
        framework: project.framework,
        environment: project.environment,
        organization: project.organization,
        description: project.description,
        active: project.active,
        scan_mobile: project.scan_mobile,
        scan_desktop: project.scan_desktop,
        deployment_version: project.deployment_version,
        git_commit_id: project.git_commit_id,
        build_time: project.build_time,
      });
    }
  }, [project]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEdit) {
        await updateMutation.mutateAsync(form);
        toast({ title: "Project updated", variant: "success" });
      } else {
        await createMutation.mutateAsync(form);
        toast({ title: "Project created", variant: "success" });
      }
      onClose();
    } catch {
      toast({ title: `Failed to ${isEdit ? "update" : "create"} project`, variant: "destructive" });
    }
  };

  const loading = createMutation.isPending || updateMutation.isPending;

  const field = (
    label: string,
    key: keyof ProjectFormData,
    type = "text",
    placeholder = ""
  ) => (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{label}</label>
      <input
        type={type}
        value={(form[key] as string) ?? ""}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        placeholder={placeholder}
        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xl rounded-xl border border-border bg-card shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-semibold">{isEdit ? "Edit Project" : "Add New Project"}</h2>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-accent transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {field("Project Name *", "name", "text", "My App")}
            {field("URL *", "url", "url", "https://example.com")}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Framework</label>
              <select
                value={form.framework}
                onChange={(e) => setForm({ ...form, framework: e.target.value as ProjectFormData["framework"] })}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {[["react","React.js"],["nextjs","Next.js"],["vue","Vue.js"],["nuxt","Nuxt.js"],["angular","Angular"],["svelte","Svelte"],["other","Other"]].map(([v,l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Environment</label>
              <select
                value={form.environment}
                onChange={(e) => setForm({ ...form, environment: e.target.value as ProjectFormData["environment"] })}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {[["production","Production"],["staging","Staging"],["development","Development"],["preview","Preview"]].map(([v,l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
          </div>

          {field("Organization", "organization", "text", "Acme Corp")}
          {field("Description", "description", "text", "Brief description…")}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {field("Version", "deployment_version", "text", "v1.2.3")}
            {field("Git Commit", "git_commit_id", "text", "abc1234")}
            {field("Build Time", "build_time", "text", "120s")}
          </div>

          <div className="flex flex-wrap gap-5 pt-1">
            {[
              ["Active", "active"],
              ["Scan Mobile", "scan_mobile"],
              ["Scan Desktop", "scan_desktop"],
            ].map(([label, key]) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!form[key as keyof ProjectFormData]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.checked })}
                  className="h-4 w-4 rounded border-input accent-primary"
                />
                <span className="text-sm">{label}</span>
              </label>
            ))}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="h-9 px-4 rounded-md border border-input text-sm font-medium hover:bg-accent transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {loading ? "Saving…" : isEdit ? "Save Changes" : "Create Project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
