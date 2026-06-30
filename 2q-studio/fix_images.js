const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const r2Domain = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;

async function main() {
  if (!r2Domain) {
    console.error("Missing NEXT_PUBLIC_R2_PUBLIC_URL in .env.local");
    return;
  }

  // Find all images with null public_url
  const { data: images, error: fetchErr } = await supabase
    .from('product_images')
    .select('id, r2_key')
    .is('public_url', null);
    
  if (fetchErr) {
    console.error("Error fetching images:", fetchErr);
    return;
  }
  
  if (images.length === 0) {
    console.log("No images with null public_url found.");
    return;
  }
  
  console.log(`Found ${images.length} images with missing public_url. Fixing...`);
  
  for (const img of images) {
    const publicUrl = `${r2Domain}/${img.r2_key}`;
    const { error: updateErr } = await supabase
      .from('product_images')
      .update({ public_url: publicUrl })
      .eq('id', img.id);
      
    if (updateErr) {
      console.error(`Failed to update image ${img.id}:`, updateErr);
    } else {
      console.log(`Fixed image ${img.id} -> ${publicUrl}`);
    }
  }
  
  console.log("Done fixing images!");
}

main();
