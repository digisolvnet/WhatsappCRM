import fs from 'fs';
import path from 'path';

const migrationsDir = path.resolve('supabase/migrations');
const superAdminFile = path.resolve('supabase/setup_super_admin.sql');
const outputFile = path.resolve('supabase/schema_all_in_one.sql');

const files = fs.readdirSync(migrationsDir)
  .filter(f => f.endsWith('.sql'))
  .sort();

let bundle = `-- ==============================================================================
-- DIGISOLVNET WhatsApp CRM — Complete All-In-One Schema & Super Admin Provisioning
-- Run this single script in Supabase SQL Editor on a fresh project.
-- ==============================================================================
`;

for (const file of files) {
  const filePath = path.join(migrationsDir, file);
  const content = fs.readFileSync(filePath, 'utf8');
  bundle += `\n\n-- ==============================================================================\n`;
  bundle += `-- MIGRATION: ${file}\n`;
  bundle += `-- ==============================================================================\n\n`;
  bundle += content;
}

if (fs.existsSync(superAdminFile)) {
  const adminContent = fs.readFileSync(superAdminFile, 'utf8');
  bundle += `\n\n-- ==============================================================================\n`;
  bundle += `-- PROVISION SUPER ADMIN: support@digisolvnet.com\n`;
  bundle += `-- ==============================================================================\n\n`;
  bundle += adminContent;
}

fs.writeFileSync(outputFile, bundle, 'utf8');
console.log(`Generated ${outputFile} (${Math.round(bundle.length / 1024)} KB)`);
