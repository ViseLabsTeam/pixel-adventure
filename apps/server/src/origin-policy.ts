export function allowedOrigins(value: string) {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const url = parseOrigin(entry);
      if (!url) throw new Error("APP_ORIGINS contiene un origen inválido.");
      return url.origin;
    });
}

function parseOrigin(value: string) {
  try {
    const url = new URL(value);
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.origin !== value ||
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash
    )
      return null;
    return url;
  } catch {
    return null;
  }
}

export function originAllowed(
  origin: string | undefined,
  host: string | string[] | undefined,
  additional: readonly string[],
) {
  if (origin === undefined) return true;
  const url = parseOrigin(origin);
  if (!url) return false;
  return (
    additional.includes(url.origin) ||
    (typeof host === "string" && url.host === host.toLowerCase())
  );
}
