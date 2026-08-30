import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ROLES = ["super_admin", "admin", "cashier", "operations_manager", "accountant", "auditor"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) return json({ error: "Not authenticated" }, 401);

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Not authenticated" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: callerRoles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id);
    const isAdmin = (callerRoles ?? []).some(
      (r: { role: string }) => r.role === "super_admin" || r.role === "admin",
    );
    if (!isAdmin) return json({ error: "Admin access required" }, 403);

    const body = await req.json().catch(() => ({}));
    const action = body.action as string;

    if (action === "list") {
      const { data: profiles, error } = await admin
        .from("profiles")
        .select("user_id, name, email, is_active, created_at")
        .order("created_at", { ascending: false });
      if (error) return json({ error: error.message }, 400);
      const { data: roles } = await admin.from("user_roles").select("user_id, role");
      const users = (profiles ?? []).map((p) => ({
        ...p,
        roles: (roles ?? []).filter((r) => r.user_id === p.user_id).map((r) => r.role),
      }));
      return json({ users });
    }

    if (action === "create") {
      const { email, password, name, role } = body as Record<string, string>;
      if (!email || !password || !name) return json({ error: "Name, email and password are required" }, 400);
      if (password.length < 6) return json({ error: "Password must be at least 6 characters" }, 400);
      const finalRole = ROLES.includes(role) ? role : "cashier";

      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name },
      });
      if (createErr || !created.user) return json({ error: createErr?.message ?? "Could not create user" }, 400);

      const newId = created.user.id;
      await admin.from("profiles").update({ name, email }).eq("user_id", newId);
      await admin.from("user_roles").delete().eq("user_id", newId);
      await admin.from("user_roles").insert({ user_id: newId, role: finalRole });

      return json({ user: { user_id: newId, name, email, roles: [finalRole] } });
    }

    if (action === "update") {
      const { user_id, name, password, role, is_active } = body as Record<string, unknown>;
      if (!user_id) return json({ error: "Missing user" }, 400);
      const uid = String(user_id);

      if (typeof password === "string" && password.length > 0) {
        if (password.length < 6) return json({ error: "Password must be at least 6 characters" }, 400);
        const { error } = await admin.auth.admin.updateUserById(uid, { password });
        if (error) return json({ error: error.message }, 400);
      }
      const patch: Record<string, unknown> = {};
      if (typeof name === "string" && name) patch.name = name;
      if (typeof is_active === "boolean") patch.is_active = is_active;
      if (Object.keys(patch).length) await admin.from("profiles").update(patch).eq("user_id", uid);

      if (typeof role === "string" && ROLES.includes(role)) {
        await admin.from("user_roles").delete().eq("user_id", uid);
        await admin.from("user_roles").insert({ user_id: uid, role });
      }
      return json({ ok: true });
    }

    if (action === "delete") {
      const { user_id } = body as Record<string, string>;
      if (!user_id) return json({ error: "Missing user" }, 400);
      if (user_id === userData.user.id) return json({ error: "You cannot delete your own account" }, 400);
      const { error } = await admin.auth.admin.deleteUser(user_id);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unexpected error" }, 500);
  }
});
