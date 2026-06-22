'use client';

import useRequireAuth from '../hooks/useRequireAuth';

export default function DashboardPage() {
  useRequireAuth();

  return (
    <div>
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <p>Welcome to the roster manager.</p>
    </div>
  );
}
