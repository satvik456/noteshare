"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import Navbar from "@/components/Navbar";
import {
  Loader2,
  Copy,
  Check,
  Lock,
  Globe,
  Clock,
  Eye,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ShieldOff,
  AlertCircle,
  ArrowLeft,
  FileText,
  Shield,
  Key,
  Flame,
  Radio,
  ExternalLink,
} from "lucide-react";

interface NoteData {
  note: {
    id: string;
    title: string;
    content: string;
    createdAt: string;
    updatedAt: string;
  };
  share: {
    id: string;
    shareType: "one_time" | "time_based";
    accessType: "public" | "password";
    expiresAt: string | null;
    usedAt: string | null;
    revokedAt: string | null;
    viewCount: number;
  } | null;
}

function getShareStatus(share: NoteData["share"]) {
  if (!share) return { label: "No share", color: "secondary" as const };
  if (share.revokedAt) return { label: "Revoked", color: "destructive" as const };
  if (share.expiresAt && new Date(share.expiresAt) < new Date())
    return { label: "Expired", color: "destructive" as const };
  if (share.shareType === "one_time" && (share.usedAt || share.viewCount > 0))
    return { label: "Consumed (1/1)", color: "warning" as const };
  return { label: "Active (Ready)", color: "success" as const };
}

// Live Countdown Timer Component
function CountdownTimer({ expiresAt, isExpired }: { expiresAt: string | null; isExpired: boolean }) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    expired: boolean;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: false });

  useEffect(() => {
    if (!expiresAt) return;

    const calculate = () => {
      const diff = new Date(expiresAt).getTime() - new Date().getTime();
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: true });
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / 1000 / 60) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      setTimeLeft({ days, hours, minutes, seconds, expired: false });
    };

    calculate();
    const interval = setInterval(calculate, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  if (!expiresAt) return <span className="font-semibold text-slate-500">No expiration set</span>;

  if (isExpired || timeLeft.expired) {
    return (
      <span className="font-bold text-red-600 flex items-center gap-1.5">
        <XCircle className="h-4 w-4 text-red-500" />
        Expired (Link is no longer accessible)
      </span>
    );
  }

  const pad = (n: number) => n.toString().padStart(2, "0");

  return (
    <div className="flex items-center gap-1.5 font-mono font-bold text-[#1e293b] text-sm">
      {timeLeft.days > 0 && (
        <span className="px-2 py-0.5 rounded-md bg-[#e2e8f0] shadow-inner">{timeLeft.days}d</span>
      )}
      <span className="px-2 py-0.5 rounded-md bg-[#e2e8f0] shadow-inner">{pad(timeLeft.hours)}h</span>
      <span>:</span>
      <span className="px-2 py-0.5 rounded-md bg-[#e2e8f0] shadow-inner">{pad(timeLeft.minutes)}m</span>
      <span>:</span>
      <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 shadow-inner">{pad(timeLeft.seconds)}s</span>
    </div>
  );
}

export default function NoteDetailPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const noteId = params.id as string;

  const [data, setData] = useState<NoteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [revokeError, setRevokeError] = useState("");
  const [revokeSuccess, setRevokeSuccess] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [viewCountJustIncreased, setViewCountJustIncreased] = useState(false);

  const prevViewCountRef = useRef<number | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [user, authLoading, router]);

  const fetchNote = useCallback(async (isBackgroundSync = false) => {
    if (!user) return;
    if (!isBackgroundSync) {
      setLoading(true);
      setError("");
    }
    try {
      const res = await fetch(`/api/notes/${noteId}`, { cache: "no-store" });
      if (res.status === 404) {
        setError("Note not found");
        return;
      }
      if (res.status === 401 || res.status === 403) {
        setError("You don't have permission to view this note");
        return;
      }
      if (!res.ok) {
        if (!isBackgroundSync) setError("Failed to load note");
        return;
      }
      const json = (await res.json()) as NoteData;

      // Detect real-time view count increment
      if (
        prevViewCountRef.current !== null &&
        json.share &&
        json.share.viewCount > prevViewCountRef.current
      ) {
        setViewCountJustIncreased(true);
        setTimeout(() => setViewCountJustIncreased(false), 3500);
      }

      if (json.share) {
        prevViewCountRef.current = json.share.viewCount;
      }

      setData(json);
    } catch {
      if (!isBackgroundSync) setError("Network error");
    } finally {
      if (!isBackgroundSync) setLoading(false);
    }
  }, [user, noteId]);

  // Initial load
  useEffect(() => {
    void fetchNote(false);
  }, [fetchNote]);

  // Real-time live polling (every 2.5 seconds)
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      void fetchNote(true);
    }, 2500);
    return () => clearInterval(interval);
  }, [fetchNote, user]);

  useEffect(() => {
    const stored = sessionStorage.getItem(`share_url_${noteId}`);
    if (stored) setShareUrl(stored);
  }, [noteId]);

  const copyShareUrl = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleRevoke = async () => {
    if (!confirmRevoke) {
      setConfirmRevoke(true);
      return;
    }
    setRevoking(true);
    setRevokeError("");
    try {
      const res = await fetch(`/api/share/by-note/${noteId}/revoke`, {
        method: "POST",
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setRevokeError(json.error ?? "Failed to revoke share link");
      } else {
        setRevokeSuccess(true);
        setConfirmRevoke(false);
        await fetchNote(false);
      }
    } catch {
      setRevokeError("Network error");
    } finally {
      setRevoking(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#eef2f7]">
        <Navbar />
        <div className="flex min-h-[calc(100vh-80px)] items-center justify-center px-4">
          <div className="flex flex-col items-center gap-4 rounded-[24px] bg-[#eef2f7] shadow-[10px_10px_24px_#d1d9e6,-10px_-10px_24px_#ffffff] border border-white/80 px-10 py-8">
            <div className="p-3.5 rounded-full bg-[#eef2f7] shadow-[inset_3px_3px_6px_#d1d9e6,inset_-3px_-3px_6px_#ffffff]">
              <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
            </div>
            <p className="text-sm font-bold text-[#1e293b]">Loading note details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#eef2f7] text-[#2d3748]">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
          <Alert variant="destructive" className="shadow-[8px_8px_20px_#d1d9e6,-8px_-8px_20px_#ffffff]">
            <XCircle className="h-5 w-5" />
            <AlertTitle className="font-bold">Error Occurred</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button
            asChild
            variant="outline"
            className="mt-6 h-11 px-5 rounded-[14px]"
          >
            <Link href="/dashboard" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to My Notes
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { note, share } = data;
  const shareStatus = getShareStatus(share);
  const isActive = shareStatus.label.startsWith("Active");
  const isOneTime = share?.shareType === "one_time";
  const isConsumed = isOneTime && ((share?.viewCount ?? 0) >= 1 || !!share?.usedAt);

  return (
    <div className="min-h-screen bg-[#eef2f7] text-[#2d3748]">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-12 space-y-7">
        {/* Real-time View Notification Banner */}
        {viewCountJustIncreased && (
          <div className="animate-bounce p-4 rounded-[20px] bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-[0_8px_20px_rgba(16,185,129,0.4)] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Eye className="h-6 w-6 animate-pulse" />
              <div>
                <p className="font-black text-sm">Real-Time Update: Note Just Viewed!</p>
                <p className="text-xs text-emerald-100 font-medium">
                  {isOneTime
                    ? "The recipient viewed this one-time note. Link has now automatically expired and self-destructed."
                    : "The view count has updated in real-time."}
                </p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full bg-white/20 text-xs font-bold uppercase tracking-wider">
              Live
            </span>
          </div>
        )}

        {/* Top Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-[16px] bg-gradient-to-br from-[#f8fafc] to-[#e4e9f2] shadow-[4px_4px_10px_#d1d9e6,-4px_-4px_10px_#ffffff,inset_0_1px_1px_rgba(255,255,255,0.9)] border border-white/80">
              <FileText className="h-6 w-6 text-blue-600 drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#1e293b]">Note Details</h1>
                {/* Live Sync Tag */}
                <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                  Live Sync
                </div>
              </div>
              <p className="text-xs sm:text-sm text-[#64748b] font-medium">
                Live monitoring of link views and cryptographic access
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void fetchNote(false)}
              className="h-10 px-3 rounded-[12px] text-xs font-bold text-[#64748b]"
              title="Refresh status"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-10 px-4 rounded-[12px] text-xs font-bold shrink-0"
            >
              <Link href="/dashboard" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">All Notes</span>
              </Link>
            </Button>
          </div>
        </div>

        {/* Note Content Card */}
        <Card className="shadow-[12px_12px_28px_#cbd5e1,-12px_-12px_28px_#ffffff] border border-white/90">
          <CardHeader className="border-b border-[#d1d9e6]/50 pb-5">
            <CardTitle className="text-xl sm:text-2xl font-bold text-[#1e293b]">{note.title}</CardTitle>
            <CardDescription className="text-xs font-semibold text-[#64748b]">
              Created on {new Date(note.createdAt).toLocaleString()}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="bg-[#e6ebf2] rounded-[18px] p-5 sm:p-6 whitespace-pre-wrap text-sm text-[#1e293b] min-h-[140px] shadow-[inset_4px_4px_10px_#cbd5e1,inset_-4px_-4px_10px_#ffffff] border border-[#cbd5e1]/50 leading-relaxed font-mono">
              {note.content}
            </div>
          </CardContent>
        </Card>

        {/* Share Status Card */}
        {share && (
          <Card className="shadow-[12px_12px_28px_#cbd5e1,-12px_-12px_28px_#ffffff] border border-white/90">
            <CardHeader className="border-b border-[#d1d9e6]/50 pb-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-lg sm:text-xl font-bold text-[#1e293b] flex items-center gap-2">
                    Share Link Status
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                  </CardTitle>
                  <CardDescription className="text-xs text-[#64748b] mt-1">
                    Live real-time monitoring • Updates automatically when viewed
                  </CardDescription>
                </div>
                <Badge
                  variant={shareStatus.color}
                  className={`px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
                    viewCountJustIncreased ? "scale-110 shadow-lg" : ""
                  }`}
                >
                  {shareStatus.label}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              {/* One-Time Consumption / Expiration Banner */}
              {isOneTime && (
                <div
                  className={`p-4 rounded-[18px] transition-all duration-300 ${
                    isConsumed
                      ? "bg-amber-50 border border-amber-300 shadow-[inset_2px_2px_5px_#fde68a,inset_-2px_-2px_5px_#ffffff]"
                      : "bg-blue-50/70 border border-blue-200 shadow-[inset_2px_2px_5px_#bfdbfe,inset_-2px_-2px_5px_#ffffff]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {isConsumed ? (
                      <Flame className="h-5 w-5 text-amber-600 shrink-0 animate-pulse" />
                    ) : (
                      <Radio className="h-5 w-5 text-blue-600 shrink-0 animate-pulse" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-[#1e293b] flex items-center gap-2">
                        {isConsumed ? "One-Time Link Consumed & Destroyed" : "Waiting For Recipient View"}
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                            isConsumed ? "bg-amber-200 text-amber-900" : "bg-blue-200 text-blue-900"
                          }`}
                        >
                          {share.viewCount} / 1 View
                        </span>
                      </p>
                      <p className="text-xs text-[#64748b] mt-0.5 leading-relaxed">
                        {isConsumed
                          ? "The recipient has opened and viewed this note. The share link is permanently invalidated."
                          : "As soon as the link is opened, this counter will automatically jump from 0 to 1 and expire the link."}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Metadata Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                {/* Real-time View Count Widget */}
                <div
                  className={`rounded-[18px] p-4 transition-all duration-500 ${
                    viewCountJustIncreased
                      ? "bg-emerald-100 border-2 border-emerald-500 scale-[1.02] shadow-[0_0_20px_rgba(16,185,129,0.35)]"
                      : "bg-[#e9edf3] shadow-[inset_2px_2px_5px_#d1d9e6,inset_-2px_-2px_5px_#ffffff] border border-[#d1d9e6]/40"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#64748b]">
                      Real-Time Views
                    </p>
                    <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-[#1e293b]">
                      {share.viewCount}
                    </span>
                    <span className="text-xs font-semibold text-[#64748b]">
                      {isOneTime ? "/ 1 allowed view" : "total views recorded"}
                    </span>
                  </div>
                </div>

                {/* Live Expiration / Countdown Widget */}
                <div className="rounded-[18px] bg-[#e9edf3] p-4 shadow-[inset_2px_2px_5px_#d1d9e6,inset_-2px_-2px_5px_#ffffff] border border-[#d1d9e6]/40">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#64748b] mb-1.5">
                    Live Expiry Countdown
                  </p>
                  <CountdownTimer
                    expiresAt={share.expiresAt}
                    isExpired={!isActive && shareStatus.label === "Expired"}
                  />
                </div>

                <div className="rounded-[18px] bg-[#e9edf3] p-4 shadow-[inset_2px_2px_5px_#d1d9e6,inset_-2px_-2px_5px_#ffffff] border border-[#d1d9e6]/40">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#64748b] mb-1.5">
                    Share Lifetime Type
                  </p>
                  <p className="font-bold text-[#1e293b] text-sm flex items-center gap-1.5">
                    {share.shareType === "one_time" ? (
                      <>
                        <RefreshCw className="h-4 w-4 text-amber-600" />
                        One-Time (Self-Destruct)
                      </>
                    ) : (
                      <>
                        <Clock className="h-4 w-4 text-blue-600" />
                        Time-Based Access
                      </>
                    )}
                  </p>
                </div>

                <div className="rounded-[18px] bg-[#e9edf3] p-4 shadow-[inset_2px_2px_5px_#d1d9e6,inset_-2px_-2px_5px_#ffffff] border border-[#d1d9e6]/40">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#64748b] mb-1.5">
                    Access Protection
                  </p>
                  <p className="font-bold text-[#1e293b] text-sm flex items-center gap-1.5">
                    {share.accessType === "password" ? (
                      <>
                        <Lock className="h-4 w-4 text-blue-600" />
                        Password Protected
                      </>
                    ) : (
                      <>
                        <Globe className="h-4 w-4 text-emerald-600" />
                        Public Link
                      </>
                    )}
                  </p>
                </div>

                {share.usedAt && (
                  <div className="sm:col-span-2 rounded-[18px] bg-amber-50/80 p-4 shadow-[inset_2px_2px_5px_#fde68a,inset_-2px_-2px_5px_#ffffff] border border-amber-200">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-amber-800 mb-1">
                      First Consumed At
                    </p>
                    <p className="font-bold text-amber-950 text-xs sm:text-sm">
                      {new Date(share.usedAt).toLocaleString()}
                    </p>
                  </div>
                )}

                {share.revokedAt && (
                  <div className="sm:col-span-2 rounded-[18px] bg-red-50 p-4 shadow-[inset_2px_2px_5px_#fca5a5,inset_-2px_-2px_5px_#ffffff] border border-red-200">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-red-700 mb-1">
                      Revoked At
                    </p>
                    <p className="font-bold text-red-900 text-xs sm:text-sm">
                      {new Date(share.revokedAt).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>

              {/* Share URL Plate */}
              {shareUrl ? (
                <div className="space-y-3 pt-2">
                  <Separator />
                  <div className="pt-2">
                    <div className="flex items-center justify-between mb-2.5">
                      <p className="text-xs font-bold uppercase tracking-wider text-[#64748b]">
                        Share Link URL
                      </p>
                      {isActive && (
                        <a
                          href={shareUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 hover:underline"
                        >
                          Test in New Tab <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <Input
                        readOnly
                        value={shareUrl}
                        className="font-mono text-xs text-[#1e293b]"
                      />
                      <Button
                        variant="outline"
                        size="default"
                        onClick={() => void copyShareUrl()}
                        className="shrink-0 h-11 px-5"
                      >
                        {copied ? (
                          <>
                            <Check className="h-4 w-4 text-emerald-600" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4" />
                            Copy Link
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="pt-2">
                  <Alert className="border-amber-200 bg-amber-50/70 text-amber-900 shadow-[2px_2px_8px_#d1d9e6,-2px_-2px_8px_#ffffff]">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <AlertDescription className="text-xs leading-relaxed font-medium">
                      The raw share URL was displayed once at creation time. For your security, raw tokens are never stored in plaintext in the database.
                    </AlertDescription>
                  </Alert>
                </div>
              )}

              {/* Revoke Actions */}
              {isActive && (
                <div className="space-y-4 pt-2">
                  <Separator />
                  <div className="pt-2">
                    {revokeSuccess && (
                      <Alert variant="success" className="mb-4">
                        <CheckCircle2 className="h-4 w-4" />
                        <AlertDescription>Share link revoked successfully.</AlertDescription>
                      </Alert>
                    )}
                    {revokeError && (
                      <Alert variant="destructive" className="mb-4">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{revokeError}</AlertDescription>
                      </Alert>
                    )}

                    {confirmRevoke ? (
                      <div className="rounded-[18px] bg-red-50 p-5 border border-red-200 shadow-[inset_2px_2px_5px_#fca5a5,inset_-2px_-2px_5px_#ffffff] space-y-3">
                        <p className="text-xs sm:text-sm text-red-900 font-bold flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-red-600" />
                          Are you sure? This will immediately invalidate the share link for all recipients.
                        </p>
                        <div className="flex gap-2.5">
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => void handleRevoke()}
                            disabled={revoking}
                            className="h-10 px-4 rounded-[12px] text-xs font-bold"
                          >
                            {revoking ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Revoking...
                              </>
                            ) : (
                              "Yes, Revoke Link"
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setConfirmRevoke(false)}
                            disabled={revoking}
                            className="h-10 px-4 rounded-[12px] text-xs font-bold bg-white"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        variant="destructive"
                        size="default"
                        onClick={() => void handleRevoke()}
                        className="h-11 px-5 rounded-[14px] text-xs font-bold"
                      >
                        <ShieldOff className="h-4 w-4 mr-1" />
                        Revoke Share Link
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}