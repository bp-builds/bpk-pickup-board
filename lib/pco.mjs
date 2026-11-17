// Reads today's checkouts for the BP Kids event from the Planning Center API.
import { EVENT_ID, getEnv, localDateKey, pickupsFromPco, pageReachesBeforeToday, checkedInFromPco, pageCreatedBeforeToday } from "./core.mjs";

const BASE = "https://api.planningcenteronline.com/check-ins/v2";
const CACHE_MS = 3000; // all boards share one PCO call every few seconds
const MAX_PAGES = 5;   // 500 checkouts is far more than one Sunday

let cache = { at: 0, todayKey: "", pickups: null };
let checkedInCache = { at: 0, todayKey: "", checkedIn: null };

function authHeader() {
  const id = getEnv("PCO_APP_ID");
  const secret = getEnv("PCO_SECRET");
  if (!id || !secret) throw new Error("Planning Center keys are not set up yet (PCO_APP_ID / PCO_SECRET).");
  return "Basic " + Buffer.from(`${id}:${secret}`).toString("base64");
}

export async function getTodaysPickups() {
  const todayKey = localDateKey();
  if (cache.pickups && cache.todayKey === todayKey && Date.now() - cache.at < CACHE_MS) {
    return cache.pickups;
  }

  const params = new URLSearchParams({
    filter: "checked_out",
    include: "locations,checked_in_by,checked_out_by",
    order: "-checked_out_at",
    per_page: "100",
  });
  let url = `${BASE}/events/${EVENT_ID}/check_ins?${params}`;
  const pages = [];

  for (let i = 0; i < MAX_PAGES && url; i++) {
    const res = await fetch(url, { headers: { Authorization: authHeader(), Accept: "application/json" } });
    if (res.status === 429) {
      if (cache.pickups) return cache.pickups; // rate limited: serve last good data
      throw new Error("Planning Center is busy (rate limit). Try again in a few seconds.");
    }
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Planning Center returned ${res.status}. ${text.slice(0, 200)}`);
    }
    const page = await res.json();
    pages.push(page);
    if (pageReachesBeforeToday(page, todayKey)) break;
    url = page.links?.next || null;
  }

  const pickups = pickupsFromPco(pages, todayKey);
  cache = { at: Date.now(), todayKey, pickups };
  return pickups;
}

// Kids checked in today who have NOT been checked out yet (currently in the room).
export async function getTodaysCheckedIn() {
  const todayKey = localDateKey();
  if (checkedInCache.checkedIn && checkedInCache.todayKey === todayKey && Date.now() - checkedInCache.at < CACHE_MS) {
    return checkedInCache.checkedIn;
  }

  const params = new URLSearchParams({
    filter: "not_checked_out",
    include: "locations,checked_in_by",
    order: "-created_at",
    per_page: "100",
  });
  let url = `${BASE}/events/${EVENT_ID}/check_ins?${params}`;
  const pages = [];

  for (let i = 0; i < MAX_PAGES && url; i++) {
    const res = await fetch(url, { headers: { Authorization: authHeader(), Accept: "application/json" } });
    if (res.status === 429) {
      if (checkedInCache.checkedIn) return checkedInCache.checkedIn; // rate limited: serve last good data
      throw new Error("Planning Center is busy (rate limit). Try again in a few seconds.");
    }
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Planning Center returned ${res.status}. ${text.slice(0, 200)}`);
    }
    const page = await res.json();
    pages.push(page);
    if (pageCreatedBeforeToday(page, todayKey)) break;
    url = page.links?.next || null;
  }

  const checkedIn = checkedInFromPco(pages, todayKey);
  checkedInCache = { at: Date.now(), todayKey, checkedIn };
  return checkedIn;
}
