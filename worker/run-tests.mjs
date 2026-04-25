import fs from 'fs';
import path from 'path';

// --- CONFIGURATION ---
const API_URL = 'https://rolesnap-worker.samuelcmbah.workers.dev/api/parse'; 
const SAMPLES_DIR = './test-samples';
const RESULTS_DIR = './test-results';

async function runTests() {
  console.log('🚀 Starting RoleSnap AI Stress Test...');

  // 1. Get all sample files
  const files = fs.readdirSync(SAMPLES_DIR).filter(f => f.endsWith('.txt'));
  
  if (files.length === 0) {
    console.error('❌ No sample files found in /test-samples');
    return;
  }

  for (const file of files) {
    const filePath = path.join(SAMPLES_DIR, file);
    const rawText = fs.readFileSync(filePath, 'utf8');

    console.log(`\n📄 Processing: ${file}...`);

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: rawText,
          sourceUrl: `Test Suite: ${file}`
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }

      const result = await response.json();

      // 2. Save the result to a JSON file
      const resultFileName = file.replace('.txt', '.json');
      const resultPath = path.join(RESULTS_DIR, resultFileName);
      
      fs.writeFileSync(resultPath, JSON.stringify(result, null, 2));
      console.log(`✅ Saved to ${resultPath}`);

    } catch (error) {
      console.error(`❌ Failed to process ${file}:`, error.message);
    }

    // 3. Small delay to be kind to Groq's free tier rate limit
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log('\n🏁 ALL TESTS COMPLETE. Check the /test-results folder.');
}

runTests();