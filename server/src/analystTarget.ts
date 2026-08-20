const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

interface YahooSession {
  cookie: string;
  crumb: string;
}

let session: YahooSession | null = null;

function parseFirstCookie(setCookieHeader: string | null): string | null {
  if (!setCookieHeader) return null;
  const match = setCookieHeader.match(/^([^=]+=[^;]+)/);
  return match ? match[1] : null;
}

/**
 * Yahoo's quoteSummary endpoint (unlike the plain price chart endpoint we
 * use elsewhere) requires a session cookie + a crumb derived from it. Both
 * are long-lived and reusable across many symbol lookups, so we establish
 * this once and only redo it if a request comes back unauthorized.
 */
async function establishSession(): Promise<YahooSession | null> {
  try {
    const cookieRes = await fetch("https://fc.yahoo.com", { headers: { "User-Agent": UA } });
    const cookie = parseFirstCookie(cookieRes.headers.get("set-cookie"));
    if (!cookie) return null;

    const crumbRes = await fetch("https://query2.finance.yahoo.com/v1/test/getcrumb", {
      headers: { "User-Agent": UA, Cookie: cookie },
    });
    if (!crumbRes.ok) return null;
    const crumb = (await crumbRes.text()).trim();
    if (!crumb) return null;

    return { cookie, crumb };
  } catch {
    return null;
  }
}

async function requestTarget(symbol: string, s: YahooSession): Promise<number | null | "unauthorized"> {
  const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(
    symbol
  )}?modules=financialData&crumb=${encodeURIComponent(s.crumb)}`;

  const res = await fetch(url, { headers: { "User-Agent": UA, Cookie: s.cookie } });
  const json = (await res.json().catch(() => null)) as any;
  const result = json?.quoteSummary?.result?.[0];

  if (!result) return "unauthorized";

  const target = result?.financialData?.targetMeanPrice?.raw;
  return typeof target === "number" ? target : null;
}

/** Average analyst 12-month price target for a symbol, in its native currency. Null if unavailable (e.g. ETFs, thinly-covered stocks). */
export async function fetchAnalystTargetPrice(symbol: string): Promise<number | null> {
  if (!session) {
    session = await establishSession();
    if (!session) return null;
  }

  let result = await requestTarget(symbol, session);
  if (result === "unauthorized") {
    session = await establishSession();
    if (!session) return null;
    result = await requestTarget(symbol, session);
  }

  return result === "unauthorized" ? null : result;
}
