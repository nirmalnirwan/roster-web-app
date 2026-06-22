'use client';

import useRequireAuth from '../hooks/useRequireAuth';

export default function AdminPage() {
  useRequireAuth();
  return (
    <>AdminPage</>
  );
}