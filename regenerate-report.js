import { config } from 'dotenv';
import OpenAI from 'openai';
import { pool } from './apps/workers/core/artifactStore.ts';
import { 
  calculateFinancialImpact, 
  generateFinancialJustification, 
  formatFinancialRange 
} from './apps/workers/core/riskCalculator.ts';

config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function log(...args) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [regenerate]`, ...args);
}

async function callOpenAIHighCapacity(model, prompt, tokenLimit = 16000) {
  log(`🤖 Calling ${model} with ${tokenLimit} token limit...`);
  
  const response = await openai.chat.completions.create({
    model: model,
    messages: [
      { role: 'system', content: `ROLE  
You are an elite due-diligence analyst hired by DealBrief.  
Your mandate is to surface *non-financial* risks for private and public companies, producing an audit-ready briefing that busy investors, M&A teams, and brokers can trust at first glance.

SCOPE OF ANALYSIS  
Investigate only through OSINT and other lawful public sources. Ignore purely financial metrics unless they materially affect the risks below.

1. Cybersecurity Exposure  
   • Breached data, leaked credentials, ransomware events  
   • Exposed infrastructure (open ports, misconfigured cloud buckets, outdated software)  

DELIVERABLE FORMAT  

0. **Executive Snapshot** – ≤150 words summarising the overall risk posture plus a 3-color (Green / Yellow / Red) *overall* rating.  
2. **Key Red Flags** – bullet list (≤8) of the most material issues that warrant immediate follow-up.  
3. **Detailed Findings** – subsections matching the focus areas above; for each finding, provide: What was found (technical), how threat actors use it (plain english), the business impact (plain english), and how to fix it (plain english)
4. **Appendix A – Source Index** – numbered list of every URL, title, and access date, in order of first citation.  
5. **Appendix B – Method & Coverage Gaps** – outline search terms used, APIs queried, and any areas where reliable data was unavailable.

WRITING & CITATION RULES  
- Plain English; no jargon, no speculation.  
- Every discrete claim **must** carry a superscript numeric citation that maps to Appendix A.  
- If sources conflict, note the conflict and default to the most recent or authoritative evidence.  
- Do not include AI-generated text as a citation.  

QUALITY CONTROLS  
- Cross-verify critical facts with ≥2 independent sources where possible.  
- Highlight any missing or ambiguous data as a "Coverage Gap" rather than guessing.  
- Strictly limit the briefing to facts discovered; do **not** extrapolate future performance.  

AUDIENCE  
Assume readers are smart business professionals with limited technical depth and <5 minutes to skim the briefing. Clarity and credibility outrank exhaustiveness.` },
      { role: 'user', content: prompt }
    ],
    max_tokens: tokenLimit
  });
  
  return response.choices[0].message.content || 'Report generation failed';
}

async function regenerateReportForScan(scanId, companyName, domain) {
  try {
    log(`🔄 Regenerating report for scan ${scanId} - ${companyName} (${domain})`);
    
    // Get scan findings data
    const artifactsResult = await pool.query(`
      SELECT * FROM artifacts 
      WHERE meta->>'scan_id' = $1
      ORDER BY severity DESC, created_at DESC
    `, [scanId]);
    
    log(`📊 Found ${artifactsResult.rows.length} artifacts for scan ${scanId}`);
    
    if (artifactsResult.rows.length === 0) {
      throw new Error(`No scan data found for scan ${scanId}`);
    }

    // Calculate financial impact
    const companyProfile = {
      industry: 'hospitality',
      hasCustomerData: true,
      isPublicCompany: false,
      regulatoryScope: ['GDPR', 'PCI-DSS']
    };
    
    const findingsForCalculation = artifactsResult.rows.map(finding => ({
      type: finding.type,
      severity: finding.severity,
      count: 1
    }));
    
    const financialCalculation = calculateFinancialImpact(findingsForCalculation, companyProfile);
    const financialJustification = generateFinancialJustification(financialCalculation);
    
    log(`💰 Financial impact calculated: ${formatFinancialRange(financialCalculation)}`);

    // Prepare findings summary (truncate if too large)
    const findingsSummary = artifactsResult.rows.slice(0, 30).map(finding => {
      const meta = finding.meta || {};
      return {
        type: finding.type,
        severity: finding.severity,
        description: finding.val_text?.substring(0, 200) + (finding.val_text?.length > 200 ? '...' : ''),
        source: finding.src_url,
        technical_details: {
          ip_address: meta.service_info?.ip || 'Unknown',
          port: meta.service_info?.port || 'Unknown',
          protocol: meta.service_info?.protocol || 'Unknown',
          product: meta.service_info?.product || 'Unknown'
        },
        scan_module: meta.tool || 'Unknown'
      };
    });

    const userPrompt = `Generate a due diligence briefing for ${companyName} (${domain}) based on cybersecurity reconnaissance data.

COMPANY: ${companyName}
DOMAIN: ${domain}
SCAN DATE: ${new Date().toISOString().split('T')[0]}
DATA SOURCES: Network scanning via Shodan and other OSINT tools
TOTAL FINDINGS: ${artifactsResult.rows.length} (showing top 30 most critical)

FINDINGS DATA:
${JSON.stringify(findingsSummary, null, 2)}

${financialJustification}

**CRITICAL REQUIREMENT:** Use the financial impact calculation above as the basis for all dollar amounts in your report. Do not create new financial estimates. Reference the specific data sources and methodology provided.

Follow the DealBrief format exactly. Focus on material business risks, not theoretical concerns. Use plain English and cite sources properly.`;

    // Generate report with o4-mini and higher token limit
    log(`🤖 Generating report with o4-mini (16K tokens)...`);
    const report = await callOpenAIHighCapacity('o4-mini', userPrompt, 16000);
    
    log(`✅ Report generated successfully - ${report.length} characters`);
    
    // Save the report back to the database
    const { insertArtifact } = await import('./apps/workers/core/artifactStore.ts');
    await insertArtifact({
      type: 'ai_reports_regenerated',
      val_text: `AI report regenerated successfully for ${companyName} using o4-mini`,
      severity: 'INFO',
      meta: {
        scan_id: scanId,
        openai_report: report,
        model_used: 'o4-mini',
        token_limit: 16000,
        company: companyName,
        domain: domain,
        timestamp: new Date().toISOString(),
        findings_count: artifactsResult.rows.length
      }
    });

    console.log('\n=== REGENERATED REPORT ===\n');
    console.log(report);
    console.log('\n=== END REPORT ===\n');
    
    return report;
    
  } catch (error) {
    log(`❌ Report regeneration failed:`, error.message);
    throw error;
  }
}

// Run the regeneration
const scanId = 'D3gt_E4tZx_';
const companyName = 'Lodging Source';
const domain = 'lodging-source.com';

regenerateReportForScan(scanId, companyName, domain)
  .then(() => {
    log('✅ Report regeneration completed successfully');
    process.exit(0);
  })
  .catch(error => {
    log('❌ Report regeneration failed:', error.message);
    process.exit(1);
  }); 