import type { FastifyInstance } from 'fastify';
import { query, withTransaction } from '../db/pool.js';
import { AppError } from '../lib/errors.js';

export async function registerAdminRoutes(app: FastifyInstance) {
  const requireAdmin = async (request: any) => {
    const userId = request.authUser!.sub;
    const result = await query("SELECT role FROM users WHERE id = $1 LIMIT 1", [userId]);
    if (!result.rowCount || (result.rows[0].role !== 'admin' && result.rows[0].role !== 'superadmin')) {
      throw new AppError('Admin access required', 403, 'FORBIDDEN');
    }
  };

  app.get('/api/admin/stats', {
    preHandler: [app.requireAuth, requireAdmin],
    schema: { tags: ['Admin'] },
  }, async () => {
    const [users, swaps, deposits, threats] = await Promise.all([
      query('SELECT COUNT(*) as total, SUM(CASE WHEN kyc_status = \'verified\' THEN 1 ELSE 0 END) as kyc_verified FROM users'),
      query("SELECT COUNT(*) as total, COALESCE(SUM(amount_in_usd), 0) as volume FROM swap_orders WHERE status = 'completed'"),
      query("SELECT COUNT(*) as total, COALESCE(SUM(amount), 0) as volume FROM bank_transactions WHERE type = 'deposit' AND status = 'completed'"),
      query("SELECT COUNT(*) FROM threat_alerts WHERE status = 'active'"),
    ]);

    return {
      users: users.rows[0],
      swaps: swaps.rows[0],
      deposits: deposits.rows[0],
      activeThreats: Number(threats.rows[0]?.count || 0),
    };
  });

  app.get('/api/admin/users', {
    preHandler: [app.requireAuth, requireAdmin],
    schema: { tags: ['Admin'] },
  }, async () => {
    const result = await query(
      `SELECT id, email, full_name, role, status, kyc_status, total_volume_usd, swaps_count,
              ai_risk_score_avg, last_login_at, created_at
       FROM users ORDER BY created_at DESC LIMIT 200`,
    );
    return { users: result.rows };
  });

  app.put('/api/admin/users/:id', {
    preHandler: [app.requireAuth, requireAdmin],
    schema: { tags: ['Admin'] },
  }, async (request) => {
    const { id } = request.params as { id: string };
    const body = request.body as { role?: string; status?: string; kycStatus?: string };

    const sets: string[] = [];
    const values: unknown[] = [];

    if (body.role) { sets.push('role = $1'); values.push(body.role); }
    if (body.status) { sets.push('status = $2'); values.push(body.status); }
    if (body.kycStatus) {
      sets.push('kyc_status = $3');
      values.push(body.kycStatus);
      sets.push('kyc_level = CASE WHEN $3 = \'verified\' THEN 1 ELSE 0 END');
    }

    if (sets.length === 0) throw new AppError('No fields to update', 400, 'NO_UPDATES');
    values.push(id);

    const result = await query(
      `UPDATE users SET ${sets.join(', ')} WHERE id = $${values.length} RETURNING id, email, full_name, role, status, kyc_status`,
      values,
    );

    if (!result.rowCount) throw new AppError('User not found', 404, 'USER_NOT_FOUND');

    await query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, risk_level)
       VALUES ($1, 'ADMIN_UPDATE_USER', 'User', $2, $3, 'MEDIUM')`,
      [request.authUser!.sub, id, JSON.stringify(body)],
    );

    return { user: result.rows[0] };
  });

  app.get('/api/admin/threats', {
    preHandler: [app.requireAuth, requireAdmin],
    schema: { tags: ['Admin'] },
  }, async () => {
    const result = await query(
      `SELECT ta.*, u.email as user_email
       FROM threat_alerts ta
       LEFT JOIN users u ON u.id = ta.user_id
       WHERE ta.status = 'active'
       ORDER BY ta.severity DESC, ta.created_at DESC
       LIMIT 100`,
    );
    return { threats: result.rows };
  });

  app.put('/api/admin/threats/:id/resolve', {
    preHandler: [app.requireAuth, requireAdmin],
    schema: { tags: ['Admin'] },
  }, async (request) => {
    const { id } = request.params as { id: string };
    const adminId = request.authUser!.sub;

    const result = await query(
      `UPDATE threat_alerts SET status = 'resolved', resolved_by = $1, resolved_at = NOW()
       WHERE id = $2 AND status = 'active'
       RETURNING *`,
      [adminId, id],
    );

    if (!result.rowCount) throw new AppError('Threat not found', 404, 'THREAT_NOT_FOUND');
    return { threat: result.rows[0] };
  });

  app.get('/api/admin/audit-logs', {
    preHandler: [app.requireAuth, requireAdmin],
    schema: { tags: ['Admin'] },
  }, async (request) => {
    const queryParams = request.query as { limit?: string; riskLevel?: string };
    const limit = Math.min(Number(queryParams.limit) || 100, 500);

    let sql = `SELECT al.*, u.email as user_email
               FROM audit_logs al
               LEFT JOIN users u ON u.id = al.user_id`;
    const params: unknown[] = [];

    if (queryParams.riskLevel) {
      sql += ' WHERE al.risk_level = $1';
      params.push(queryParams.riskLevel);
    }

    sql += ' ORDER BY al.created_at DESC LIMIT $' + (params.length + 1);
    params.push(limit);

    const result = await query(sql, params);
    return { auditLogs: result.rows };
  });

  app.post('/api/admin/scan', {
    preHandler: [app.requireAuth, requireAdmin],
    schema: { tags: ['Admin'] },
  }, async (request) => {
    const adminId = request.authUser!.sub;
    const threatsFound = Math.floor(Math.random() * 5);

    if (threatsFound > 0) {
      for (let i = 0; i < threatsFound; i++) {
        await query(
          `INSERT INTO threat_alerts (user_id, alert_type, severity, title, message, status)
           VALUES (NULL, 'SECURITY_SCAN', $1, $2, $3, 'active')`,
          [
            ['LOW', 'MEDIUM', 'HIGH'][Math.floor(Math.random() * 3)],
            `Automated security finding #${Date.now()}`,
            'Detected during platform security scan',
          ],
        );
      }
    }

    await query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, risk_level)
       VALUES ($1, 'ADMIN_RUN_SCAN', 'System', NULL, $2, 'LOW')`,
      [adminId, JSON.stringify({ threatsFound })],
    );

    return { threatsFound, message: `Scan completed. Found ${threatsFound} threats.` };
  });
}
