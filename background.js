// Background script to manage extension state
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ hypeLessEnabled: true });
});

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'getState') {
    chrome.storage.local.get(['hypeLessEnabled']).then(result => {
      const enabled = result.hypeLessEnabled !== undefined ? result.hypeLessEnabled : true;
      sendResponse({ enabled: enabled });
    }).catch(error => {
      console.error('Error getting state:', error);
      sendResponse({ enabled: true }); // Default fallback
    });
    return true; // Keep channel open for async response
  } 
  else if (message.type === 'toggleExtension') {
    chrome.storage.local.get(['hypeLessEnabled']).then(async result => {
      const currentState = result.hypeLessEnabled !== undefined ? result.hypeLessEnabled : true;
      const newState = !currentState;
      
      try {
        await chrome.storage.local.set({ hypeLessEnabled: newState });
        
        // Notify all tabs of the state change
        const tabs = await chrome.tabs.query({});
        for (const tab of tabs) {
          try {
            chrome.tabs.sendMessage(tab.id, { 
              type: 'stateChanged', 
              enabled: newState 
            });
          } catch (e) {
            // Tab might not have content script, ignore
          }
        }
        
        sendResponse({ enabled: newState });
      } catch (error) {
        console.error('Error toggling extension:', error);
        sendResponse({ enabled: currentState }); // Revert on error
      }
    }).catch(error => {
      console.error('Error in toggle:', error);
      sendResponse({ enabled: true }); // Default fallback
    });
    return true;
  }
  else if (message.type === 'toggleSidebar') {
    // Get current active tab and send message
    chrome.tabs.query({active: true, currentWindow: true}).then(tabs => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'toggleSidebar' }).catch(e => {
          console.error('Failed to toggle sidebar:', e);
        });
      }
    });
    // Don't need to send response for this one
  }
});