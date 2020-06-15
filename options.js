// Saves options to chrome.storage
function save_options() {
    var autoRun = document.getElementById("autoRun").checked;
    chrome.storage.sync.set(
        {
            autoRun: autoRun,
        },
        function () {
            var status = document.getElementById("status");
            status.textContent = "Options saved!";
        },
    );
}

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
function restore_options() {
    chrome.storage.sync.get(
        {
            autoRun: false,
        },
        function (items) {
            document.getElementById("autoRun").checked = items.autoRun;
        },
    );
}

document.addEventListener("DOMContentLoaded", restore_options);
document.getElementById("save").addEventListener("click", save_options);
