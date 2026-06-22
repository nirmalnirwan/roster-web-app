"use client";

import { Bell, LogOut, Search, ShieldCheck } from "lucide-react";
import Link from "next/link";
import ThemeToggle from "./theme-toggle";
import { Button } from "./ui/button";
import { AUTH_CHANGE_EVENT, isAuthenticated, logout } from "../app/services/authService";
import { usePathname, useRouter } from "next/navigation";
import { useSyncExternalStore } from "react";

function subscribeToAuthChanges(onStoreChange: () => void) {
    window.addEventListener("storage", onStoreChange);
    window.addEventListener(AUTH_CHANGE_EVENT, onStoreChange);

    return () => {
        window.removeEventListener("storage", onStoreChange);
        window.removeEventListener(AUTH_CHANGE_EVENT, onStoreChange);
    };
}

function getAuthSnapshot() {
    return isAuthenticated();
}

function getServerAuthSnapshot() {
    return false;
}

export default function Navbar() {
    const router = useRouter();
    const pathname = usePathname();
    const auth = useSyncExternalStore(
        subscribeToAuthChanges,
        getAuthSnapshot,
        getServerAuthSnapshot
    );

    const handleLogout = () => {
        logout();
        router.push('/login');
    };

    const pageTitle = getPageTitle(pathname);

    return (
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/95">
            <div className="flex min-h-16 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
                <div className="flex min-w-0 items-center gap-3">
                    <Link href="/" className="flex items-center gap-2 md:hidden">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-600 text-sm font-semibold text-white">
                            RM
                        </div>
                    </Link>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <h1 className="truncate text-sm font-semibold text-slate-950 dark:text-white sm:text-base">
                                {pageTitle}
                            </h1>
                            <span className="hidden rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300 sm:inline-flex">
                                Live
                            </span>
                        </div>
                        <p className="hidden text-xs text-slate-500 dark:text-neutral-400 sm:block">
                            Roster Management System
                        </p>
                    </div>
                </div>

                <div className="hidden min-w-0 flex-1 justify-center px-4 lg:flex">
                    <label className="relative w-full max-w-xl">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            type="search"
                            placeholder="Search roster, housekeepers, locations..."
                            className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-violet-300 focus:bg-white focus:ring-4 focus:ring-violet-100 dark:border-neutral-800 dark:bg-neutral-900 dark:focus:border-violet-700 dark:focus:bg-neutral-950 dark:focus:ring-violet-950"
                        />
                    </label>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                    <Button variant="ghost" size="icon-sm" className="hidden text-slate-500 hover:text-slate-950 dark:text-neutral-400 dark:hover:text-white sm:inline-flex" aria-label="Security status">
                        <ShieldCheck className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon-sm" className="hidden text-slate-500 hover:text-slate-950 dark:text-neutral-400 dark:hover:text-white sm:inline-flex" aria-label="Notifications">
                        <Bell className="h-4 w-4" />
                    </Button>
                    <ThemeToggle />
                    {auth ? (
                      <Button variant="outline" size="sm" onClick={handleLogout}>
                        <LogOut className="h-4 w-4" />
                        <span className="hidden sm:inline">Logout</span>
                      </Button>
                    ) : (
                      <Button asChild size="sm">
                        <Link href="/login">Login</Link>
                      </Button>
                    )}
                </div>
            </div>
        </header>
    );
}

function getPageTitle(pathname: string) {
    const titles: Record<string, string> = {
        '/': 'Dashboard',
        '/admin': 'Admin',
        '/apartments': 'Apartments',
        '/common-areas': 'Common Areas',
        '/dashboard': 'Dashboard',
        '/export': 'Export Rosters',
        '/housekeepers': 'Housekeepers',
        '/locations': 'Locations',
        '/login': 'Login',
        '/my-schedule': 'My Schedule',
        '/residents': 'Residents',
        '/roster': 'Roster Builder',
        '/task': 'Cleaning Tasks',
        '/units': 'Units',
    };

    return titles[pathname] ?? 'Roster Manager';
}
