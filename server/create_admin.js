const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const requiredEnv = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'ADMIN_NAME', 'ADMIN_EMAIL', 'ADMIN_PASSWORD'];
const missingEnv = requiredEnv.filter(name => !process.env[name]);
if (missingEnv.length > 0) {
  console.error(`Missing required environment variables: ${missingEnv.join(', ')}`);
  process.exit(1);
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const { data: existingUser, error: lookupError } = await supabase
    .from('users')
    .select('id')
    .eq('email', process.env.ADMIN_EMAIL)
    .maybeSingle();

  if (lookupError) throw lookupError;
  if (existingUser) throw new Error('An account with ADMIN_EMAIL already exists.');

  const password = await bcrypt.hash(process.env.ADMIN_PASSWORD, 12);
  const { data, error } = await supabase
    .from('users')
    .insert([{
      name: process.env.ADMIN_NAME,
      email: process.env.ADMIN_EMAIL,
      password,
      role: 'ADMIN',
      status: 'active',
      created_at: new Date().toISOString()
    }])
    .select('id')
    .single();

  if (error) throw error;
  console.log(`Admin user created with ID ${data.id}.`);
}

main().catch(error => {
  console.error('Failed to create admin user:', error.message);
  process.exitCode = 1;
});
