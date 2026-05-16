"use client";

import { createClient } from "@/lib/supabase/client";

export default function LogoutButton() {
  return (
    <button
      className="btn-secondary"
      onClick={async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        window.location.href = "/login";
      }}
    >
      Cerrar sesion
    </button>
  );
}
