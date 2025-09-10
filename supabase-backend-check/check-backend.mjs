import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

// Load environment variables
config();

const { SUPABASE_URL, SUPABASE_ANON_KEY, EVENT_CODE } = process.env;

// Validate required environment variables
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env file');
  process.exit(1);
}

console.log('🚀 Starting Supabase Storage backend check...');
console.log(`📁 Event code: ${EVENT_CODE}`);

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkStorageBackend() {
  try {
    // Create temp file
    const tmpDir = './tmp';
    const tmpFile = join(tmpDir, 'test.txt');
    const fileContent = 'hello from cursor';
    
    // Ensure tmp directory exists
    mkdirSync(tmpDir, { recursive: true });
    
    // Write test file
    writeFileSync(tmpFile, fileContent);
    console.log('✅ Created temp file: ./tmp/test.txt');

    // Generate timestamp for unique filename
    const timestamp = Date.now();
    const fileName = `${timestamp}-test.txt`;
    const filePath = `${EVENT_CODE}/${fileName}`;

    // Upload file to Supabase Storage
    console.log(`📤 Uploading to storage path: ${filePath}`);
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('media')
      .upload(filePath, fileContent, {
        contentType: 'text/plain',
        upsert: false
      });

    if (uploadError) {
      console.error('❌ Upload failed:', uploadError);
      process.exit(1);
    }

    console.log('✅ File uploaded successfully:', uploadData.path);

    // List objects in the event folder
    console.log(`📋 Listing objects in folder: ${EVENT_CODE}/`);
    const { data: listData, error: listError } = await supabase.storage
      .from('media')
      .list(EVENT_CODE, { limit: 1000 });

    if (listError) {
      console.error('❌ List failed:', listError);
      process.exit(1);
    }

    console.log('📁 Objects in folder:');
    listData.forEach(obj => {
      console.log(`  - ${obj.name} (${obj.size} bytes, ${obj.created_at})`);
    });

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('media')
      .getPublicUrl(filePath);

    console.log('🔗 Public URL:', urlData.publicUrl);

    // Test public access
    console.log('🌐 Testing public access...');
    const response = await fetch(urlData.publicUrl, { method: 'HEAD' });
    
    if (response.ok) {
      console.log(`✅ Public access confirmed! HTTP Status: ${response.status}`);
      console.log('🎉 Supabase Storage backend is working correctly!');
    } else {
      console.error(`❌ Public access failed! HTTP Status: ${response.status}`);
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    process.exit(1);
  }
}

// Run the test
checkStorageBackend();
