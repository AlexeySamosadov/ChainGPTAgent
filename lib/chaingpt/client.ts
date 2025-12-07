// ChainGPT API Base URL (from docs: https://docs.chaingpt.org)
const BASE_URL = 'https://api.chaingpt.org';

export interface ChainGPTResponse<T> {
  status: string;
  data: T;
  message?: string;
}

export interface AuditResult {
  score: number;
  summary: string;
  vulnerabilities: Array<{
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    location?: string;
  }>;
}

export interface GeneratedContract {
  sourceCode: string;
  name: string;
  compilerVersion: string;
}

class ChainGPTClient {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async post(endpoint: string, body: any): Promise<any> {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ChainGPT API error: ${response.status} - ${errorText}`);
    }

    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  async generalChat(prompt: string, context?: string): Promise<string> {
    try {
      const fullPrompt = context
        ? `Context of previous conversation:\n${context}\n\nCurrent User Question: ${prompt}`
        : prompt;

      const response = await this.post('/chat/stream', {
        question: fullPrompt,
        stream: false,
        model: 'general_assistant'
      });
      return typeof response === 'string' ? response : JSON.stringify(response);
    } catch (error: any) {
      console.error('ChainGPT Chat Error:', error.response?.data || error.message);
      throw new Error('Failed to communicate with ChainGPT LLM');
    }
  }

  async auditContract(sourceCode: string): Promise<AuditResult> {
    try {
      const response = await this.post('/chat/stream', {
        question: `Audit this Solidity smart contract code and identify security vulnerabilities. Provide a risk score (0-100) and a summary. Code:\n${sourceCode}`,
        stream: false,
        model: 'smart_contract_auditor'
      });

      const text = typeof response === 'string' ? response : JSON.stringify(response);

      // Parse score from LLM response
      const score = this.parseAuditScore(text);
      const vulnerabilities = this.parseVulnerabilities(text);

      return {
        score,
        summary: text,
        vulnerabilities
      };
    } catch (error: any) {
      console.error('ChainGPT Audit Error:', error.response?.data || error.message);
      throw new Error('Failed to audit contract');
    }
  }

  private parseAuditScore(text: string): number {
    // Try to find score patterns like "Score: 85", "85/100", "risk score: 85"
    const patterns = [
      /(?:score|rating)[:\s]*(\d+)(?:\s*\/\s*100)?/i,
      /(\d+)\s*\/\s*100/,
      /(\d+)\s*(?:out of|of)\s*100/i,
      /(?:risk|security)\s*(?:score|rating)[:\s]*(\d+)/i
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const score = parseInt(match[1], 10);
        if (score >= 0 && score <= 100) {
          return score;
        }
      }
    }

    // If no score found, estimate based on severity keywords
    const criticalCount = (text.match(/critical/gi) || []).length;
    const highCount = (text.match(/high\s*(?:risk|severity)/gi) || []).length;
    const mediumCount = (text.match(/medium\s*(?:risk|severity)/gi) || []).length;
    const lowCount = (text.match(/low\s*(?:risk|severity)/gi) || []).length;

    // Calculate estimated score (higher = safer)
    let estimatedScore = 100 - (criticalCount * 25) - (highCount * 15) - (mediumCount * 5) - (lowCount * 2);
    return Math.max(0, Math.min(100, estimatedScore));
  }

  private parseVulnerabilities(text: string): Array<{ severity: 'low' | 'medium' | 'high' | 'critical'; description: string; location?: string }> {
    const vulnerabilities: Array<{ severity: 'low' | 'medium' | 'high' | 'critical'; description: string; location?: string }> = [];

    // Split text into lines and look for vulnerability patterns
    const lines = text.split('\n');
    let currentSeverity: 'low' | 'medium' | 'high' | 'critical' | null = null;

    for (const line of lines) {
      const lowerLine = line.toLowerCase();

      // Detect severity
      if (lowerLine.includes('critical')) {
        currentSeverity = 'critical';
      } else if (lowerLine.includes('high')) {
        currentSeverity = 'high';
      } else if (lowerLine.includes('medium')) {
        currentSeverity = 'medium';
      } else if (lowerLine.includes('low')) {
        currentSeverity = 'low';
      }

      // Look for vulnerability descriptions (lines starting with - or *)
      const vulnMatch = line.match(/^[\s]*[-*•]\s*(.+)/);
      if (vulnMatch && currentSeverity) {
        const description = vulnMatch[1].trim();
        if (description.length > 10) { // Filter out short/meaningless entries
          vulnerabilities.push({
            severity: currentSeverity,
            description
          });
        }
      }
    }

    return vulnerabilities;
  }

  async generateContract(description: string): Promise<GeneratedContract> {
    try {
      const response = await this.post('/chat/stream', {
        question: `Generate a Solidity smart contract for: ${description}. Return the code in a markdown block.`,
        stream: false,
        model: 'smart_contract_generator'
      });

      const text = typeof response === 'string' ? response : JSON.stringify(response);

      // Extract code block
      const codeMatch = text.match(/```solidity\n([\s\S]*?)```/) || text.match(/```\n([\s\S]*?)```/);
      const sourceCode = codeMatch ? codeMatch[1] : text;

      return {
        sourceCode,
        name: 'GeneratedContract',
        compilerVersion: '0.8.20'
      };
    } catch (error: any) {
      console.error('ChainGPT Generator Error:', error.response?.data || error.message);
      throw new Error('Failed to generate contract');
    }
  }
}

// Singleton instance (initialized with env var on server side)
export const chainGPT = new ChainGPTClient(process.env.CHAINGPT_API_KEY || '');
