// OneSignal 알림은 2026-11-25부터 사용하지 않는다.
Deno.serve(() =>
  new Response(JSON.stringify({ error: 'disabled' }), {
    status: 410,
    headers: { 'Content-Type': 'application/json' },
  }),
)
