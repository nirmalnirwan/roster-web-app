import type { RosterAreaType } from './types';

type RosterAreaStyle = {
  listClassName: string;
  badgeClassName: string;
  eventBackgroundColor: string;
  eventBorderColor: string;
  eventTextColor: string;
};

export const ROSTER_AREA_STYLES: Record<RosterAreaType, RosterAreaStyle> = {
  CommonArea: {
    listClassName: 'border-emerald-200 bg-emerald-50 hover:border-emerald-300 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/50',
    badgeClassName: 'border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
    eventBackgroundColor: '#059669',
    eventBorderColor: '#047857',
    eventTextColor: '#ffffff',
  },
  Unit: {
    listClassName: 'border-blue-200 bg-blue-50 hover:border-blue-300 hover:bg-blue-100 dark:border-blue-900 dark:bg-blue-950/30 dark:hover:bg-blue-950/50',
    badgeClassName: 'border-blue-300 bg-blue-100 text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200',
    eventBackgroundColor: '#2563eb',
    eventBorderColor: '#1d4ed8',
    eventTextColor: '#ffffff',
  },
  Apartment: {
    listClassName: 'border-violet-200 bg-violet-50 hover:border-violet-300 hover:bg-violet-100 dark:border-violet-900 dark:bg-violet-950/30 dark:hover:bg-violet-950/50',
    badgeClassName: 'border-violet-300 bg-violet-100 text-violet-800 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-200',
    eventBackgroundColor: '#7c3aed',
    eventBorderColor: '#6d28d9',
    eventTextColor: '#ffffff',
  },
};
