('use strict');

let currentTabId;
let isEnabled = false;

function updateBadge() {
    if (isEnabled) {
        chrome.browserAction.setBadgeText({ text: 'ON' });
        chrome.browserAction.setBadgeBackgroundColor({
            color: '#c62828'
        });
    } else {
        chrome.browserAction.setBadgeText({ text: '' });
        chrome.browserAction.setBadgeBackgroundColor({
            color: '#e0e0e0'
        });
    }
}

// send message to contentScript.js
// https://developer.chrome.com/extensions/messaging
// https://developer.chrome.com/extensions/examples/api/messaging/timer/popup.js
function sendMessageToContentScript() {
    var port = chrome.tabs.connect(currentTabId);
    port.postMessage({
        command: isEnabled
            ? 'Get-Failed-Tests-Enabled'
            : 'Get-Failed-Tests-Disabled'
    });
    updateBadge();
}

// toggle GFTs on icon clicked
// Called when the user clicks on the browser action.
chrome.browserAction.onClicked.addListener(function(_tab) {
    isEnabled = !isEnabled;
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        currentTabId = tabs[0].id;
        sendMessageToContentScript();
    });
});

// deactive GFTs on tab switched
// https://developer.chrome.com/extensions/tabs#event-onActivated
chrome.tabs.onActivated.addListener(function(activeInfo) {
    if (isEnabled) {
        isEnabled = false;
        sendMessageToContentScript();
        currentTabId = activeInfo.tabId;
    }
});
