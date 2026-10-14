/** Turns a saved saree analysis into plain prompt text for the AI Assistant. */
export function analysisToText(a: unknown): string {
  if (!a || typeof a !== "object") return "";
  const r = a as Record<string, unknown>;
  const v = (x: unknown) => (Array.isArray(x) ? (x.length ? x.join(", ") : "not clearly detected") : String(x ?? "not clearly detected"));
  return [
    `dominant colours: ${v(r.dominant_colors)}`, `secondary colours: ${v(r.secondary_colors)}`,
    `pattern: ${v(r.pattern)}`, `border: ${v(r.border_style)}`, `embroidery level: ${v(r.embroidery_level)}`,
    `visual style: ${v(r.visual_style)}`, `appearance: ${v(r.appearance)}`,
    `suitable occasions: ${v(r.occasions)}`, `possible outfit directions: ${v(r.outfit_directions)}`,
  ].join("; ");
}
