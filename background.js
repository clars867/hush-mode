// Relay popup commands to the active tab and keep simple state in storage.
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === 'GET_ACTIVE_TAB_ID') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      sendResponse({ tabId: tabs?.[0]?.id });
    });
    return true;
  }
});
