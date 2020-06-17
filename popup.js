function getFailedTests() {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
        chrome.tabs.sendMessage(tabs[0].id, { command: "Get-Failed-Tests-Enabled" });
    });
}

document.getElementById("getFailedTests").addEventListener("click", getFailedTests);
