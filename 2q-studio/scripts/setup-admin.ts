import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

// Load .env.local
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupAdmin() {
  console.log("Setting up admin user 'quyen'...");
  const email = "quyen@2q.local";
  const password = "123456";

  // 1. Create User in auth.users
  const { data: userAuth, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // Auto confirm
  });

  if (authError) {
    if (authError.message.includes("User already registered")) {
      console.log("User 'quyen' already exists in Auth.");
    } else {
      console.error("Error creating auth user:", authError);
      process.exit(1);
    }
  } else {
    console.log("Auth user created successfully:", userAuth.user.id);
    
    // 2. Insert into public.profiles
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: userAuth.user.id,
        full_name: 'Admin Quyen',
        role: 'admin',
        is_active: true
      });
      
    if (profileError) {
      console.error("Error creating profile:", profileError);
    } else {
      console.log("Profile created successfully and assigned role 'admin'.");
    }
  }
}

setupAdmin();
