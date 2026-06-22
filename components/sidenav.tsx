'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ComponentType } from 'react';
import { Bed, Calendar, CheckSquare, FileText, Home, MapPin, Plus, Users } from 'lucide-react';

export default function SideNav() {
  const pathname = usePathname();

  const navItems = [
    { href: '/', label: 'Dashboard', icon: Home },
    { href: '/housekeepers', label: 'Housekeepers', icon: Users },
    { href: '/locations', label: 'Locations', icon: MapPin },
    { href: '/residents', label: 'Residents', icon: Bed },
    { href: '/roster', label: 'Weekly Roster', icon: Calendar },
    { href: '/my-schedule', label: 'My Schedule', icon: CheckSquare },
    { href: '/export', label: 'Export', icon: FileText },
    { href: '/task', label: 'Tasks', icon: FileText },

  ];

  return (
    <>
      <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white dark:border-neutral-800 dark:bg-neutral-950 md:block">
        <div className="sticky top-0 flex h-screen flex-col">
          <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-5 dark:border-neutral-800">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-600 text-sm font-semibold text-white shadow-sm">
              RM
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-semibold text-slate-950 dark:text-white">Roster Manager</h1>
              <p className="truncate text-xs text-slate-500 dark:text-neutral-400">Housekeeper Scheduling</p>
            </div>
          </div>

          <div className="border-b border-slate-200 p-3 dark:border-neutral-800">
            <Link
              href="/roster"
              className="flex h-9 items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 text-sm font-medium text-white transition hover:bg-violet-700 dark:bg-white dark:text-neutral-950 dark:hover:bg-violet-100"
            >
              <Plus className="h-4 w-4" />
              New roster
            </Link>
          </div>

          <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
            <div>
              <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-neutral-500">
                Main
              </div>
              <div className="space-y-1">
                {navItems.slice(0, 4).map(item => (
                  <NavLink key={item.href} item={item} active={isActivePath(pathname, item.href)} />
                ))}
              </div>
            </div>

            <div>
              <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-neutral-500">
                Operations
              </div>
              <div className="space-y-1">
                {navItems.slice(4).map(item => (
                  <NavLink key={item.href} item={item} active={isActivePath(pathname, item.href)} />
                ))}
              </div>
            </div>
          </nav>

          <div className="border-t border-slate-200 p-4 dark:border-neutral-800">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-neutral-800 dark:bg-neutral-900">
              <p className="text-xs font-medium text-slate-900 dark:text-white">Roster workspace</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-neutral-400">Manage weekly schedules and locations.</p>
            </div>
          </div>
        </div>
      </aside>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-2 py-2 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/95 md:hidden">
        <div className="grid grid-cols-5 gap-1">
          {navItems.slice(0, 5).map(item => {
            const Icon = item.icon;
            const isActive = isActivePath(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-medium transition ${
                  isActive
                    ? 'bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="max-w-full truncate">{item.label.split(' ')[0]}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}

function NavLink({
  item,
  active,
}: {
  item: { href: string; label: string; icon: ComponentType<{ className?: string }> };
  active: boolean;
}) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
        active
          ? 'bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-white'
      }`}
    >
      <Icon className={`h-4 w-4 ${active ? 'text-violet-600 dark:text-violet-300' : 'text-slate-400 group-hover:text-slate-700 dark:text-neutral-500 dark:group-hover:text-neutral-200'}`} />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

function isActivePath(pathname: string, href: string) {
  if (href === '/') return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}
