const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  const email = 'quyen@2q.local';
  const password = '123456';

  console.log(`Attempting to register ${email}...`);
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: 'Quoc Quyen'
      }
    }
  });

  if (error) {
    console.error('Error registering:', error.message);
  } else {
    console.log('Success!', data.user.id);
  }
}

main();
