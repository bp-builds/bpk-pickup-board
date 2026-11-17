// Shared logic for the BP Kids pickup board.
// Pure functions live here so they can be tested without Netlify or Planning Center.

export const EVENT_ID = "1060500"; // "Test Event" — TEMPORARY for testing; switch back to 892503 (BP Kids Sunday) when done
export const TIME_ZONE = "America/Chicago";

// Planning Center location IDs -> board rooms.
// Test Event locations (real Sunday event 892503 uses 2855590/2855608/2855610/2855624/2855626).
export const ROOMS = [
  { slug: "nursery-1", locationId: "2862641", name: "Nursery 1", ages: "0–11 months" },
  { slug: "nursery-2", locationId: "2862645", name: "Nursery 2", ages: "1–2 years" },
  { slug: "sprouts", locationId: "2862381", name: "Sprouts", ages: "3–5 years" },
  { slug: "stems", locationId: "2862661", name: "Stems", ages: "6–9 years" },
  { slug: "grove", locationId: "2862662", name: "Grove", ages: "10–14 years" },
];

const roomByLocation = new Map(ROOMS.map((r) => [r.locationId, r]));

export function getEnv(name) {
  try {
    if (globalThis.Netlify?.env) return globalThis.Netlify.env.get(name);
  } catch {}
  return process.env[name];
}

// "YYYY-MM-DD" for a Date in the church's time zone.
export function localDateKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit",
  }).format(date);
}

// Turn one or more pages of the PCO check_ins response into today's pickups.
// pages: array of PCO JSON:API documents ({ data, included }).
export function pickupsFromPco(pages, todayKey) {
  const out = [];
  // People included via include=checked_in_by,checked_out_by
  const people = new Map();
  for (const page of pages) {
    for (const inc of page.included || []) {
      if (inc.type !== "Person") continue;
      const at = inc.attributes || {};
      people.set(String(inc.id), at.name || [at.first_name, at.last_name].filter(Boolean).join(" "));
    }
  }
  const personName = (rel) => (rel?.data?.id ? people.get(String(rel.data.id)) || "" : "");
  for (const page of pages) {
    for (const ci of page.data || []) {
      const a = ci.attributes || {};
      if (!a.checked_out_at) continue;
      if (localDateKey(new Date(a.checked_out_at)) !== todayKey) continue;
      if ((a.kind || "").toLowerCase() === "volunteer") continue;
      const locIds = (ci.relationships?.locations?.data || []).map((l) => String(l.id));
      const room = locIds.map((id) => roomByLocation.get(id)).find(Boolean);
      if (!room) continue;
      out.push({
        id: String(ci.id),
        firstName: a.first_name || "",
        lastName: a.last_name || "",
        securityCode: a.security_code || "",
        // The adult who checked the child in (Planning Center's default parent contact).
        parentName: personName(ci.relationships?.checked_in_by),
        checkedOutBy: personName(ci.relationships?.checked_out_by),
        checkedOutAt: a.checked_out_at,
        room: room.slug,
        roomName: room.name,
      });
    }
  }
  // Newest checkout first
  out.sort((x, y) => (x.checkedOutAt < y.checkedOutAt ? 1 : -1));
  return out;
}

// True once a page contains a checkout from before today (results are newest-first).
export function pageReachesBeforeToday(page, todayKey) {
  return (page.data || []).some((ci) => {
    const t = ci.attributes?.checked_out_at;
    return t && localDateKey(new Date(t)) < todayKey;
  });
}

export function mergeConfirmations(pickups, confirmations) {
  return pickups.map((p) => {
    const c = confirmations[p.id];
    return { ...p, confirmedAt: c?.confirmedAt || null };
  });
}

// PIN check. Room boards are open (no PIN). Admin-only actions need ADMIN_PIN.
export function checkPin(req, { adminOnly = false } = {}) {
  const pin = req.headers.get("x-board-pin") || "";
  const adminPin = getEnv("ADMIN_PIN");
  if (!adminPin) return { ok: false, status: 500, error: "Admin PIN is not set up yet (ADMIN_PIN)." };
  if (pin && pin === adminPin) return { ok: true, admin: true };
  return { ok: false, status: 401, error: "Wrong PIN." };
}

export function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}
