/**
 * HypeLessLi LLM API Integration Module
 * Supports OpenAI, Anthropic, and Google's Gemini APIs
 */

class LLMSuggestionsAPI {
  constructor() {
    this.config = {
      provider: 'openai', // 'openai', 'anthropic', 'gemini'
      apiKey: null,
      model: 'gpt-4',
      maxTokens: 500,
      temperature: 0.3
    };
    this.loadConfig();
  }

  async loadConfig() {
    try {
      const result = await chrome.storage.local.get(['llmConfig']);
      if (result.llmConfig) {
        this.config = { ...this.config, ...result.llmConfig };
      }
    } catch (error) {
      console.warn('Failed to load LLM config:', error);
    }
  }

  async saveConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    try {
      await chrome.storage.local.set({ llmConfig: this.config });
    } catch (error) {
      console.error('Failed to save LLM config:', error);
    }
  }

  isConfigured() {
    return this.config.apiKey !== null && this.config.apiKey.trim() !== '';
  }

  async generateSuggestions(content, flaggedTerms = []) {
    if (!this.isConfigured()) {
      throw new Error('LLM API not configured. Please set up your API key in settings.');
    }

    const prompt = this.buildPrompt(content, flaggedTerms);
    
    try {
      switch (this.config.provider) {
        case 'openai':
          return await this.callOpenAI(prompt);
        case 'anthropic':
          return await this.callAnthropic(prompt);
        case 'gemini':
          return await this.callGemini(prompt);
        default:
          throw new Error(`Unsupported provider: ${this.config.provider}`);
      }
    } catch (error) {
      console.error('LLM API call failed:', error);
      throw error;
    }
  }

  buildPrompt(content, flaggedTerms) {
    const termsContext = flaggedTerms.length > 0 
      ? `The following hype/subjective terms were detected: ${flaggedTerms.join(', ')}.`
      : '';

    return `You are an expert scientific writing editor. Please analyze this LaTeX/academic text and suggest improvements to make it more objective, precise, and professional.

Focus on:
1. Replacing subjective/hype language with objective descriptions
2. Adding specific quantitative details where vague terms are used  
3. Improving clarity and precision
4. Maintaining the academic tone

${termsContext}

Text to improve:
"""
${content}
"""

Please provide 3-5 specific suggestions in JSON format:
{
  "suggestions": [
    {
      "original": "original problematic phrase",
      "improved": "suggested improvement", 
      "reason": "explanation of why this is better",
      "type": "hype_reduction|precision|clarity|objectivity"
    }
  ]
}`;
  }

  async callOpenAI(prompt) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: [
          { role: 'user', content: prompt }
        ],
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return this.parseSuggestions(data.choices[0].message.content);
  }

  async callAnthropic(prompt) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': this.config.apiKey,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: this.config.model || 'claude-3-sonnet-20240229',
        max_tokens: this.config.maxTokens,
        messages: [
          { role: 'user', content: prompt }
        ],
        temperature: this.config.temperature
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Anthropic API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return this.parseSuggestions(data.content[0].text);
  }

  async callGemini(prompt) {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${this.config.apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          { parts: [{ text: prompt }] }
        ],
        generationConfig: {
          maxOutputTokens: this.config.maxTokens,
          temperature: this.config.temperature
        }
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Gemini API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return this.parseSuggestions(data.candidates[0].content.parts[0].text);
  }

  parseSuggestions(responseText) {
    try {
      // Try to extract JSON from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed.suggestions || [];
      }
      
      // Fallback: parse structured text response
      return this.parseTextResponse(responseText);
    } catch (error) {
      console.warn('Failed to parse LLM response as JSON, attempting text parsing:', error);
      return this.parseTextResponse(responseText);
    }
  }

  parseTextResponse(text) {
    // Simple text parsing fallback
    const suggestions = [];
    const lines = text.split('\n').filter(line => line.trim());
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('original:') || line.includes('Original:')) {
        const original = line.replace(/.*original:\s*/i, '').replace(/["""]/g, '');
        const improved = lines[i + 1]?.replace(/.*improved:\s*/i, '').replace(/["""]/g, '') || '';
        const reason = lines[i + 2]?.replace(/.*reason:\s*/i, '').replace(/["""]/g, '') || '';
        
        if (original && improved) {
          suggestions.push({
            original: original.trim(),
            improved: improved.trim(),
            reason: reason.trim(),
            type: 'general'
          });
        }
      }
    }
    
    return suggestions;
  }

  // Settings UI helpers
  static getAvailableProviders() {
    return [
      { id: 'openai', name: 'OpenAI GPT', models: ['gpt-4', 'gpt-3.5-turbo'] },
      { id: 'anthropic', name: 'Anthropic Claude', models: ['claude-3-sonnet-20240229', 'claude-3-haiku-20240307'] },
      { id: 'gemini', name: 'Google Gemini', models: ['gemini-pro'] }
    ];
  }

  getConfigUI() {
    const providers = LLMSuggestionsAPI.getAvailableProviders();
    const currentProvider = providers.find(p => p.id === this.config.provider);
    
    return {
      provider: this.config.provider,
      apiKey: this.config.apiKey ? '••••••••' + this.config.apiKey.slice(-4) : '',
      model: this.config.model,
      availableProviders: providers,
      availableModels: currentProvider?.models || []
    };
  }
}

// Export for use in content script
window.LLMSuggestionsAPI = LLMSuggestionsAPI;