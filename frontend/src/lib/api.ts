const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:8000";

export async function queryGraph(sparql: string): Promise<{ results: Record<string, unknown>[] }> {
  const res = await fetch(`${API_BASE}/api/graph?q=${encodeURIComponent(sparql)}`);
  if (!res.ok) throw new Error(`Graph query failed: ${res.status}`);
  return res.json();
}
