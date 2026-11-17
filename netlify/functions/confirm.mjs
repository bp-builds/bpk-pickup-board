// POST   /api/confirm  { id }  -> room volunteer confirms the child was sent to the front
// DELETE /api/confirm  { id }  -> admin undoes a confirmation tapped by mistake
import { checkPin, json, localDateKey } from "../../lib/core.mjs";
import { getTodaysPickups } from "../../lib/pco.mjs";
import { setConfirmation, clearConfirmation } from "../../lib/store.mjs";

export default async (req) => {
  const isUndo = req.method === "DELETE";
  // Room confirm is open (no PIN). Only undo (admin) needs the admin PIN.
  if (isUndo) {
    const auth = checkPin(req, { adminOnly: true });
    if (!auth.ok) return json({ error: auth.error }, auth.status);
  }

  let body;
  try { body = await req.json(); } catch { return json({ error: "Bad request." }, 400); }
  const id = String(body?.id || "");
  if (!/^\d+$/.test(id)) return json({ error: "Bad check-in id." }, 400);

  try {
    const todayKey = localDateKey();
    // Only accept ids that are real checkouts from today's BP Kids event.
    const pickup = (await getTodaysPickups()).find((p) => p.id === id);
    if (!pickup) return json({ error: "That checkout isn't on today's list." }, 404);

    if (isUndo) {
      await clearConfirmation(todayKey, id);
      return json({ ok: true, id, confirmedAt: null });
    }
    const confirmedAt = new Date().toISOString();
    await setConfirmation(todayKey, id, { confirmedAt, room: pickup.room });
    return json({ ok: true, id, confirmedAt });
  } catch (err) {
    console.error(err);
    return json({ error: err.message || "Could not save." }, 502);
  }
};

export const config = { path: "/api/confirm", method: ["POST", "DELETE"] };
