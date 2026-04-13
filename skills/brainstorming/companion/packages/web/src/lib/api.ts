export interface ScreenSummary { id: string; kind: "question"|"demo"|"decision"; title: string; pinned: boolean; }
export interface DecisionSummary { id: string; title: string; status: "proposed"|"approved"|"revised"|"rejected"; }
export interface DocEntry { root: string; path: string; rel: string; }

export async function listScreens(): Promise<ScreenSummary[]> {
  return (await fetch("/api/screens")).json();
}
export async function getScreen(id: string) {
  return (await fetch(`/api/screens/${encodeURIComponent(id)}`)).json();
}
export async function listDecisions(): Promise<DecisionSummary[]> {
  return (await fetch("/api/decisions")).json();
}
export async function listDocs(): Promise<DocEntry[]> {
  return (await fetch("/api/docs")).json();
}
export async function getDoc(path: string): Promise<string> {
  return (await fetch(`/api/docs/file?path=${encodeURIComponent(path)}`)).text();
}
export async function submitAnswer(screenId: string, inputs: Record<string, unknown>) {
  const client_submission_id = crypto.randomUUID();
  return (await fetch("/api/answer", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ screen_id: screenId, client_submission_id, inputs }),
  })).json();
}
export async function privateSave(screenId: string, name: string, path: string, contents: string) {
  return (await fetch("/api/private-save", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ screen_id: screenId, name, path, contents }),
  })).json();
}
export async function updateDecision(id: string, status: string, chosen_option?: string, note?: string) {
  return (await fetch(`/api/decisions/${encodeURIComponent(id)}`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ status, chosen_option, note }),
  })).json();
}
