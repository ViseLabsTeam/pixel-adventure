import type { CampaignMode } from "@umbral/protocol";

function publicHostname(hostname: string) {
  const name = hostname.toLowerCase();
  if (
    !name.includes(".") ||
    name === "localhost" ||
    name.endsWith(".localhost") ||
    name.endsWith(".local") ||
    name.endsWith(".internal") ||
    name.startsWith("[")
  )
    return false;
  if (!/^\d+(?:\.\d+){3}$/.test(name)) return true;
  const octets = name.split(".").map(Number);
  if (octets.some((part) => part > 255)) return false;
  const [first, second] = octets;
  return !(
    first === 0 ||
    first === 10 ||
    first === 127 ||
    first >= 224 ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168) ||
    (first === 198 && (second === 18 || second === 19))
  );
}

export function normalizeInvitationOrigin(input: string, mode: CampaignMode) {
  try {
    const url = new URL(input);
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash
    )
      return null;
    if (mode === "ONLINE") {
      if (url.protocol !== "https:" || !publicHostname(url.hostname))
        return null;
    } else if (["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
}

export function invitationUrl(
  origin: string,
  code: string,
  mode: CampaignMode,
) {
  const normalized = normalizeInvitationOrigin(origin, mode);
  return normalized ? `${normalized}/#/join/${encodeURIComponent(code)}` : null;
}

export function chooseInvitationOrigin({
  mode,
  currentOrigin,
  configuredOrigin,
  savedOrigin,
}: {
  mode: CampaignMode;
  currentOrigin: string;
  configuredOrigin?: string;
  savedOrigin?: string | null;
}) {
  const current = normalizeInvitationOrigin(currentOrigin, mode);
  if (mode === "ONLINE" && current) return current;
  return (
    (savedOrigin && normalizeInvitationOrigin(savedOrigin, mode)) ||
    (configuredOrigin && normalizeInvitationOrigin(configuredOrigin, mode)) ||
    current ||
    ""
  );
}

function invitationKey(campaignId: string) {
  return `umbral.invitation.${campaignId}`;
}

export function loadInvitationOrigin(campaignId: string) {
  return localStorage.getItem(invitationKey(campaignId));
}

export function saveInvitationOrigin(
  campaignId: string,
  mode: CampaignMode,
  origin: string,
) {
  const normalized = normalizeInvitationOrigin(origin, mode);
  if (normalized) localStorage.setItem(invitationKey(campaignId), normalized);
}
