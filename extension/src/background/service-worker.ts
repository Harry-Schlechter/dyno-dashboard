// Service worker — keeps the extension alive in the background.
// For now, just opens the side panel on action-icon click. Real work lands in later steps.

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((err) => console.warn('[dyno cockpit] sidePanel.setPanelBehavior failed', err));
});

chrome.action.onClicked.addListener((tab) => {
  if (tab.windowId !== undefined) {
    chrome.sidePanel.open({ windowId: tab.windowId }).catch((err) => {
      console.warn('[dyno cockpit] sidePanel.open failed', err);
    });
  }
});
