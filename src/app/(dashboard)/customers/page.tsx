"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CustomersRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/crm");
  }, [router]);

  return (
    <div className="flex h-[60vh] items-center justify-center text-xs font-bold text-slate-500">
      កំពុងបញ្ជូនទៅកាន់ទំព័រ CRM & អតិថិជន...
    </div>
  );
}
