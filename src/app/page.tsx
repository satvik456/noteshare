"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Navbar from "@/components/Navbar";
import {
  Lock,
  Clock,
  Eye,
  Shield,
  Share2,
  CheckCircle,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
} from "lucide-react";

export default function HomePage() {
  const { user, loading } = useAuth();

  return (
    <div className="min-h-screen bg-[#eef2f7] text-[#2d3748]">
      <Navbar />

      <main>
        {/* Hero Section */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 pt-20 pb-24 text-center">
          {/* Security Badge Pill */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#eef2f7] shadow-[4px_4px_10px_#d1d9e6,-4px_-4px_10px_#ffffff] border border-white/90 text-blue-600 text-xs font-bold uppercase tracking-wider mb-8">
            <ShieldCheck className="h-4 w-4 text-blue-600 drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]" />
            <span>Cryptographically Verified</span>
          </div>
          
          <h1 className="text-4xl sm:text-6xl font-black text-[#1e293b] mb-6 tracking-tight leading-[1.15]">
            Share Private Notes With
            <br />
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 bg-clip-text text-transparent">
              Expiring Self-Destruct Links
            </span>
          </h1>
          
          <p className="text-base sm:text-xl text-[#64748b] mb-12 max-w-2xl mx-auto leading-relaxed font-normal">
            Create sensitive notes and share them via cryptographically secure links.
            Enforce one-time self-destruct access or timed expiration with optional password unlock.
          </p>
          
          <div className="flex items-center justify-center gap-4 flex-wrap">
            {loading ? (
              <div className="h-12 w-48 rounded-[16px] bg-[#e9edf3] shadow-[inset_3px_3px_6px_#d1d9e6,inset_-3px_-3px_6px_#ffffff] animate-pulse" />
            ) : user ? (
              <>
                <Button
                  asChild
                  size="lg"
                  className="h-13 px-8 text-base shadow-[5px_6px_16px_rgba(37,99,235,0.35),-4px_-4px_12px_#ffffff]"
                >
                  <Link href="/notes/new" className="flex items-center gap-2.5">
                    <Sparkles className="h-5 w-5" />
                    Create a Note
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="h-13 px-8 text-base"
                >
                  <Link href="/dashboard" className="flex items-center gap-2">
                    My Workspace
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </>
            ) : (
              <>
                <Button
                  asChild
                  size="lg"
                  className="h-13 px-8 text-base shadow-[5px_6px_16px_rgba(37,99,235,0.35),-4px_-4px_12px_#ffffff]"
                >
                  <Link href="/register" className="flex items-center gap-2.5">
                    Get Started Free
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="h-13 px-8 text-base"
                >
                  <Link href="/login">Sign In</Link>
                </Button>
              </>
            )}
          </div>
        </section>

        {/* Feature Section */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-24">
          <div className="text-center mb-14">
            <h2 className="text-2xl sm:text-3xl font-bold text-[#1e293b] mb-3">
              Engineered For Complete Confidentiality
            </h2>
            <p className="text-[#64748b] text-sm sm:text-base max-w-xl mx-auto">
              Hardware-grade cryptographic patterns and race-condition immunity built into every link
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7">
            {[
              {
                icon: <Lock className="h-6 w-6 text-blue-600" />,
                title: "Password Protection",
                desc: "Generate random high-entropy access keys. Hashed with bcrypt before storage; only shown once.",
              },
              {
                icon: <Clock className="h-6 w-6 text-indigo-600" />,
                title: "Time-Based Expiration",
                desc: "Set exact expiration timestamps validated strictly server-side against primary database time.",
              },
              {
                icon: <Eye className="h-6 w-6 text-purple-600" />,
                title: "Atomic One-Time View",
                desc: "Single conditional UPDATE ... RETURNING query ensures race-condition-safe self-destruction.",
              },
              {
                icon: <Shield className="h-6 w-6 text-emerald-600" />,
                title: "Brute-Force Shield",
                desc: "Automatic rate limiting per share link and IP address blocks password guessing attempts.",
              },
              {
                icon: <Share2 className="h-6 w-6 text-amber-600" />,
                title: "Instant Revocation",
                desc: "Revoke active share links anytime with immediate invalidation across all future requests.",
              },
              {
                icon: <CheckCircle className="h-6 w-6 text-teal-600" />,
                title: "Accurate View Counter",
                desc: "Strict atomic counters only increment on verified successful reads — failed attempts don't count.",
              },
            ].map((f) => (
              <Card
                key={f.title}
                className="hover:-translate-y-1 transition-all duration-300"
              >
                <CardContent className="p-7">
                  {/* Embossed Icon Plate */}
                  <div className="mb-5 inline-flex items-center justify-center w-13 h-13 rounded-[18px] bg-gradient-to-br from-[#f8fafc] to-[#e4e9f2] shadow-[4px_4px_10px_#d1d9e6,-4px_-4px_10px_#ffffff,inset_0_1px_1px_rgba(255,255,255,0.9)] border border-white/80">
                    {f.icon}
                  </div>
                  <h3 className="font-bold text-[#1e293b] mb-2 text-lg">{f.title}</h3>
                  <p className="text-sm text-[#64748b] leading-relaxed">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* CTA Banner Section */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 pb-24">
          <Card className="shadow-[12px_12px_28px_#cbd5e1,-12px_-12px_28px_#ffffff] text-center p-8 sm:p-12 relative overflow-hidden">
            {/* Convex Icon */}
            <div className="mx-auto mb-6 inline-flex items-center justify-center w-16 h-16 rounded-[22px] bg-gradient-to-br from-[#f8fafc] to-[#e4e9f2] shadow-[5px_5px_12px_#d1d9e6,-5px_-5px_12px_#ffffff,inset_0_1px_1px_rgba(255,255,255,0.9)] border border-white/80">
              <Zap className="h-8 w-8 text-blue-600 drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]" />
            </div>
            
            <h2 className="text-2xl sm:text-3xl font-black text-[#1e293b] mb-3">
              Ready to Share Securely?
            </h2>
            
            <p className="text-sm sm:text-base text-[#64748b] mb-8 max-w-lg mx-auto leading-relaxed">
              Create an account or start generating private, expiring links in seconds.
            </p>
            
            {!user ? (
              <Button
                asChild
                size="lg"
                className="h-13 px-8 text-base shadow-[5px_6px_16px_rgba(37,99,235,0.35),-4px_-4px_12px_#ffffff]"
              >
                <Link href="/register" className="flex items-center gap-2">
                  Create Your Free Account
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <Button
                asChild
                size="lg"
                className="h-13 px-8 text-base shadow-[5px_6px_16px_rgba(37,99,235,0.35),-4px_-4px_12px_#ffffff]"
              >
                <Link href="/notes/new" className="flex items-center gap-2">
                  Create New Note
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            )}
          </Card>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#d1d9e6]/80 bg-[#eef2f7] py-10 shadow-[inset_0_1px_0_#ffffff]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5 font-bold text-[#1e293b]">
              <div className="p-1.5 rounded-[10px] bg-gradient-to-br from-[#f8fafc] to-[#e4e9f2] shadow-[2px_2px_5px_#d1d9e6,-2px_-2px_5px_#ffffff] border border-white/80">
                <Shield className="h-4 w-4 text-blue-600" />
              </div>
              <span>NoteShare</span>
            </div>
            
            <div className="text-xs sm:text-sm text-[#718096]">
              Engineered with Next.js, Hono, Drizzle ORM & PostgreSQL
            </div>
            
            <div className="text-xs text-[#94a3b8]">
              End-to-End Cryptographic Security
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}