import { Sparkles } from "lucide-react";

export type SuggestionDetails = {
  silhouette?: string | null;
  sleeve_ideas?: string | null;
  color_suggestions?: string | null;
  stitching_notes?: string | null;
  created_at: string;
  tailor_name?: string;
  avatar_url?: string | null;
  image_url?: string;
  mine?: boolean;
};

const ROWS: Array<[keyof SuggestionDetails, string]> = [
  ["silhouette", "Recommended silhouette"],
  ["sleeve_ideas", "Sleeve ideas"],
  ["color_suggestions", "Color & embroidery"],
  ["stitching_notes", "Stitching notes"],
];

export function SuggestionCard({ s }: { s: SuggestionDetails }) {
  const rows = ROWS.filter(([k]) => {
    const v = s[k];
    return typeof v === "string" && v.trim().length > 0;
  });

  return (
    <div className="max-w-[85%] rounded-2xl border border-border bg-card p-3 shadow-soft">
      <div className="flex items-center gap-2">
        {s.avatar_url ? (
          <img src={s.avatar_url} alt="" className="h-7 w-7 rounded-full object-cover" />
        ) : (
          <div className="grid h-7 w-7 place-items-center rounded-full bg-foreground text-[11px] text-background">
            {(s.tailor_name || "T")[0]}
          </div>
        )}
        <p className="text-xs font-medium">{s.mine ? "You" : s.tailor_name || "Tailor"}</p>
        <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[10px] text-accent-foreground">
          <Sparkles className="h-3 w-3" /> Suggestion
        </span>
      </div>

      {s.image_url && (
        <img src={s.image_url} alt="Saree in this conversation" className="mt-2 h-28 w-full rounded-xl object-cover" />
      )}

      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">Suggestion sent — no extra details were added.</p>
      ) : (
        <dl className="mt-2 space-y-1.5">
          {rows.map(([k, label]) => (
            <div key={k as string}>
              <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</dt>
              <dd className="text-sm">{s[k] as string}</dd>
            </div>
          ))}
        </dl>
      )}

      <p className="mt-2 text-[10px] opacity-70">
        {new Date(s.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
      </p>
    </div>
  );
}
