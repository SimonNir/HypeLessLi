document.addEventListener('DOMContentLoaded', async () => {
  const toggleSwitch = document.getElementById('extensionToggle');
  const statusText = document.getElementById('statusText');
  const sidebarToggle = document.getElementById('sidebarToggle');
  const helpBtn = document.getElementById('helpBtn');

  // Get current state with timeout fallback
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
            // Ensure we always have a response object
            resolve(response || { enabled: true });
          }
        });
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 2000)
      )
    ]);
    
    // Safe access with fallback
    const enabled = response && typeof response.enabled === 'boolean' ? response.enabled : true;
    
    // Update UI
    toggleSwitch.checked = enabled;
    statusText.textContent = enabled ? 'Active' : 'Disabled';
    sidebarToggle.disabled = !enabled;
    
  } catch (error) {
    console.error('Failed to get state:', error);
    statusText.textContent = 'Active'; // Default fallback
    // Default to enabled
    toggleSwitch.checked = true;
    sidebarToggle.disabled = false;
  }
  
  // Handle extension toggle
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
              // Ensure we always have a response object
              resolve(response || { enabled: newState });
            }
          });
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 2000)
        )
      ]);
      
      // Safe access with fallback
      const enabled = response && typeof response.enabled === 'boolean' ? response.enabled : newState;
      statusText.textContent = enabled ? 'Active' : 'Disabled';
      sidebarToggle.disabled = !enabled;
      
    } catch (error) {
      console.error('Failed to toggle extension:', error);
      statusText.textContent = newState ? 'Active' : 'Disabled'; // Optimistic update
      sidebarToggle.disabled = !newState;
      // Don't revert the toggle since we did optimistic update
    }
  });
  
  // Handle sidebar toggle
  sidebarToggle.addEventListener('click', () => {
    try {
      chrome.runtime.sendMessage({ type: 'toggleSidebar' });
      window.close(); // Close popup after action
    } catch (error) {
      console.error('Failed to toggle sidebar:', error);
    }
  });
  
  // Handle help button
  helpBtn.addEventListener('click', () => {
    chrome.tabs.create({
      url: 'https://github.com/SimonNir/HypeLessLi#how-to-use'
    });
    window.close();
  });
});