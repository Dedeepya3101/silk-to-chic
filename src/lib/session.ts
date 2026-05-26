import { supabase } from "@/integrations/supabase/client";

export type Role = "user" | "tailor";
export type Session = { id: string; name: string; role: Role; email?: string };

const KEY = "matcho.session";

export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export function setSession(s: Session) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(s));
}

export function clearSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
}

export function nameFromEmail(email: string) {
  const local = email.split("@")[0] || "Guest";
  return local
    .replace(/[._-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0].toUpperCase() + p.slice(1))
    .join(" ");
}

/** Hydrate cached session from Supabase auth + profiles + user_roles. */
export async function refreshSession(): Promise<Session | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    clearSession();
    return null;
  }
  const [{ data: profile }, { data: roleRow }] = await Promise.all([
    supabase.from("profiles").select("display_name, email").eq("id", user.id).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", user.id).maybeSingle(),
  ]);
  const session: Session = {
    id: user.id,
    name: profile?.display_name || nameFromEmail(user.email || ""),
    email: profile?.email || user.email || undefined,
    role: (roleRow?.role as Role) || "user",
  };
  setSession(session);
  return session;
}

export async function signOut() {
  await supabase.auth.signOut();
  clearSession();
}
