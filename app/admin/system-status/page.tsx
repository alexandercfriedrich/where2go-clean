import { SystemStatusClient } from './SystemStatusClient';

// Server-side environment data (secure - minimal info exposed)
function getEnvInfo() {
  const adminWarmupSecret = process.env.ADMIN_WARMUP_SECRET || '';
  const adminUser = process.env.ADMIN_USER || '';
  const adminPass = process.env.ADMIN_PASS || '';

  return {
    adminWarmupSecret: {
      isSet: !!adminWarmupSecret,
      length: adminWarmupSecret.length,
      // Show first4/last4 only for the secret token - needed for admin to verify correct token
      // This matches the existing /api/debug/env endpoint behavior
      first4: adminWarmupSecret.substring(0, 4) || 'N/A',
      last4: adminWarmupSecret.substring(adminWarmupSecret.length - 4) || 'N/A',
    },
    adminUser: {
      isSet: !!adminUser,
      length: adminUser.length,
      // Don't expose username characters to prevent enumeration attacks
    },
    adminPass: {
      isSet: !!adminPass,
      length: adminPass.length,
      // Don't show any characters from password for security
    },
  };
}

export default function SystemStatusPage() {
  const envInfo = getEnvInfo();

  return <SystemStatusClient envInfo={envInfo} />;
}
