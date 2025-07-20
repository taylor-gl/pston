#!/usr/bin/env node

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function makeAdmin() {
  const email = process.argv[2];

  if (!email) {
    console.error('Error: Email address is required');
    console.log('Usage: npm run make-admin <email>');
    console.log('Example: npm run make-admin test@gmail.com');
    process.exit(1);
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    console.error('Error: Invalid email format');
    process.exit(1);
  }

  console.log(`Making ${email} an admin...`);

  const sql = `
    INSERT INTO public.user_roles (user_id, role_id) 
    SELECT au.id, r.id 
    FROM auth.users au, public.roles r 
    WHERE au.email = '${email}' AND r.name = 'admin' 
    ON CONFLICT DO NOTHING;
  `;

  const command = `psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "${sql}"`;

  try {
    const { stdout, stderr } = await execAsync(command);

    if (stdout.includes('INSERT 0 1')) {
      console.log('Successfully made the user an admin.');
    } else if (stdout.includes('INSERT 0 0')) {
      console.log(
        'No changes made. Does the user exist with that email? Is the user already an admin?'
      );
    } else {
      console.log('Result:', stdout.trim());
    }

    if (stderr && !stderr.includes('NOTICE')) {
      console.error('Warning:', stderr.trim());
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

makeAdmin();
