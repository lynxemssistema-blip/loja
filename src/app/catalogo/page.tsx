"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CatalogoRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/loja");
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 flex items-center justify-center p-4">
      <div className="text-center space-y-2">
        <div className="w-8 h-8 border-2 border-sky-400 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-slate-400">
          Redirecionando para a Loja Oficial Lynx...
        </p>
      </div>
    </div>
  );
}
