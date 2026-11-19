// STAGING PREVIEW ONLY: the live auth-code function is disabled here.
// Sign-in is disabled in this staging copy; this endpoint never
// mints Firebase tokens or sends email.
export async function onRequest() {
  return new Response(JSON.stringify({ ok: false, error: "disabled in preview" }),
    { status: 410, headers: { "content-type": "application/json" } });
}
