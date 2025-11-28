import { SystemStatusClient } from './SystemStatusClient';

// Server-side environment data (secure - only first/last 4 chars shown)
function getEnvInfo() {
  const adminWarmupSecret = process.env.ADMIN_WARMUP_SECRET || '';
  const adminUser = process.env.ADMIN_USER || '';
  const adminPass = process.env.ADMIN_PASS || '';

  return {
    adminWarmupSecret: {
      isSet: !!adminWarmupSecret,
      length: adminWarmupSecret.length,
      first4: adminWarmupSecret.substring(0, 4) || 'N/A',
      last4: adminWarmupSecret.substring(adminWarmupSecret.length - 4) || 'N/A',
    },
    adminUser: {
      isSet: !!adminUser,
      length: adminUser.length,
      first4: adminUser.substring(0, 4) || 'N/A',
      last4: adminUser.substring(adminUser.length - 4) || 'N/A',
    },
    adminPass: {
      isSet: !!adminPass,
      length: adminPass.length,
      // Don't show any characters from password for security
      hint: adminPass ? `${adminPass.length} chars` : 'Not set',
    },
  };
}

export default function SystemStatusPage() {
  const envInfo = getEnvInfo();

  return <SystemStatusClient envInfo={envInfo} />;
}
