const SERVICE_ROLE_HEADER = 'Base44-Service-Authorization';

export async function requireAdminOrServiceRole(req: Request, base44: any, errorMessage = 'Forbidden: Admin or trusted automation required.') {
  try {
    const user = await base44.auth.me();
    if (user?.role === 'admin') {
      return { ok: true as const, mode: 'admin' as const, user };
    }

    if (user) {
      return {
        ok: false as const,
        mode: 'forbidden_user' as const,
        user,
        response: Response.json({ error: errorMessage }, { status: 403 }),
      };
    }
  } catch (_) {
    // No authenticated user attached to the request.
  }

  const serviceRoleHeader = req.headers.get(SERVICE_ROLE_HEADER) || '';
  if (serviceRoleHeader.startsWith('Bearer ')) {
    return { ok: true as const, mode: 'service_role' as const, user: null };
  }

  return {
    ok: false as const,
    mode: 'anonymous' as const,
    user: null,
    response: Response.json({ error: errorMessage }, { status: 403 }),
  };
}

export function isServiceRoleInvocation(req: Request) {
  const serviceRoleHeader = req.headers.get(SERVICE_ROLE_HEADER) || '';
  return serviceRoleHeader.startsWith('Bearer ');
}
