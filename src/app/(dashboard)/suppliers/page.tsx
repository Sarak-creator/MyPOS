"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SuppliersRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/purchases");
  }, [router]);

  return (
    <div className="flex h-[60vh] items-center justify-center text-xs font-bold text-slate-500">
      កំពុងបញ្ជូនទៅកាន់ទំព័រអ្នកផ្គត់ផ្គង់ & ការទិញចូល...
    </div>
  );
}
