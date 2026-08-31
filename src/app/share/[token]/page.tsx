"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Lock,
  Loader2,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  ShieldOff,
  Eye,
  Unlock,
  Shield,
  ArrowRight,
  Sparkles,
  Flame,
  AlertTriangle,
} from "lucide-react";

// Possible states for this page
type PageState =
  | { status: "loading" }
  | { status: "error"; errorType: string; message: string }
  | { status: "public_ready"; shareType: string; expiresAt: string | null }
  | { status: "password_ready"; shareId: string; shareType: string; expiresAt: string | null }
  | {
      status: "unlocked";
      note: NoteContent;
      shareType: "one_time" | "time_based";
      expiresAt: string | null;
      viewCount: number;
    }
  | { status: "rate_limited"; message: string };

interface NoteContent {
  title: string;
  content: string;
  createdAt: string;
}

interface ShareMetaResponse {
  shareId?: string;
  shareType?: "one_time" | "time_based";
  accessType?: "public" | "password";
  expiresAt?: string | null;
  error?: string;
  message?: string;
}

interface AccessResponse {
  success?: boolean;
  note?: NoteContent;
  viewCount?: number;
  error?: string;
  message?: string;
}

function LiveShareCountdown({ expiresAt }: { expiresAt: string | null }) {
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

  if (!expiresAt) return null;

  if (timeLeft.expired) {
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 text-red-800 text-xs font-bold">
        <Clock className="h-3.5 w-3.5" />
        <span>Expired Just Now</span>
      </div>
    );
  }

  const pad = (n: number) => n.toString().padStart(2, "0");

  return (
    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#e9edf3] shadow-[inset_2px_2px_4px_#d1d9e6,inset_-2px_-2px_4px_#ffffff] border border-[#d1d9e6]/40 text-xs font-mono font-bold text-[#475569]">
      <Clock className="h-3.5 w-3.5 text-blue-600" />
      <span>Expires in:</span>
      <span className="text-[#1e293b]">
        {timeLeft.days > 0 && `${timeLeft.days}d `}
        {pad(timeLeft.hours)}:{pad(timeLeft.minutes)}:{pad(timeLeft.seconds)}
      </span>
    </div>
  );
}

function ErrorCard({ type, message }: { type: string; message: string }) {
  const configs: Record<string, { icon: React.ReactNode; title: string; desc: string }> = {
    invalid: {
      icon: <XCircle className="h-12 w-12 text-red-500" />,
      title: "Invalid Share Link",
      desc: "This share link does not exist or the token is incorrect.",
    },
    revoked: {
      icon: <ShieldOff className="h-12 w-12 text-red-600" />,
      title: "Share Link Revoked",
      desc: "The owner of this note has explicitly revoked access to this link.",
    },
    expired: {
      icon: <Clock className="h-12 w-12 text-amber-500" />,
      title: "Share Link Expired",
      desc: "This note has passed its designated expiration date/time and is no longer accessible.",
    },
    used: {
      icon: <Flame className="h-12 w-12 text-amber-600 animate-pulse" />,
      title: "One-Time Note Consumed",
      desc: "This link was configured to self-destruct after 1 view. It has already been accessed and permanently destroyed.",
    },
    server_error: {
      icon: <AlertCircle className="h-12 w-12 text-red-500" />,
      title: "Temporary Error",
      desc: message || "An unexpected server error occurred. Please try again.",
    },
    rate_limited: {
      icon: <Lock className="h-12 w-12 text-orange-500" />,
      title: "Too Many Attempts",
      desc: message || "Rate limit reached. Please wait before attempting to unlock again.",
    },
  };

  const config = configs[type] ?? configs.server_error;

  return (
    <Card className="max-w-md mx-auto shadow-[12px_12px_28px_#cbd5e1,-12px_-12px_28px_#ffffff] border border-white/90">
      <CardContent className="pt-10 pb-8 px-8 text-center">
        <div className="mx-auto mb-6 inline-flex items-center justify-center w-20 h-20 rounded-[24px] bg-gradient-to-br from-[#f8fafc] to-[#e4e9f2] shadow-[5px_5px_12px_#d1d9e6,-5px_-5px_12px_#ffffff,inset_0_1px_1px_rgba(255,255,255,0.9)] border border-white/80">
          {config.icon}
        </div>
        <h1 className="text-2xl font-black text-[#1e293b] mb-2.5">{config.title}</h1>
        <p className="text-[#64748b] text-sm leading-relaxed mb-8">{config.desc}</p>
        <Button
          asChild
          variant="outline"
          size="lg"
          className="h-12 px-6 rounded-[14px]"
        >
          <Link href="/">Return to Home</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export default function ShareTokenPage() {
  const params = useParams();
  const token = params.token as string;

  const [state, setState] = useState<PageState>({ status: "loading" });
  const [accessKey, setAccessKey] = useState("");
  const [keyError, setKeyError] = useState("");
  const [unlocking, setUnlocking] = useState(false);

  const shareTypeRef = useRef<"one_time" | "time_based">("time_based");
  const expiresAtRef = useRef<string | null>(null);
  const hasAccessedRef = useRef(false);

  // Step 1: Fetch share metadata
  useEffect(() => {
    if (!token) return;
    const fetchMeta = async () => {
      try {
        const res = await fetch(`/api/share/${token}`, { cache: "no-store" });
        const data = (await res.json()) as ShareMetaResponse;

        if (!res.ok) {
          setState({
            status: "error",
            errorType: data.error ?? "invalid",
            message: data.message ?? "Invalid share link.",
          });
          return;
        }

        const shareType = data.shareType ?? "time_based";
        shareTypeRef.current = shareType;
        expiresAtRef.current = data.expiresAt ?? null;

        if (data.accessType === "public") {
          setState({
            status: "public_ready",
            shareType,
            expiresAt: data.expiresAt ?? null,
          });
        } else {
          setState({
            status: "password_ready",
            shareId: data.shareId ?? "",
            shareType,
            expiresAt: data.expiresAt ?? null,
          });
        }
      } catch {
        setState({
          status: "error",
          errorType: "server_error",
          message: "Unable to load share link. Please try again.",
        });
      }
    };
    void fetchMeta();
  }, [token]);

  // Step 2a: Auto-access public links (idempotent single execution)
  useEffect(() => {
    if (state.status !== "public_ready" || hasAccessedRef.current) return;
    hasAccessedRef.current = true;

    const accessPublic = async () => {
      try {
        const res = await fetch(`/api/share/${token}/access`, {
          method: "POST",
          cache: "no-store",
        });
        const data = (await res.json()) as AccessResponse;

        if (!res.ok) {
          setState({
            status: "error",
            errorType: data.error ?? "invalid",
            message: data.message ?? "Unable to access this share link.",
          });
          return;
        }

        setState({
          status: "unlocked",
          note: data.note!,
          shareType: shareTypeRef.current,
          expiresAt: expiresAtRef.current,
          viewCount: data.viewCount ?? 1,
        });
      } catch {
        setState({
          status: "error",
          errorType: "server_error",
          message: "Network error. Please try again.",
        });
      }
    };
    void accessPublic();
  }, [state.status, token]);

  // Step 2b: Password unlock
  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setKeyError("");

    const key = accessKey.trim();
    if (!key) {
      setKeyError("Access key is required");
      return;
    }

    setUnlocking(true);
    try {
      const res = await fetch(`/api/share/${token}/unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessKey: key }),
      });
      const data = (await res.json()) as AccessResponse;

      if (res.status === 429) {
        setState({
          status: "error",
          errorType: "rate_limited",
          message: data.message ?? "Too many failed attempts. Please try again later.",
        });
        return;
      }

      if (res.status === 410) {
        setState({
          status: "error",
          errorType: data.error ?? "invalid",
          message: data.message ?? "This share link is no longer available.",
        });
        return;
      }

      if (!res.ok) {
        setKeyError(data.message ?? "Invalid access key. Please try again.");
        return;
      }

      setState({
        status: "unlocked",
        note: data.note!,
        shareType: shareTypeRef.current,
        expiresAt: expiresAtRef.current,
        viewCount: data.viewCount ?? 1,
      });
    } catch {
      setKeyError("Network error. Please try again.");
    } finally {
      setUnlocking(false);
    }
  };

  // ── Render ──
  if (state.status === "loading" || state.status === "public_ready") {
    return (
      <div className="min-h-screen bg-[#eef2f7] flex items-center justify-center px-4">
        <div className="text-center p-8 rounded-[24px] bg-[#eef2f7] shadow-[10px_10px_24px_#d1d9e6,-10px_-10px_24px_#ffffff] border border-white/80">
          <div className="mb-4 inline-flex items-center justify-center p-4 rounded-full bg-[#eef2f7] shadow-[inset_3px_3px_6px_#d1d9e6,inset_-3px_-3px_6px_#ffffff]">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
          <p className="text-[#1e293b] text-sm font-bold">Decrypting &amp; Validating Note...</p>
        </div>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="min-h-screen bg-[#eef2f7] flex items-center justify-center px-4 py-12">
        <ErrorCard type={state.errorType} message={state.message} />
      </div>
    );
  }

  if (state.status === "password_ready") {
    return (
      <div className="min-h-screen bg-[#eef2f7] flex items-center justify-center px-4 py-12 text-[#2d3748]">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-[#f8fafc] to-[#e4e9f2] rounded-[24px] shadow-[5px_5px_12px_#d1d9e6,-5px_-5px_12px_#ffffff,inset_0_1px_1px_rgba(255,255,255,0.9)] border border-white/80 mb-5">
              <Lock className="h-9 w-9 text-blue-600 drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]" />
            </div>
            <h1 className="text-3xl font-black text-[#1e293b] mb-2 tracking-tight">Protected Note</h1>
            <p className="text-[#64748b] text-sm leading-relaxed max-w-sm mx-auto">
              This note is password protected. Enter the access key to decrypt and view its contents.
            </p>
            {state.shareType === "one_time" ? (
              <div className="mt-4 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-100/80 border border-amber-300 text-xs font-bold text-amber-900">
                <Flame className="h-3.5 w-3.5 text-amber-600" />
                <span>One-Time View: Destroys after unlock</span>
              </div>
            ) : state.expiresAt ? (
              <div className="mt-4">
                <LiveShareCountdown expiresAt={state.expiresAt} />
              </div>
            ) : null}
          </div>

          {/* Unlock Form Card */}
          <Card className="shadow-[12px_12px_28px_#cbd5e1,-12px_-12px_28px_#ffffff] border border-white/90">
            <CardHeader className="border-b border-[#d1d9e6]/50 pb-5 text-center">
              <CardTitle className="text-lg font-bold text-[#1e293b] flex items-center justify-center gap-2">
                <Shield className="h-5 w-5 text-blue-600" />
                Enter Access Key
              </CardTitle>
              <CardDescription className="text-xs text-[#718096]">
                Provide the access key given by the note creator
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={(e) => void handleUnlock(e)} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="accessKey" className="text-xs font-bold uppercase tracking-wider text-[#64748b] block text-center">
                    Access Key
                  </Label>
                  <Input
                    id="accessKey"
                    type="text"
                    placeholder="e.g. ABCD-EFGH-IJKL"
                    value={accessKey}
                    onChange={(e) => {
                      setAccessKey(e.target.value);
                      setKeyError("");
                    }}
                    className={`font-mono text-base font-bold tracking-widest text-center h-12 ${
                      keyError ? "border-red-400 focus-visible:ring-red-400" : ""
                    }`}
                    autoComplete="off"
                    spellCheck={false}
                  />
                  {keyError && (
                    <div className="flex items-center justify-center gap-2 text-xs text-red-600 font-bold mt-2 p-2.5 rounded-[12px] bg-red-50 border border-red-200 shadow-[inset_1px_1px_3px_#fca5a5]">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{keyError}</span>
                    </div>
                  )}
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="w-full h-13 text-sm font-bold shadow-[4px_5px_14px_rgba(37,99,235,0.35),-3px_-3px_10px_#ffffff]"
                  disabled={unlocking}
                >
                  {unlocking ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Verifying &amp; Decrypting...
                    </>
                  ) : (
                    <>
                      <Unlock className="h-4 w-4 mr-1" />
                      Unlock Note
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Footer */}
          <p className="text-center text-xs text-[#94a3b8] mt-8 font-medium">
            Protected with 256-bit entropy by{" "}
            <Link href="/" className="font-bold text-[#64748b] hover:text-blue-600 transition-colors">
              NoteShare
            </Link>
          </p>
        </div>
      </div>
    );
  }

  if (state.status === "unlocked") {
    const isOneTime = state.shareType === "one_time";

    return (
      <div className="min-h-screen bg-[#eef2f7] py-10 sm:py-14 px-4 sm:px-6 text-[#2d3748]">
        <div className="max-w-3xl mx-auto space-y-7">
          {/* Top Bar */}
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="flex items-center gap-2.5 text-[#1e293b] text-sm font-bold group select-none"
            >
              <div className="p-2 rounded-[12px] bg-gradient-to-br from-[#f8fafc] to-[#e4e9f2] shadow-[3px_3px_8px_#d1d9e6,-3px_-3px_8px_#ffffff] border border-white/80">
                <FileText className="h-4 w-4 text-blue-600" />
              </div>
              <span>NoteShare</span>
            </Link>
            
            <div className="flex items-center gap-2 text-xs font-bold text-[#475569] px-3.5 py-1.5 rounded-full bg-[#e9edf3] shadow-[inset_2px_2px_4px_#d1d9e6,inset_-2px_-2px_4px_#ffffff] border border-[#d1d9e6]/40">
              <Eye className="h-3.5 w-3.5 text-blue-600" />
              <span>
                {isOneTime
                  ? "1 / 1 View (Consumed)"
                  : `${state.viewCount} verified view${state.viewCount === 1 ? "" : "s"}`}
              </span>
            </div>
          </div>

          {/* Banner */}
          {isOneTime ? (
            <Alert className="border-amber-300 bg-amber-50/90 text-amber-950 shadow-[8px_8px_20px_#d1d9e6,-8px_-8px_20px_#ffffff]">
              <Flame className="h-5 w-5 text-amber-600 animate-pulse" />
              <AlertTitle className="text-base font-bold text-amber-900">
                ⚡ One-Time Self-Destruct Note Consumed
              </AlertTitle>
              <AlertDescription className="text-amber-800 text-xs sm:text-sm font-medium leading-relaxed">
                This note has been decrypted and viewed. The share link has now permanently expired in the database (View count updated: 1). If you reload or close this page, it cannot be opened again.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert variant="success" className="shadow-[8px_8px_20px_#d1d9e6,-8px_-8px_20px_#ffffff]">
              <CheckCircle2 className="h-5 w-5" />
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full gap-2">
                <div>
                  <AlertTitle className="text-base font-bold">
                    Decryption Complete
                  </AlertTitle>
                  <AlertDescription>
                    This note was verified and securely accessed.
                  </AlertDescription>
                </div>
                {state.expiresAt && (
                  <LiveShareCountdown expiresAt={state.expiresAt} />
                )}
              </div>
            </Alert>
          )}

          {/* Note Content Display Card */}
          <Card className="shadow-[12px_12px_28px_#cbd5e1,-12px_-12px_28px_#ffffff] border border-white/90">
            <CardHeader className="border-b border-[#d1d9e6]/50 pb-5">
              <CardTitle className="text-2xl sm:text-3xl font-black text-[#1e293b]">{state.note.title}</CardTitle>
              <CardDescription className="text-xs font-semibold text-[#64748b] mt-1">
                Authored on {new Date(state.note.createdAt).toLocaleString()}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="bg-[#e6ebf2] rounded-[18px] p-6 sm:p-7 whitespace-pre-wrap text-sm text-[#1e293b] min-h-[160px] shadow-[inset_4px_4px_10px_#cbd5e1,inset_-4px_-4px_10px_#ffffff] border border-[#cbd5e1]/50 leading-relaxed font-mono">
                {state.note.content}
              </div>
            </CardContent>
          </Card>

          {/* Security Tag */}
          <div className="text-center pt-2">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#eef2f7] shadow-[4px_4px_10px_#d1d9e6,-4px_-4px_10px_#ffffff] border border-white/80 text-xs font-bold text-[#64748b]">
              <Shield className="h-3.5 w-3.5 text-blue-600" />
              <span>
                {isOneTime
                  ? "Single-use cryptographic token • Now invalidated"
                  : "Shared via hardware-grade expiring cryptographic token"}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}