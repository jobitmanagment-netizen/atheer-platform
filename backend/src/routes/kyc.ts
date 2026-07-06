import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { query, withTransaction } from '../db/pool.js';
import { AppError } from '../lib/errors.js';

const submitKycSchema = z.object({
  fullName: z.string().min(1).max(200).trim(),
  dateOfBirth: z.string().optional(),
  nationality: z.string().optional(),
  documentType: z.enum(['passport', 'national_id', 'drivers_license']),
  documentNumber: z.string().min(1).max(100),
});

export async function registerKycRoutes(app: FastifyInstance) {
  app.post('/api/kyc/submit', {
    preHandler: app.requireAuth,
    schema: { tags: ['KYC'] },
  }, async (request) => {
    const userId = request.authUser!.sub;
    const payload = submitKycSchema.parse(request.body);

    const existing = await query(
      "SELECT id FROM kyc_submissions WHERE user_id = $1 AND status IN ('pending', 'under_review') LIMIT 1",
      [userId],
    );
    if (existing.rowCount) {
      throw new AppError('KYC submission already pending', 400, 'KYC_ALREADY_PENDING');
    }

    return withTransaction(userId, async (client) => {
      const result = await client.query(
        `INSERT INTO kyc_submissions (user_id, full_name, date_of_birth, nationality, document_type, document_number, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'pending')
         RETURNING *`,
        [userId, payload.fullName, payload.dateOfBirth || null, payload.nationality || null,
         payload.documentType, payload.documentNumber],
      );

      await client.query(
        "UPDATE users SET kyc_status = 'pending' WHERE id = $1",
        [userId],
      );

      await client.query(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, risk_level)
         VALUES ($1, 'KYC_SUBMIT', 'KYCSubmission', $2, $3, 'LOW')`,
        [userId, result.rows[0].id, JSON.stringify({ documentType: payload.documentType })],
      );

      return { submission: result.rows[0] };
    });
  });

  app.get('/api/kyc/status', {
    preHandler: app.requireAuth,
    schema: { tags: ['KYC'] },
  }, async (request) => {
    const userId = request.authUser!.sub;
    const user = await query('SELECT kyc_status, kyc_level FROM users WHERE id = $1 LIMIT 1', [userId]);
    const submissions = await query(
      "SELECT id, status, created_at, updated_at FROM kyc_submissions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 5",
      [userId],
    );
    return {
      kycStatus: user.rows[0]?.kyc_status || 'none',
      kycLevel: user.rows[0]?.kyc_level || 0,
      submissions: submissions.rows,
    };
  });

  app.post('/api/kyc/:id/upload', {
    preHandler: app.requireAuth,
    schema: { tags: ['KYC'] },
  }, async (request) => {
    const userId = request.authUser!.sub;
    const { id } = request.params as { id: string };
    const body = request.body as { documentType: string; url: string };

    const validTypes = ['document_front', 'document_back', 'selfie', 'proof_of_address'];
    if (!validTypes.includes(body.documentType)) {
      throw new AppError('Invalid document type', 400, 'INVALID_DOC_TYPE');
    }

    return withTransaction(userId, async (client) => {
      const fieldMap: Record<string, string> = {
        document_front: 'document_front_url',
        document_back: 'document_back_url',
        selfie: 'selfie_url',
        proof_of_address: 'proof_of_address_url',
      };

      await client.query(
        `UPDATE kyc_submissions SET ${fieldMap[body.documentType]} = $1 WHERE id = $2 AND user_id = $3`,
        [body.url, id, userId],
      );

      return { message: 'Document uploaded' };
    });
  });
}
