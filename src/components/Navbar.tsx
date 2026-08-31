
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  FileText,
  LogOut,
  PlusCircle,
  LayoutDashboard,
} from "lucide-react";

export default function Navbar() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <header className="sticky top-0 z-50 w-full overflow-x-hidden bg-[#eef2f7]/95 backdrop-blur-md shadow-[0_6px_20px_rgba(209,217,230,0.7),0_1px_0_rgba(255,255,255,0.9)] border-b border-[#d1d9e6]/60">
      {/* Top subtle light reflection */}
      <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-white to-transparent opacity-90" />

      <div className="max-w-6xl mx-auto px-3 sm:px-6 h-16 sm:h-20 flex items-center justify-between gap-2">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 sm:gap-3 group select-none min-w-0 shrink-0"
        >
          <div className="relative p-2 sm:p-2.5 rounded-[13px] sm:rounded-[16px] bg-gradient-to-br from-[#f8fafc] to-[#e4e9f2] shadow-[3px_3px_8px_#d1d9e6,-3px_-3px_8px_#ffffff,inset_0_1px_1px_rgba(255,255,255,0.9)] sm:shadow-[4px_4px_10px_#d1d9e6,-4px_-4px_10px_#ffffff,inset_0_1px_1px_rgba(255,255,255,0.9)] border border-white/80 group-hover:-translate-y-[0.5px] transition-all duration-200">
            <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]" />
          </div>

          <div className="min-w-0">
            <span className="text-base sm:text-xl font-bold tracking-tight text-[#1e293b] flex items-center gap-1.5 whitespace-nowrap">
              NoteShare
            </span>

            <span className="hidden sm:block text-[10px] uppercase font-bold tracking-widest text-[#94a3b8]">
              Secure Notes
            </span>
          </div>
        </Link>

        {/* Navigation Actions */}
        <nav className="flex items-center gap-1.5 sm:gap-3.5 shrink-0">
          {user ? (
            <>
              {/* User badge */}
              <div className="hidden lg:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#e9edf3] shadow-[inset_2px_2px_4px_#d1d9e6,inset_-2px_-2px_4px_#ffffff] border border-[#d1d9e6]/40 text-xs font-semibold text-[#475569] max-w-[150px]">
                <div className="h-2 w-2 shrink-0 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]" />
                <span className="truncate">{user.name}</span>
              </div>

              {/* New Note */}
              <Link href="/notes/new">
                <button
                  aria-label="New Note"
                  className="flex items-center justify-center gap-1.5 sm:gap-2 h-9 w-9 sm:w-auto sm:h-auto sm:px-4 sm:py-2.5 rounded-[12px] sm:rounded-[14px] bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 text-white text-xs sm:text-sm font-semibold tracking-wide shadow-[3px_4px_10px_rgba(37,99,235,0.35),-2px_-2px_7px_#ffffff,inset_0_1px_1px_rgba(255,255,255,0.4),inset_0_-1px_2px_rgba(0,0,0,0.2)] sm:shadow-[4px_5px_14px_rgba(37,99,235,0.35),-3px_-3px_10px_#ffffff,inset_0_1px_1px_rgba(255,255,255,0.4),inset_0_-1px_2px_rgba(0,0,0,0.2)] border border-blue-400/40 hover:-translate-y-[1px] active:translate-y-[1px] transition-all duration-200 cursor-pointer"
                >
                  <PlusCircle className="h-4 w-4" />
                  <span className="hidden sm:inline">New Note</span>
                </button>
              </Link>

              {/* My Notes */}
              <Link href="/dashboard">
                <button
                  aria-label="My Notes"
                  className="flex items-center justify-center gap-2 h-9 w-9 sm:w-auto sm:h-auto sm:px-4 sm:py-2.5 rounded-[12px] sm:rounded-[14px] bg-gradient-to-br from-[#f8fafc] to-[#e5eaf2] text-[#334155] text-xs sm:text-sm font-semibold shadow-[3px_3px_8px_#d1d9e6,-3px_-3px_8px_#ffffff,inset_0_1px_1px_rgba(255,255,255,0.9)] sm:shadow-[4px_4px_10px_#d1d9e6,-4px_-4px_10px_#ffffff,inset_0_1px_1px_rgba(255,255,255,0.9)] border border-white/80 hover:-translate-y-[1px] active:translate-y-[1px] transition-all duration-200 cursor-pointer"
                >
                  <LayoutDashboard className="h-4 w-4 text-[#64748b]" />
                  <span className="hidden sm:inline">My Notes</span>
                </button>
              </Link>

              {/* Logout */}
              <button
                onClick={() => void handleLogout()}
                aria-label="Logout"
                title="Logout"
                className="flex items-center justify-center gap-1.5 h-9 w-9 sm:w-auto sm:h-auto sm:px-3 sm:py-2.5 rounded-[12px] sm:rounded-[14px] bg-gradient-to-br from-[#f8fafc] to-[#e5eaf2] text-red-600 text-xs sm:text-sm font-semibold shadow-[3px_3px_8px_#d1d9e6,-3px_-3px_8px_#ffffff,inset_0_1px_1px_rgba(255,255,255,0.9)] sm:shadow-[3px_3px_8px_#d1d9e6,-3px_-3px_8px_#ffffff,inset_0_1px_1px_rgba(255,255,255,0.9)] border border-white/80 hover:from-red-50 hover:to-red-100 hover:text-red-700 hover:-translate-y-[1px] active:translate-y-[1px] transition-all duration-200 cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </>
          ) : (
            <>
              {/* Sign In */}
              <Link href="/login">
                <button
                  className="flex items-center justify-center h-9 px-3 sm:h-auto sm:px-5 sm:py-2.5 rounded-[12px] sm:rounded-[14px] bg-gradient-to-br from-[#f8fafc] to-[#e5eaf2] text-[#334155] text-xs sm:text-sm font-semibold shadow-[3px_3px_8px_#d1d9e6,-3px_-3px_8px_#ffffff,inset_0_1px_1px_rgba(255,255,255,0.9)] sm:shadow-[4px_4px_10px_#d1d9e6,-4px_-4px_10px_#ffffff,inset_0_1px_1px_rgba(255,255,255,0.9)] border border-white/80 hover:-translate-y-[1px] active:translate-y-[1px] transition-all duration-200 cursor-pointer"
                >
                  Sign In
                </button>
              </Link>

              {/* Get Started */}
              <Link href="/register">
                <button
                  className="flex items-center justify-center h-9 px-3 sm:h-auto sm:px-5 sm:py-2.5 rounded-[12px] sm:rounded-[14px] bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 text-white text-xs sm:text-sm font-semibold tracking-wide shadow-[3px_4px_10px_rgba(37,99,235,0.35),-2px_-2px_7px_#ffffff,inset_0_1px_1px_rgba(255,255,255,0.4),inset_0_-1px_2px_rgba(0,0,0,0.2)] sm:shadow-[4px_5px_14px_rgba(37,99,235,0.35),-3px_-3px_10px_#ffffff,inset_0_1px_1px_rgba(255,255,255,0.4),inset_0_-1px_2px_rgba(0,0,0,0.2)] border border-blue-400/40 hover:-translate-y-[1px] active:translate-y-[1px] transition-all duration-200 cursor-pointer"
                >
                  Get Started
                </button>
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

