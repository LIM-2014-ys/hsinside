'use client';

import { isAdminEmail } from '@/lib/admin';

export default function AdminBadge({ email }) {
  if (!email || !isAdminEmail(email)) return null;

  return (
    <span
      className="inline-flex items-center justify-center w-4 h-4 text-[10px] bg-blue-600 text-white rounded-md font-bold ml-1 shrink-0 select-none"
      title="공식"
    >
      ✓
    </span>
  );
}
