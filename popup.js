document.addEventListener('DOMContentLoaded', async () => {
  // Element references
  const toggleSwitch = document.getElementById('extensionToggle');
  const statusText = document.getElementById('statusText');
  const sidebarToggle = document.getElementById('sidebarToggle');
  const testHighlighting = document.getElementById('testHighlighting');
  
  // Tab management
  const tabs = document.querySelectorAll('.tab');
  const tabContents = document.querySelectorAll('.tab-content');
  
  // AI configuration elements
  const aiProvider = document.getElementById('aiProvider');
  const aiModel = document.getElementById('aiModel');
  const apiKey = document.getElementById('apiKey');
  const testAPI = document.getElementById('testAPI');
  const apiStatus = document.getElementById('apiStatus');
  const suggestionStyle = document.getElementById('suggestionStyle');
  const saveAIConfig = document.getElementById('saveAIConfig');
  
  // Help elements
  const githubLink = document.getElementById('githubLink');
  const supportLink = document.getElementById('supportLink');
  const overleafNotice = document.getElementById('overleaf-notice');
  
  let currentTab = 'main';
  let llmConfig = {};

  // Initialize UI
  await initializeUI();

  // Tab switching
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabId = tab.dataset.tab;
      switchTab(tabId);
    });
  });

  function switchTab(tabId) {
    // Update tab buttons
    tabs.forEach(t => t.classList.remove('active'));
    document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
    
    // Update content
    tabContents.forEach(content => content.classList.remove('active'));
    document.getElementById(`${tabId}-tab`).classList.add('active');
    
    currentTab = tabId;
    
    // Load tab-specific data
    if (tabId === 'ai') {
      loadAIConfiguration();
    }
  }

  async function initializeUI() {
    // Check if we're on Overleaf
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs[0] && tabs[0].url && tabs[0].url.includes('overleaf.com')) {
        overleafNotice.style.display = 'block';
      }
    } catch (error) {
      console.warn('Could not check current tab:', error);
    }

    // Get current extension state
    try {
      const response = await Promise.race([
        new Promise((resolve, reject) => {
          if (!chrome.runtime || !chrome.runtime.sendMessage) {
            reject(new Error('Chrome runtime not available'));
            return;
          }
          
          chrome.runtime.sendMessage({ type: 'getState' }, (response) => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              resolve(response || { enabled: true });
            }
          });
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 2000)
        )
      ]);
      
      const enabled = response && typeof response.enabled === 'boolean' ? response.enabled : true;
      
      // Update UI
      toggleSwitch.checked = enabled;
      statusText.textContent = enabled ? 'Active' : 'Disabled';
      sidebarToggle.disabled = !enabled;
      testHighlighting.disabled = !enabled;
      
    } catch (error) {
      console.error('Failed to get state:', error);
      statusText.textContent = 'Active';
      toggleSwitch.checked = true;
      sidebarToggle.disabled = false;
      testHighlighting.disabled = false;
    }

    // Load LLM configuration
    await loadAIConfiguration();
  }

  // Main tab functionality
  toggleSwitch.addEventListener('change', async () => {
    const newState = toggleSwitch.checked;
    statusText.textContent = 'Updating...';
    
    try {
      const response = await Promise.race([
        new Promise((resolve, reject) => {
          if (!chrome.runtime || !chrome.runtime.sendMessage) {
            reject(new Error('Chrome runtime not available'));
            return;
          }
          
          chrome.runtime.sendMessage({ type: 'toggleExtension' }, (response) => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              resolve(response || { enabled: newState });
            }
          });
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 2000)
        )
      ]);
      
      const enabled = response && typeof response.enabled === 'boolean' ? response.enabled : newState;
      statusText.textContent = enabled ? 'Active' : 'Disabled';
      sidebarToggle.disabled = !enabled;
      testHighlighting.disabled = !enabled;
      
    } catch (error) {
      console.error('Failed to toggle extension:', error);
      statusText.textContent = newState ? 'Active' : 'Disabled';
      sidebarToggle.disabled = !newState;
      testHighlighting.disabled = !newState;
    }
  });
  
  sidebarToggle.addEventListener('click', () => {
    try {
      chrome.runtime.sendMessage({ type: 'toggleSidebar' });
      window.close();
    } catch (error) {
      console.error('Failed to toggle sidebar:', error);
    }
  });

  testHighlighting.addEventListener('click', async () => {
    testHighlighting.textContent = 'Testing...';
    testHighlighting.disabled = true;
    
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]) {
        // Inject a test script to force highlighting
        await chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          func: () => {
            // Trigger a re-scan if the extension is loaded
            if (window.hypeLessLiActivated) {
              window.dispatchEvent(new CustomEvent('hypeless-rescan'));
            }
          }
        });
        
        setTimeout(() => {
          testHighlighting.textContent = '🔍 Test on Current Page';
          testHighlighting.disabled = false;
        }, 1000);
      }
    } catch (error) {
      console.error('Failed to test highlighting:', error);
      testHighlighting.textContent = '🔍 Test on Current Page';
      testHighlighting.disabled = false;
    }
  });

  // AI Configuration functionality
  const modelOptions = {
    openai: ['gpt-4', 'gpt-3.5-turbo', 'gpt-4-turbo-preview'],
    anthropic: ['claude-3-sonnet-20240229', 'claude-3-haiku-20240307', 'claude-2.1'],
    gemini: ['gemini-pro', 'gemini-pro-vision']
  };

  aiProvider.addEventListener('change', () => {
    const provider = aiProvider.value;
    aiModel.innerHTML = '';
    
    modelOptions[provider].forEach(model => {
      const option = document.createElement('option');
      option.value = model;
      option.textContent = model;
      aiModel.appendChild(option);
    });
    
    // Set default model
    aiModel.value = modelOptions[provider][0];
  });

  async function loadAIConfiguration() {
    try {
      const result = await chrome.storage.local.get(['llmConfig']);
      llmConfig = result.llmConfig || {
        provider: 'openai',
        model: 'gpt-4',
        apiKey: '',
        suggestionStyle: 'moderate'
      };
      
      // Update UI
      aiProvider.value = llmConfig.provider;
      aiProvider.dispatchEvent(new Event('change')); // Trigger model update
      aiModel.value = llmConfig.model;
      apiKey.value = llmConfig.apiKey ? '••••••••' + llmConfig.apiKey.slice(-4) : '';
      suggestionStyle.value = llmConfig.suggestionStyle || 'moderate';
      
      updateAPIStatus();
      
    } catch (error) {
      console.error('Failed to load AI config:', error);
    }
  }

  function updateAPIStatus() {
    if (!llmConfig.apiKey || llmConfig.apiKey.trim() === '') {
      apiStatus.textContent = 'API key not configured';
      apiStatus.className = 'api-status disconnected';
    } else {
      apiStatus.textContent = `Connected to ${llmConfig.provider}`;
      apiStatus.className = 'api-status connected';
    }
  }

  testAPI.addEventListener('click', async () => {
    const currentApiKey = apiKey.value;
    
    // Don't test if showing masked key
    if (currentApiKey.startsWith('••••')) {
      alert('Please enter your actual API key to test the connection.');
      return;
    }
    
    if (!currentApiKey.trim()) {
      alert('Please enter an API key first.');
      return;
    }
    
    apiStatus.textContent = 'Testing connection...';
    apiStatus.className = 'api-status testing';
    testAPI.disabled = true;
    
    try {
      // Create a minimal test configuration
      const testConfig = {
        provider: aiProvider.value,
        model: aiModel.value,
        apiKey: currentApiKey,
        maxTokens: 50,
        temperature: 0.1
      };
      
      // Test the API with a simple prompt
      const isValid = await testAPIConnection(testConfig);
      
      if (isValid) {
        apiStatus.textContent = 'Connection successful!';
        apiStatus.className = 'api-status connected';
      } else {
        apiStatus.textContent = 'Connection failed - check your API key';
        apiStatus.className = 'api-status disconnected';
      }
    } catch (error) {
      console.error('API test failed:', error);
      apiStatus.textContent = 'Connection failed: ' + error.message;
      apiStatus.className = 'api-status disconnected';
    } finally {
      testAPI.disabled = false;
    }
  });

  async function testAPIConnection(config) {
    const testPrompt = "Say 'test successful' if you receive this message.";
    
    try {
      let response;
      
      switch (config.provider) {
        case 'openai':
          response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${config.apiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: config.model,
              messages: [{ role: 'user', content: testPrompt }],
              max_tokens: config.maxTokens,
              temperature: config.temperature
            })
          });
          break;
          
        case 'anthropic':
          response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'x-api-key': config.apiKey,
              'Content-Type': 'application/json',
              'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
              model: config.model,
              max_tokens: config.maxTokens,
              messages: [{ role: 'user', content: testPrompt }],
              temperature: config.temperature
            })
          });
          break;
          
        case 'gemini':
          response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${config.apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: testPrompt }] }],
              generationConfig: {
                maxOutputTokens: config.maxTokens,
                temperature: config.temperature
              }
            })
          });
          break;
          
        default:
          throw new Error('Unknown provider');
      }
      
      return response.ok;
    } catch (error) {
      throw new Error(`API test failed: ${error.message}`);
    }
  }

  saveAIConfig.addEventListener('click', async () => {
    const newApiKey = apiKey.value;
    
    // Update config object
    llmConfig = {
      provider: aiProvider.value,
      model: aiModel.value,
      apiKey: newApiKey.startsWith('••••') ? llmConfig.apiKey : newApiKey, // Keep existing if masked
      suggestionStyle: suggestionStyle.value,
      temperature: suggestionStyle.value === 'conservative' ? 0.1 : 
                  suggestionStyle.value === 'moderate' ? 0.3 : 0.5,
      maxTokens: 500
    };
    
    try {
      await chrome.storage.local.set({ llmConfig });
      updateAPIStatus();
      
      // Show success feedback
      const originalText = saveAIConfig.textContent;
      saveAIConfig.textContent = 'Saved!';
      saveAIConfig.style.background = '#28a745';
      
      setTimeout(() => {
        saveAIConfig.textContent = originalText;
        saveAIConfig.style.background = '';
      }, 2000);
      
    } catch (error) {
      console.error('Failed to save AI config:', error);
      alert('Failed to save configuration. Please try again.');
    }
  });

  // Help tab functionality
  githubLink.addEventListener('click', () => {
    chrome.tabs.create({
      url: 'https://github.com/SimonNir/HypeLessLi#readme'
    });
    window.close();
  });

  supportLink.addEventListener('click', () => {
    chrome.tabs.create({
      url: 'https://github.com/SimonNir/HypeLessLi/issues'
    });
    window.close();
  });
});