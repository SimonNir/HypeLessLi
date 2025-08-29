// Background script to manage extension state

// Initialize default state on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ hypeLessEnabled: true });
});

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

  // --- Get current extension state ---
  if (message.type === 'getState') {
    chrome.storage.local.get(['hypeLessEnabled']).then(result => {
      const enabled = result.hypeLessEnabled !== undefined ? result.hypeLessEnabled : true;
      sendResponse({ enabled });
    }).catch(error => {
      console.error('Error getting state:', error);
      sendResponse({ enabled: true }); // fallback
    });
    return true; // keep channel open for async
  }

  // --- Toggle extension on/off ---
  else if (message.type === 'toggleExtension') {
    chrome.storage.local.get(['hypeLessEnabled']).then(async result => {
      const currentState = result.hypeLessEnabled !== undefined ? result.hypeLessEnabled : true;
      const newState = !currentState;

      try {
        await chrome.storage.local.set({ hypeLessEnabled: newState });

        // Notify all tabs of the state change
        const tabs = await chrome.tabs.query({});
        for (const tab of tabs) {
          if (tab.id) {
            chrome.tabs.sendMessage(tab.id, { 
              type: 'stateChanged', 
              enabled: newState 
            }).catch(() => {}); // silently ignore if content script not loaded
          }
        }

        sendResponse({ enabled: newState });
      } catch (error) {
        console.error('Error toggling extension:', error);
        sendResponse({ enabled: currentState });
      }
    }).catch(error => {
      console.error('Error in toggle:', error);
      sendResponse({ enabled: true });
    });
    return true; // async response
  }

  // --- Toggle sidebar ---
  else if (message.type === 'toggleSidebar') {
    chrome.tabs.query({ active: true, currentWindow: true }).then(tabs => {
      const tab = tabs[0];
      if (!tab || !tab.id || !tab.url.startsWith('http')) return;

      // Only attempt to send a message if content script is loaded
      chrome.tabs.sendMessage(tab.id, { type: 'toggleSidebar' }).catch(() => {
        // silently ignore "Receiving end does not exist"
      });
    }).catch(console.error);
  }
});
