// Room confirmations, stored per day in Netlify Blobs: key = "<YYYY-MM-DD>/<checkInId>".
import { getStore } from "@netlify/blobs";

function store() {
  return getStore({ name: "bpk-pickup-confirmations", consistency: "strong" });
}

export async function getConfirmations(todayKey) {
  const s = store();
  const { blobs } = await s.list({ prefix: `${todayKey}/` });
  const entries = await Promise.all(
    blobs.map(async (b) => [b.key.slice(todayKey.length + 1), await s.get(b.key, { type: "json" })])
  );
  return Object.fromEntries(entries.filter(([, v]) => v));
}

export async function setConfirmation(todayKey, id, data) {
  await store().setJSON(`${todayKey}/${id}`, data);
}

export async function clearConfirmation(todayKey, id) {
  await store().delete(`${todayKey}/${id}`);
}
