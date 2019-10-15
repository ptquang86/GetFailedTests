('use strict');

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

// Called when the user clicks on the browser action.
chrome.browserAction.onClicked.addListener(function(tab) {
    isEnabled = !isEnabled;

    // send message to contentScript.js
    // https://developer.chrome.com/extensions/messaging
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        chrome.tabs.sendMessage(
            tabs[0].id,
            {
                command: isEnabled
                    ? 'Get-Failed-Tests-Enabled'
                    : 'Get-Failed-Tests-Disabled'
            },
            function(response) {
                if (response.status === 'ok') {
                    updateBadge();
                }
            }
        );
    });
});
