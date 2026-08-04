"use client";

import { useSearchParams } from "next/navigation";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ExportButtons({ defaultStart, defaultEnd }: { defaultStart: string; defaultEnd: string }) {
  const searchParams = useSearchParams();

  function exportUrl(format: "csv" | "xlsx" | "pdf") {
    const params = new URLSearchParams(searchParams.toString());
    if (!params.get("start")) params.set("start", defaultStart);
    if (!params.get("end")) params.set("end", defaultEnd);
    params.set("format", format);
    return `/api/export?${params.toString()}`;
  }

  return (
    <div className="flex gap-2">
      <Button type="button" variant="outline" size="sm" nativeButton={false} render={<a href={exportUrl("csv")} />}>
        <Download className="h-4 w-4" />
        CSV
      </Button>
      <Button type="button" variant="outline" size="sm" nativeButton={false} render={<a href={exportUrl("xlsx")} />}>
        <Download className="h-4 w-4" />
        Excel
      </Button>
      <Button type="button" variant="outline" size="sm" nativeButton={false} render={<a href={exportUrl("pdf")} />}>
        <Download className="h-4 w-4" />
        PDF
      </Button>
    </div>
  );
}
