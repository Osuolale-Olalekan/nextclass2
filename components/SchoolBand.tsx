import type { CSSProperties, ReactNode } from "react";
import { readableTextColor } from "@/lib/utils";

/** CSS variables that re-theme a page with one school's brand colour. */
export function brandStyle(color: string): CSSProperties {
  return { "--brand": color, "--on-brand": readableTextColor(color) } as CSSProperties;
}

/** The school-letterhead header shown at the top of every parent-facing page. */
export default function SchoolBand({ name, children }: { name: string; children?: ReactNode }) {
  return (
    <header style={{ background: "var(--brand)", color: "var(--on-brand)" }}>
      <div className="mx-auto max-w-xl px-5 pb-10 pt-12 sm:pb-12 sm:pt-16">
        <h1 className="font-serif text-4xl leading-[1.1] tracking-tight sm:text-5xl">{name}</h1>
        {children ? <div className="mt-4 max-w-[34rem] text-base leading-relaxed">{children}</div> : null}
      </div>
    </header>
  );
}
