import { isIP } from "node:net";
import { resolve4, resolve6 } from "node:dns/promises";

function isPrivateIp(address: string) {
  if (address === "::1" || address === "0.0.0.0" || address === "::") return true;

  if (isIP(address) === 4) {
    const [a, b] = address.split(".").map(Number);
    return a === 10
      || a === 127
      || a === 0
      || (a === 169 && b === 254)
      || (a === 172 && b >= 16 && b <= 31)
      || (a === 192 && b === 168)
      || (a === 100 && b >= 64 && b <= 127)
      || a >= 224;
  }

  const normalized = address.toLowerCase();
  return normalized.startsWith("fc")
    || normalized.startsWith("fd")
    || normalized.startsWith("fe8")
    || normalized.startsWith("fe9")
    || normalized.startsWith("fea")
    || normalized.startsWith("feb");
}

export async function assertPublicHttpUrl(value: string) {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error("Only HTTP and HTTPS sources can be read");
  }
  if (url.username || url.password) throw new Error("Source URLs cannot contain credentials");

  const hostname = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (hostname === "localhost" || hostname.endsWith(".localhost") || isPrivateIp(hostname)) {
    throw new Error("Private network sources are blocked");
  }

  const addresses = new Set<string>();
  const [v4, v6] = await Promise.all([
    resolve4(hostname).catch(() => []),
    resolve6(hostname).catch(() => []),
  ]);
  for (const address of [...v4, ...v6]) addresses.add(address);
  if (!addresses.size || [...addresses].some(isPrivateIp)) {
    throw new Error("Source host does not resolve to a public address");
  }

  return url;
}
