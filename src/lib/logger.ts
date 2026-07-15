// Logging hygiene: in production, log only a short context string so raw
// Supabase error objects / payloads (which can contain identifiers or data)
// never end up in the browser console. Full detail is kept in dev.
const isDev = import.meta.env.DEV;

export function logError(context: string, err?: unknown): void {
  if (isDev) {
    console.error(context, err);
  } else {
    console.error(context);
  }
}
