"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import {
  Loader2,
  PlusCircle,
  FileText,
  ExternalLink,
  AlertCircle,
  Clock,
  Sparkles,
  Eye,
  RefreshCw,
  Flame,
  Globe,
  Lock,
} from "lucide-react";

interface NoteItem {
  id: string;
  title: string;
  createdAt: string;
  shareId?: string | null;
  shareType?: "one_time" | "time_based" | null;
  accessType?: "public" | "password" | null;
  expiresAt?: string | null;
  usedAt?: string | null;
  revokedAt?: string | null;
  viewCount?: number | null;
}

function getNoteCardBadge(note: NoteItem) {
  if (!note.shareType) return null;
  if (note.revokedAt) {
    return <Badge variant="destructive">Revoked</Badge>;
  }
  if (note.expiresAt && new Date(note.expiresAt) < new Date()) {
    return <Badge variant="destructive">Expired</Badge>;
  }
  if (note.shareType === "one_time" && ((note.viewCount ?? 0) > 0 || note.usedAt)) {
    return (
      <Badge variant="warning" className="flex items-center gap-1">
        <Flame className="h-3 w-3 text-amber-600" />
        Consumed (1/1)
      </Badge>
    );
  }
  if (note.shareType === "one_time") {
    return (
      <Badge variant="secondary" className="flex items-center gap-1">
        <RefreshCw className="h-3 w-3 text-amber-600" />
        One-Time (0/1)
      </Badge>
    );
  }
  return (
    <Badge variant="success" className="flex items-center gap-1">
      <Clock className="h-3 w-3 text-emerald-600" />
      Active
    </Badge>
  );
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [user, authLoading, router]);

  const fetchNotes = useCallback(async (isBackground = false) => {
    if (!user) return;

    if (!isBackground) {
      setLoading(true);
      setError("");
    }

    try {
      const res = await fetch("/api/notes", { cache: "no-store" });

      if (!res.ok) {
        if (!isBackground) setError("Failed to load notes. Please try again.");
        return;
      }

      const data = (await res.json()) as { notes: NoteItem[] };
      setNotes(data.notes);
    } catch {
      if (!isBackground) setError("Network error. Please check your connection.");
    } finally {
      if (!isBackground) setLoading(false);
    }
  }, [user]);

  // Initial fetch
  useEffect(() => {
    void fetchNotes(false);
  }, [fetchNotes]);

  // Background auto-refresh (every 3.5s)
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      void fetchNotes(true);
    }, 3500);
    return () => clearInterval(interval);
  }, [fetchNotes, user]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#eef2f7]">
        <Navbar />
        <div className="flex min-h-[calc(100vh-80px)] items-center justify-center px-4">
          <div className="flex flex-col items-center gap-4 rounded-[24px] bg-[#eef2f7] shadow-[10px_10px_24px_#d1d9e6,-10px_-10px_24px_#ffffff] border border-white/80 px-10 py-8">
            <div className="p-3.5 rounded-full bg-[#eef2f7] shadow-[inset_3px_3px_6px_#d1d9e6,inset_-3px_-3px_6px_#ffffff]">
              <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
            </div>
            <p className="text-sm font-bold text-[#1e293b]">
              Loading your workspace...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#eef2f7] text-[#2d3748]">
      <Navbar />

      <main className="mx-auto max-w-4xl px-4 sm:px-6 py-10 sm:py-14">
        {/* Page Heading Area */}
        <div className="mb-10 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2.5 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#e9edf3] shadow-[inset_2px_2px_4px_#d1d9e6,inset_-2px_-2px_4px_#ffffff] border border-[#d1d9e6]/40">
              <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)] animate-pulse" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748b]">
                Personal Workspace • Live
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-[#1e293b]">
              My Notes
            </h1>

            <p className="mt-1.5 text-sm font-medium text-[#64748b]">
              {user ? `Signed in as ${user.name} • ${notes.length} note${notes.length === 1 ? "" : "s"} total` : ""}
            </p>
          </div>

          <Button
            asChild
            size="lg"
            className="h-12 px-6 rounded-[16px] text-sm font-bold shadow-[4px_5px_14px_rgba(37,99,235,0.35),-3px_-3px_10px_#ffffff]"
          >
            <Link href="/notes/new" className="flex items-center gap-2">
              <PlusCircle className="h-5 w-5" />
              Create Note
            </Link>
          </Button>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-5 w-5" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Loading Spinner */}
        {loading ? (
          <div className="flex min-h-[300px] items-center justify-center rounded-[24px] bg-[#eef2f7] shadow-[inset_4px_4px_10px_#d1d9e6,inset_-4px_-4px_10px_#ffffff] border border-[#d1d9e6]/40">
            <div className="flex flex-col items-center gap-3">
              <div className="p-3 rounded-full bg-[#eef2f7] shadow-[3px_3px_8px_#d1d9e6,-3px_-3px_8px_#ffffff]">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              </div>
              <span className="text-sm font-semibold text-[#64748b]">
                Retrieving encrypted notes...
              </span>
            </div>
          </div>
        ) : notes.length === 0 ? (
          /* Empty state */
          <Card className="text-center p-8 sm:p-12 shadow-[10px_10px_24px_#d1d9e6,-10px_-10px_24px_#ffffff]">
            <CardContent className="flex flex-col items-center justify-center py-6">
              <div className="mb-6 p-5 rounded-[22px] bg-gradient-to-br from-[#f8fafc] to-[#e4e9f2] shadow-[5px_5px_12px_#d1d9e6,-5px_-5px_12px_#ffffff,inset_0_1px_1px_rgba(255,255,255,0.9)] border border-white/80">
                <FileText className="h-10 w-10 text-blue-500/70" />
              </div>

              <h2 className="text-2xl font-bold text-[#1e293b]">
                No Notes Created Yet
              </h2>

              <p className="mt-2.5 max-w-md text-sm leading-relaxed text-[#64748b]">
                Your workspace is empty. Create private notes and generate cryptographically secure expiring share links anytime.
              </p>

              <Button
                asChild
                size="lg"
                className="mt-8 h-12 px-7 rounded-[16px] text-sm font-bold shadow-[4px_5px_14px_rgba(37,99,235,0.35),-3px_-3px_10px_#ffffff]"
              >
                <Link href="/notes/new" className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Create Your First Note
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          /* Notes List */
          <div className="space-y-4">
            {notes.map((note) => (
              <Card
                key={note.id}
                className="hover:-translate-y-0.5 transition-all duration-200"
              >
                <CardHeader className="p-5 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex min-w-0 items-start gap-4">
                      {/* Note Icon Container */}
                      <div className="shrink-0 p-3 rounded-[16px] bg-gradient-to-br from-[#f8fafc] to-[#e4e9f2] shadow-[3px_3px_8px_#d1d9e6,-3px_-3px_8px_#ffffff,inset_0_1px_1px_rgba(255,255,255,0.9)] border border-white/80">
                        <FileText className="h-5 w-5 text-blue-600 drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <CardTitle className="truncate text-base sm:text-lg font-bold text-[#1e293b]">
                            {note.title}
                          </CardTitle>
                          {getNoteCardBadge(note)}
                        </div>

                        <div className="mt-1.5 flex items-center gap-3 text-xs font-semibold text-[#64748b] flex-wrap">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5 text-[#94a3b8]" />
                            {new Date(note.createdAt).toLocaleDateString(undefined, {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>

                          {note.viewCount !== undefined && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#e9edf3] shadow-inner text-[#1e293b]">
                              <Eye className="h-3 w-3 text-blue-600" />
                              {note.viewCount} {note.viewCount === 1 ? "view" : "views"}
                            </span>
                          )}

                          {note.accessType && (
                            <span className="inline-flex items-center gap-1 text-[#64748b]">
                              {note.accessType === "password" ? (
                                <><Lock className="h-3 w-3 text-blue-600" /> Password</>
                              ) : (
                                <><Globe className="h-3 w-3 text-emerald-600" /> Public</>
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="h-10 px-4 shrink-0 rounded-[12px] text-xs font-bold self-end sm:self-center"
                    >
                      <Link href={`/notes/${note.id}`} className="flex items-center gap-2">
                        <ExternalLink className="h-3.5 w-3.5 text-blue-600" />
                        <span>Manage &amp; Track</span>
                      </Link>
                    </Button>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}