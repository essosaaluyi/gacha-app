type RulesOddsSectionProps = {
  title: string;
  rows: Array<{ label: string; value: string }>;
};

export default function RulesOddsSection({ title, rows }: RulesOddsSectionProps) {
  return (
    <section className="trust-rules-section">
      <h2>{title}</h2>
      <div className="trust-rules-table">
        {rows.map((row) => (
          <div
            key={row.label}
            className="trust-rules-row"
          >
            <p>{row.label}</p>
            <p>{row.value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
