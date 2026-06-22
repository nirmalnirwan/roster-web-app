export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
      <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between px-4 py-4 text-xs text-slate-500 dark:text-neutral-500 sm:px-6 lg:px-8">
        <span>Roster Manager</span>
        <span>© {currentYear} All rights reserved.</span>
      </div>
    </footer>
  );
}
