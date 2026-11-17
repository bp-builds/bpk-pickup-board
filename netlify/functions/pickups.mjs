// GET /api/pickups?room=<slug>   -> that room's checked-in kids + checkouts today (room or admin PIN)
// GET /api/pickups?room=all      -> every room (admin PIN only)
import { ROOMS, checkPin, json, localDateKey, mergeConfirmations } from "../../lib/core.mjs";
import { getTodaysPickups, getTodaysCheckedIn } from "../../lib/pco.mjs";
import { getConfirmations } from "../../lib/store.mjs";

export default async (req) => {
  const room = new URL(req.url).searchParams.get("room") || "";
  const isAll = room === "all";
  if (!isAll && !ROOMS.some((r) => r.slug === room)) return json({ error: "Unknown room." }, 400);

  // Room boards are open (no PIN). Only the admin overview (room=all) needs the admin PIN.
  if (isAll) {
    const auth = checkPin(req, { adminOnly: true });
    if (!auth.ok) return json({ error: auth.error }, auth.status);
  }

  try {
    const todayKey = localDateKey();
    const [pickups, checkedIn, confirmations] = await Promise.all([
      getTodaysPickups(),
      getTodaysCheckedIn(),
      getConfirmations(todayKey),
    ]);
    let list = mergeConfirmations(pickups, confirmations);
    let inList = checkedIn;
    if (!isAll) {
      list = list.filter((p) => p.room === room);
      inList = inList.filter((p) => p.room === room);
    }
    return json({ date: todayKey, updatedAt: new Date().toISOString(), checkedIn: inList, pickups: list });
  } catch (err) {
    console.error(err);
    return json({ error: err.message || "Could not load pickups." }, 502);
  }
};

export const config = { path: "/api/pickups", method: ["GET"] };
