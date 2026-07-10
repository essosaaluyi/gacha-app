import type { ReactNode } from "react";

type ManualSectionProps = {
  title: string;
  children: ReactNode;
};

export default function ManualSection({ title, children }: ManualSectionProps) {
  return (
    <section className="trust-manual-section">
      <h2>{title}</h2>
      <div className="trust-section-copy">
        {children}
      </div>
    </section>
  );
}
