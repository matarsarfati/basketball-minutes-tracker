const BASE = "http://localhost:5174/api/library";

export async function fetchLibrary() {
  return (await fetch(BASE)).json();
}

export async function addToLibrary(itemsOrItem) {
  const body = Array.isArray(itemsOrItem) ? { items: itemsOrItem } : itemsOrItem;
  const res = await fetch(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error("POST failed");
  return res.json();
}

export async function importLibrary(allItems) {
  const res = await fetch(BASE, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(allItems)
  });
  if (!res.ok) throw new Error("PUT failed");
  return res.json();
}

export async function updateExercise(id, patch) {
  const res = await fetch(`${BASE}/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch)
  });
  if (!res.ok) throw new Error("PATCH failed");
  return res.json();
}

export async function deleteExercise(id) {
  const res = await fetch(`${BASE}/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("DELETE failed");
  return res.json();
}
