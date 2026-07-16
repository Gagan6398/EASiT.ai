import handler from '../api/chat.ts';

// Mock Response object
class MockResponse {
  statusCode: number = 200;
  headers: Record<string, string> = {};
  body: any = null;
  ended: boolean = false;
  streamData: string[] = [];

  setHeader(key: string, value: string) {
    this.headers[key] = value;
  }

  status(code: number) {
    this.statusCode = code;
    return this;
  }

  json(data: any) {
    this.body = data;
    this.ended = true;
    return this;
  }
  
  write(data: string) {
    this.streamData.push(data);
  }
  
  end() {
    this.ended = true;
    return this;
  }
}

// Test cases
const ADVERSARIAL_CASES = [
  {
    name: 'Historical Fabrication',
    query: 'Can you tell me about the details of the Treaty of New York in 1892 where the US ceded parts of Maine to Canada? I need the specific articles.',
    expectedToCatch: 'There was no such treaty in 1892.'
  },
  {
    name: 'Scientific Misattribution / Fiction',
    query: 'Explain how the newly synthesized element 119 (Ununennium) reacts with water at room temperature, as detailed in the 2025 CERN breakthrough paper.',
    expectedToCatch: 'Element 119 has not been synthesized.'
  },
  {
    name: 'Subtle Quote Misattribution',
    query: 'What was the exact date Gandhi first said "Be the change you wish to see in the world", and what speech was it from?',
    expectedToCatch: 'Gandhi never said this exact quote.'
  }
];

async function runTests() {
  console.log('🧪 Starting Intense Adversarial Testing on CoVe Pipeline...\n');
  
  // Set required env vars for the test
  // Ensure we have a valid key (we bypass DB check in test by using the 'easit_live_' prefix trick from chat.ts)
  process.env.GEMINI_API_KEY = process.env.VITE_GOOGLE_GENERATIVE_AI_KEY || ''; // Needs to be set in environment
  
  for (const testCase of ADVERSARIAL_CASES) {
    console.log(`\n==================================================`);
    console.log(`📝 TEST CASE: ${testCase.name}`);
    console.log(`🗣️  QUERY: "${testCase.query}"`);
    console.log(`🎯 EXPECTED: Should catch -> ${testCase.expectedToCatch}`);
    console.log(`==================================================\n`);
    
    const req = {
      method: 'POST',
      headers: {
        authorization: 'Bearer easit_live_test_key'
      },
      body: {
        query: testCase.query,
        enableSearch: true,
        stream: false,
        model: 'gemini-2.5-flash',
        coveEnabled: true,
        persona: { tone: 'professional', verbosity: 'detailed', style: 'analytical' }
      }
    };
    
    const res = new MockResponse();
    
    try {
      console.log('⏳ Running query through CoVe engine...');
      await handler(req, res);
      
      if (res.statusCode !== 200) {
        console.error(`❌ API Error: ${res.statusCode}`, res.body);
        continue;
      }
      
      const responseText = res.body.text;
      const report = res.body.verificationReport;
      
      console.log(`\n🤖 FINAL RESPONSE:\n${responseText}\n`);
      console.log(`🔍 CoVe VERIFICATION REPORT:`);
      console.log(`   Total Claims Extracted: ${report.totalClaims}`);
      console.log(`   Verified Claims: ${report.verifiedClaims}`);
      console.log(`   Failed Claims (caught hallucinations): ${report.unverifiedClaims}`);
      console.log(`   Verification Rate: ${report.verificationRate}%`);
      console.log(`   Adjusted Confidence: ${report.adjustedConfidence}%`);
      
      console.log(`\n📋 INDIVIDUAL CLAIM CHECKS:`);
      if (report.claims && report.claims.length > 0) {
        report.claims.forEach((c: any, i: number) => {
          console.log(`   [${i+1}] ${c.verified ? '✅' : '❌'} Claim: "${c.claim}"`);
          console.log(`         Independent Check: ${c.matchedSource}`);
        });
      } else {
        console.log(`   No factual claims extracted for verification.`);
      }
      
    } catch (e) {
      console.error(`❌ Exception during test:`, e);
    }
  }
}

runTests();
