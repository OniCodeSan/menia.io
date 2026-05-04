// DEPRECATED — All token spending now goes through atomic DB RPCs:
// rpc_subscribe, rpc_unlock_content, rpc_paid_message, rpc_donate, rpc_live_access
// These RPCs enforce platform fee, holding period, and fraud checks atomically.
// This endpoint is kept only to return a clear error if anything still calls it.

Deno.serve(async (_req) => {
  return Response.json({
    error: 'This endpoint is deprecated. Use the atomic RPC functions instead.',
    hint: 'rpc_subscribe, rpc_unlock_content, rpc_paid_message, rpc_donate, rpc_live_access',
  }, { status: 410 });
});
