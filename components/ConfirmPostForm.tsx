"use client";

import type { ReactNode } from "react";

export function ConfirmPostForm({
  action,
  confirmText,
  children,
  className,
}: {
  action: string;
  confirmText: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <form
      action={action}
      method="post"
      onSubmit={(e) => {
        const ok = window.confirm(confirmText);
        if (!ok) e.preventDefault();
      }}
    >
      <button type="submit" className={className}>
        {children}
      </button>
    </form>
  );
}

