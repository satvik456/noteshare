"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  Check,
  Loader2,
  Lock,
  Globe,
  Clock,
  RefreshCw,
  ExternalLink,
  Shield,
  Key,
  FileEdit,
  Sparkles,
} from "lucide-react";

interface ShareResult {
  note: { id: string; title: string; createdAt: string };
  share: {
    id: string;
    shareType: "one_time" | "time_based";
    accessType: "public" | "password";
    expiresAt: string;
    shareUrl: string;
    accessKey: string | null;
  };
}

export default function NewNotePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [form, setForm] = useState({
    title: "",
    content: "",
    expiresAt: "",
    shareType: "time_based" as "one_time" | "time_based",
    accessType: "public" as "public" | "password",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<ShareResult | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [user, authLoading, router]);

  // Set a reasonable default expiry (1 week from now)
  useEffect(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    setForm((prev) => ({ ...prev, expiresAt: local }));
  }, []);

  const updateField = <K extends keyof typeof form>(field: K, value: (typeof form)[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!form.title.trim()) newErrors.title = "Title is required";
    if (!form.content.trim()) newErrors.content = "Content is required";
    if (!form.expiresAt) {
      newErrors.expiresAt = "Expiry date is required";
    } else {
      const expDate = new Date(form.expiresAt);
      if (isNaN(expDate.getTime())) newErrors.expiresAt = "Invalid date/time";
      else if (expDate <= new Date()) newErrors.expiresAt = "Expiry must be in the future";
    }
    return newErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError("");
    setResult(null);

    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          expiresAt: new Date(form.expiresAt).toISOString(),
        }),
      });
      const data = await res.json() as ShareResult & { error?: string };
      if (!res.ok) {
        setServerError(data.error ?? "Failed to create note");
      } else {
        setResult(data);
        sessionStorage.setItem(`share_url_${data.note.id}`, data.share.shareUrl);
      }
    } catch {
      setServerError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = async (text: string, type: "url" | "key") => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === "url") {
        setCopiedUrl(true);
        setTimeout(() => setCopiedUrl(false), 2000);
      } else {
        setCopiedKey(true);
        setTimeout(() => setCopiedKey(false), 2000);
      }
    } catch {
      // Fallback
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#eef2f7]">
        <div className="p-4 rounded-[20px] bg-[#eef2f7] shadow-[6px_6px_14px_#d1d9e6,-6px_-6px_14px_#ffffff] border border-white/80">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  const getNormalizedShareUrl = (rawUrl: string) => {
    if (typeof window !== "undefined") {
      try {
        const urlObj = new URL(rawUrl);
        const cleanPath = urlObj.pathname.replace(/\/+/g, "/");
        if (window.location.hostname !== "localhost" && urlObj.hostname === "localhost") {
          return `${window.location.origin}${cleanPath}`;
        }
        return `${urlObj.origin}${cleanPath}`;
      } catch {
        return rawUrl.replace(/([^:]\/)\/+/g, "$1");
      }
    }
    return rawUrl;
  };

  const displayShareUrl = result ? getNormalizedShareUrl(result.share.shareUrl) : "";

  return (
    <div className="min-h-screen bg-[#eef2f7] text-[#2d3748]">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-12">
        {result ? (
          /* ── SUCCESS STATE ── */
          <div className="space-y-7">
            <Alert variant="success" className="shadow-[8px_8px_20px_#d1d9e6,-8px_-8px_20px_#ffffff]">
              <CheckCircle2 className="h-5 w-5" />
              <AlertTitle className="text-base font-bold">Note Created Successfully</AlertTitle>
              <AlertDescription>
                Your note <strong>&quot;{result.note.title}&quot;</strong> has been encrypted and is ready to share.
              </AlertDescription>
            </Alert>

            <Card className="shadow-[12px_12px_28px_#cbd5e1,-12px_-12px_28px_#ffffff] border border-white/90">
              <CardHeader className="border-b border-[#d1d9e6]/50 pb-5">
                <CardTitle className="text-xl font-bold text-[#1e293b]">Share Details</CardTitle>
                <div className="flex flex-wrap gap-2.5 mt-2">
                  <Badge variant={result.share.shareType === "one_time" ? "warning" : "secondary"}>
                    {result.share.shareType === "one_time" ? (
                      <><RefreshCw className="h-3 w-3 mr-1" />One-time view</>
                    ) : (
                      <><Clock className="h-3 w-3 mr-1" />Time-based view</>
                    )}
                  </Badge>
                  <Badge variant={result.share.accessType === "password" ? "default" : "success"}>
                    {result.share.accessType === "password" ? (
                      <><Lock className="h-3 w-3 mr-1" />Password protected</>
                    ) : (
                      <><Globe className="h-3 w-3 mr-1" />Public link</>
                    )}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                {/* Share URL Section - 100% Responsive */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold uppercase tracking-wider text-[#64748b] block">
                      Expiring Share URL
                    </Label>
                    <span className="text-[11px] font-bold text-blue-600 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full">
                      Ready to Share
                    </span>
                  </div>

                  {/* Full URL Box (Always visible & selectable) */}
                  <div className="p-3.5 rounded-[16px] bg-[#e9edf3] shadow-[inset_3px_3px_6px_#d1d9e6,inset_-3px_-3px_6px_#ffffff] border border-[#d1d9e6]/60 select-all">
                    <p className="font-mono text-xs sm:text-sm font-semibold text-[#1e293b] break-all leading-relaxed">
                      {displayShareUrl}
                    </p>
                  </div>

                  {/* Action Buttons Bar */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-1">
                    <Button
                      variant="outline"
                      size="default"
                      onClick={() => void copyToClipboard(displayShareUrl, "url")}
                      className="flex-1 h-11 px-5 rounded-[14px] text-xs font-bold shadow-sm flex items-center justify-center gap-2"
                    >
                      {copiedUrl ? (
                        <><Check className="h-4 w-4 text-emerald-600" /> Copied to Clipboard!</>
                      ) : (
                        <><Copy className="h-4 w-4" /> Copy Share URL</>
                      )}
                    </Button>
                    <a
                      href={displayShareUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="h-11 px-5 rounded-[14px] bg-[#eef2f7] shadow-[4px_4px_10px_#d1d9e6,-4px_-4px_10px_#ffffff] border border-white/80 hover:bg-white text-xs font-bold text-blue-600 flex items-center justify-center gap-2 transition-all active:translate-y-[1px]"
                      title="Open in new tab to test live viewing"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Open in New Tab
                    </a>
                  </div>
                  <p className="text-xs text-[#64748b] font-medium leading-relaxed">
                    💡 <strong>Test Tip:</strong> Click &quot;Open in New Tab&quot; to test. If this is a One-Time note, viewing it will automatically consume the link and increase the counter 0 → 1!
                  </p>
                </div>

                {/* Access Key Section (password-protected only) */}
                {result.share.accessKey && (
                  <div className="space-y-3 p-5 rounded-[20px] bg-[#eef2f7] shadow-[inset_3px_3px_6px_#d1d9e6,inset_-3px_-3px_6px_#ffffff] border border-[#d1d9e6]/60">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
                        <Key className="h-4 w-4 text-amber-600" />
                        Generated Access Key
                      </Label>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full">
                        Shown Once
                      </span>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                      <Input
                        readOnly
                        value={result.share.accessKey}
                        className="flex-1 font-mono text-base font-bold tracking-widest text-center bg-white shadow-sm border border-amber-200 h-11"
                      />
                      <Button
                        variant="outline"
                        size="default"
                        onClick={() => void copyToClipboard(result.share.accessKey!, "key")}
                        className="h-11 px-5 rounded-[14px] bg-white border border-amber-200 hover:bg-amber-50 text-xs font-bold shrink-0"
                      >
                        {copiedKey ? (
                          <><Check className="h-4 w-4 text-emerald-600" /> Copied!</>
                        ) : (
                          <><Copy className="h-4 w-4" /> Copy Key</>
                        )}
                      </Button>
                    </div>

                    <p className="text-xs text-amber-800 leading-relaxed font-medium">
                      ⚠️ <strong>Save this access key now.</strong> It cannot be retrieved later because only the cryptographic hash is stored in the database.
                    </p>
                  </div>
                )}

                {/* Expiration Info Plate */}
                <div className="p-4 rounded-[16px] bg-[#e9edf3] shadow-[inset_2px_2px_4px_#d1d9e6,inset_-2px_-2px_4px_#ffffff] border border-[#d1d9e6]/40 flex items-center gap-2.5 text-xs sm:text-sm font-semibold text-[#475569]">
                  <Clock className="h-4 w-4 text-blue-600" />
                  <span>Valid Until:</span>
                  <span className="text-[#1e293b] font-bold">
                    {new Date(result.share.expiresAt).toLocaleString()}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-3.5 pt-3">
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => {
                      setResult(null);
                      setForm({
                        title: "",
                        content: "",
                        expiresAt: (() => {
                          const d = new Date();
                          d.setDate(d.getDate() + 7);
                          return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
                            .toISOString()
                            .slice(0, 16);
                        })(),
                        shareType: "time_based",
                        accessType: "public",
                      });
                    }}
                    className="h-12 px-6 rounded-[14px]"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Create Another Note
                  </Button>
                  <Button asChild size="lg" className="h-12 px-6 rounded-[14px]">
                    <Link href={`/notes/${result.note.id}`} className="flex items-center gap-2">
                      <ExternalLink className="h-4 w-4" />
                      View Live Note Dashboard
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          /* ── CREATION FORM ── */
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 rounded-[16px] bg-gradient-to-br from-[#f8fafc] to-[#e4e9f2] shadow-[4px_4px_10px_#d1d9e6,-4px_-4px_10px_#ffffff,inset_0_1px_1px_rgba(255,255,255,0.9)] border border-white/80">
                <FileEdit className="h-6 w-6 text-blue-600 drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#1e293b]">
                  Create a Secure Note
                </h1>
                <p className="text-xs sm:text-sm text-[#64748b] font-medium">
                  Configure confidentiality settings and generate an expiring link
                </p>
              </div>
            </div>

            <Card className="shadow-[12px_12px_28px_#cbd5e1,-12px_-12px_28px_#ffffff] border border-white/90">
              <CardContent className="p-6 sm:p-8">
                <form onSubmit={(e) => void handleSubmit(e)} noValidate className="space-y-6">
                  {serverError && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{serverError}</AlertDescription>
                    </Alert>
                  )}

                  {/* Title */}
                  <div className="space-y-2">
                    <Label htmlFor="title" className="text-xs font-bold uppercase tracking-wider text-[#64748b]">
                      Note Title
                    </Label>
                    <Input
                      id="title"
                      placeholder="e.g. Production Database Credentials"
                      value={form.title}
                      onChange={(e) => updateField("title", e.target.value)}
                      className={errors.title ? "border-red-400 focus-visible:ring-red-400" : ""}
                    />
                    {errors.title && <p className="text-xs text-red-600 font-semibold">{errors.title}</p>}
                  </div>

                  {/* Content */}
                  <div className="space-y-2">
                    <Label htmlFor="content" className="text-xs font-bold uppercase tracking-wider text-[#64748b]">
                      Confidential Content
                    </Label>
                    <Textarea
                      id="content"
                      placeholder="Type or paste your sensitive note content here..."
                      value={form.content}
                      onChange={(e) => updateField("content", e.target.value)}
                      rows={8}
                      className={errors.content ? "border-red-400 focus-visible:ring-red-400" : ""}
                    />
                    {errors.content && <p className="text-xs text-red-600 font-semibold">{errors.content}</p>}
                  </div>

                  {/* Expiry */}
                  <div className="space-y-2.5">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <Label htmlFor="expiresAt" className="text-xs font-bold uppercase tracking-wider text-[#64748b]">
                        Expiration Date &amp; Time
                      </Label>
                      {/* Quick Presets */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {[
                          { label: "5 Mins", minutes: 5 },
                          { label: "1 Hour", minutes: 60 },
                          { label: "24 Hours", minutes: 1440 },
                          { label: "7 Days", minutes: 10080 },
                          { label: "30 Days", minutes: 43200 },
                        ].map((preset) => (
                          <button
                            key={preset.label}
                            type="button"
                            onClick={() => {
                              const d = new Date(Date.now() + preset.minutes * 60000);
                              const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
                                .toISOString()
                                .slice(0, 16);
                              updateField("expiresAt", local);
                            }}
                            className="px-2.5 py-1 rounded-[8px] bg-[#eef2f7] shadow-[2px_2px_5px_#d1d9e6,-2px_-2px_5px_#ffffff] text-[11px] font-bold text-[#475569] hover:text-blue-600 hover:shadow-[inset_1px_1px_2px_#d1d9e6] active:translate-y-[1px] transition-all"
                          >
                            +{preset.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <Input
                      id="expiresAt"
                      type="datetime-local"
                      value={form.expiresAt}
                      onChange={(e) => updateField("expiresAt", e.target.value)}
                      className={errors.expiresAt ? "border-red-400 focus-visible:ring-red-400" : ""}
                    />
                    {errors.expiresAt ? (
                      <p className="text-xs text-red-600 font-semibold">{errors.expiresAt}</p>
                    ) : (
                      <p className="text-xs text-[#718096] font-medium">
                        The share link will automatically expire and stop working after this timestamp.
                      </p>
                    )}
                  </div>

                  {/* Share Type Selection */}
                  <div className="space-y-2.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-[#64748b]">
                      Lifetime &amp; Consumption Mode
                    </Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      {(["time_based", "one_time"] as const).map((type) => {
                        const isSelected = form.shareType === type;
                        return (
                          <label
                            key={type}
                            className={`flex items-start gap-3.5 p-4 rounded-[18px] cursor-pointer transition-all duration-200 select-none ${
                              isSelected
                                ? "bg-[#e9edf3] shadow-[inset_3px_3px_6px_#d1d9e6,inset_-3px_-3px_6px_#ffffff] border border-blue-400/50"
                                : "bg-gradient-to-br from-[#f8fafc] to-[#e5eaf2] shadow-[4px_4px_10px_#d1d9e6,-4px_-4px_10px_#ffffff,inset_0_1px_1px_rgba(255,255,255,0.9)] border border-white/80 hover:-translate-y-[1px]"
                            }`}
                          >
                            <input
                              type="radio"
                              name="shareType"
                              value={type}
                              checked={isSelected}
                              onChange={() => updateField("shareType", type)}
                              className="mt-1 accent-blue-600"
                            />
                            <div className="min-w-0">
                              <div className="font-bold text-sm text-[#1e293b] flex items-center gap-1.5">
                                {type === "time_based" ? (
                                  <><Clock className="h-4 w-4 text-blue-600" />Time-Based Access</>
                                ) : (
                                  <><RefreshCw className="h-4 w-4 text-amber-600" />One-Time Self-Destruct</>
                                )}
                              </div>
                              <div className="text-xs text-[#64748b] mt-1 leading-relaxed">
                                {type === "time_based"
                                  ? "Remains valid for multiple views until expiration"
                                  : "Atomically destroys itself after first successful view"}
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Access Type Selection */}
                  <div className="space-y-2.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-[#64748b]">
                      Access Security Control
                    </Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      {(["public", "password"] as const).map((type) => {
                        const isSelected = form.accessType === type;
                        return (
                          <label
                            key={type}
                            className={`flex items-start gap-3.5 p-4 rounded-[18px] cursor-pointer transition-all duration-200 select-none ${
                              isSelected
                                ? "bg-[#e9edf3] shadow-[inset_3px_3px_6px_#d1d9e6,inset_-3px_-3px_6px_#ffffff] border border-blue-400/50"
                                : "bg-gradient-to-br from-[#f8fafc] to-[#e5eaf2] shadow-[4px_4px_10px_#d1d9e6,-4px_-4px_10px_#ffffff,inset_0_1px_1px_rgba(255,255,255,0.9)] border border-white/80 hover:-translate-y-[1px]"
                            }`}
                          >
                            <input
                              type="radio"
                              name="accessType"
                              value={type}
                              checked={isSelected}
                              onChange={() => updateField("accessType", type)}
                              className="mt-1 accent-blue-600"
                            />
                            <div className="min-w-0">
                              <div className="font-bold text-sm text-[#1e293b] flex items-center gap-1.5">
                                {type === "password" ? (
                                  <><Lock className="h-4 w-4 text-blue-600" />Password Protected</>
                                ) : (
                                  <><Globe className="h-4 w-4 text-emerald-600" />Public Link</>
                                )}
                              </div>
                              <div className="text-xs text-[#64748b] mt-1 leading-relaxed">
                                {type === "public"
                                  ? "Anyone holding the secret URL token can view"
                                  : "Requires an additional auto-generated secret access key"}
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Submit Button */}
                 {/* Submit Button */}
<Button
  type="submit"
  size="lg"
  className="
    w-full
    min-h-12
    sm:min-h-13
    h-auto
    px-3
    sm:px-5
    py-3
    sm:py-3.5
    text-xs
    sm:text-sm
    font-bold
    leading-tight
    text-center
    whitespace-normal
    break-words
    gap-2
    mt-4
    shadow-[4px_5px_16px_rgba(37,99,235,0.35),-3px_-3px_10px_#ffffff]
  "
  disabled={isSubmitting}
>
  {isSubmitting ? (
    <>
      <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 animate-spin" />
      <span>Generating Secure Share Link...</span>
    </>
  ) : (
    <>
      <span>Create Note &amp; Generate Share Link</span>
    </>
  )}
</Button>
                </form>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}