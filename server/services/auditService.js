import AuditLog from '../models/AuditLog.js';

/**
 * Records a security or system event into the AuditLog collection
 *
 * @param {Object} param0
 * @param {string|null} param0.userId - User ID (or null)
 * @param {string} param0.action - Action identifier
 * @param {Object} param0.req - Express request object for IP and User-Agent extraction
 * @param {string} param0.status - 'SUCCESS' | 'FAILURE'
 * @param {Object} param0.details - Arbitrary details
 */
export const logAuditEvent = async ({ userId = null, action, req, status = 'SUCCESS', details = {} }) => {
  try {
    const ipAddress = req ? (req.ip || req.headers?.['x-forwarded-for'] || req.socket?.remoteAddress || req.connection?.remoteAddress || '127.0.0.1') : '127.0.0.1';
    const userAgent = req ? (req.headers?.['user-agent'] || '') : '';

    await AuditLog.create({
      userId,
      action,
      ipAddress,
      userAgent,
      status,
      details,
    });
  } catch (error) {
    // Non-blocking: Logging failure should not crash core user transaction
    console.error('[AuditLog Error] Failed to record audit log:', error.message);
  }
};
