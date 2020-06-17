"use strict";

const TIMELINE_ITEM_ROOT = document.querySelector("#discussion_bucket .js-discussion");

const Utils = {
    SYSTEM_IDS: ["yenkins", "gdgate"],
    BUTTON_COMMENT:
        ".discussion-timeline-actions > .timeline-new-comment #partial-new-comment-form-actions button.btn-primary",
    BUTTON_TEST: "gft-button-test",
    TEXTAREA_COMMENT_ID: "new_comment_field",
    TIMELINE_ITEM: ".js-timeline-item",
    TIMELINE_ITEM_AUTHOR:
        "div.timeline-comment > div.timeline-comment-header > h3.timeline-comment-header-text > strong > a.author",

    addTestButton: function (resultTable, testComment, autoRun) {
        var buttonTest = document.createElement("button");
        buttonTest.className = `${Utils.BUTTON_TEST} State State--green`;
        buttonTest.dataset.testComment = testComment;
        buttonTest.innerHTML = autoRun ? "Run failed tests again" : "Get failed tests";
        buttonTest.addEventListener("click", (e) =>
            Utils.getAutoRunConfig((items) => Utils.runFailedTests(e, items.autoRun)),
        );
        resultTable.parentElement.appendChild(buttonTest);
    },

    removeTestButtons: function () {
        const buttons = document.querySelectorAll(`.${Utils.BUTTON_TEST}`);
        for (const button of buttons) {
            button.remove();
        }
    },

    isGrapheneTest: function (table) {
        const firstColumn = table.querySelector("thead > tr > th");

        // Graphene  is 'Test'  | 'Status' | 'Duration' | Test link
        // Test-cafe is 'Suite' | 'Test'

        return firstColumn.textContent === "Test";
    },

    isSystemComment: function (timelineItem) {
        const authorComponent = timelineItem.querySelector(Utils.TIMELINE_ITEM_AUTHOR);
        return !authorComponent || Utils.SYSTEM_IDS.includes(authorComponent.textContent);
    },

    getAutoRunConfig: function (callback) {
        chrome.storage.sync.get(
            {
                autoRun: false,
            },
            callback,
        );
    },

    getTimelineItem: function (table) {
        const timelineItem = table.closest(Utils.TIMELINE_ITEM);
        return timelineItem;
    },

    getTimelineItemWithTestComment: function (timelineItem) {
        let previousTimelineItem = timelineItem.previousElementSibling;
        let testCommentComponent =
            previousTimelineItem && previousTimelineItem.querySelector(Graphene.TIMELINE_ITEM_TEST_SUITE);

        while (
            previousTimelineItem &&
            (Utils.isSystemComment(previousTimelineItem) ||
                !testCommentComponent ||
                !testCommentComponent.textContent.startsWith("extended test"))
        ) {
            previousTimelineItem = previousTimelineItem.previousElementSibling;
            testCommentComponent =
                previousTimelineItem && previousTimelineItem.querySelector(Graphene.TIMELINE_ITEM_TEST_SUITE);
        }

        return previousTimelineItem;
    },

    getTestResultTable: function (timelineItem) {
        const timelineItemContent = timelineItem.querySelector(
            ".TimelineItem > .TimelineItem-body > .timeline-comment",
        );
        const thead = timelineItemContent ? timelineItemContent.querySelector("table > thead") : null;
        return thead ? thead.parentElement : null;
    },

    runFailedTests: function (e, autoRun) {
        const commentBox = document.getElementById(Utils.TEXTAREA_COMMENT_ID);
        commentBox.value = e.target.dataset.testComment;

        const buttonComment = document.querySelector(Utils.BUTTON_COMMENT);
        buttonComment.removeAttribute("disabled");
        autoRun && buttonComment.click();
    },

    checkForFailedTests: function (timelineItem) {
        if (!Utils.isSystemComment(timelineItem)) {
            return;
        }

        const resultTable = Utils.getTestResultTable(timelineItem);
        if (!resultTable) {
            return;
        }

        let testComment;
        if (Utils.isGrapheneTest(resultTable)) {
            testComment = Graphene.getTestComment(resultTable);
        } else {
            testComment = TestCafe.getTestComment(resultTable);
        }

        if (testComment) {
            Utils.getAutoRunConfig((items) => Utils.addTestButton(resultTable, testComment, items.autoRun));
        }
    },

    scanForFailedTests: function () {
        for (const timelineItem of TIMELINE_ITEM_ROOT.children) {
            Utils.checkForFailedTests(timelineItem);
        }
    },
};

const Graphene = {
    COLUMN_NAME_INDEX: 0,
    COLUMN_STATUS_INDEX: 1,
    FAILED_TYPES: ["UNSTABLE", "FAILED", "ABORTED"],
    TIMELINE_ITEM_TEST_SUITE:
        "div.unminimized-comment > div.edit-comment-hide > task-lists > table > tbody > tr > td > p",

    getFailedTests: function (table) {
        const rows = table.querySelectorAll("tbody > tr");
        const failedTests = [];
        for (let index = 0; index < rows.length; index++) {
            const row = rows[index];
            const columns = row.children;
            if (Graphene.FAILED_TYPES.includes(columns[Graphene.COLUMN_STATUS_INDEX].textContent)) {
                failedTests.push(columns[Graphene.COLUMN_NAME_INDEX].textContent);
            }
        }
        return failedTests.join(",");
    },

    getFailedTestSuite: function (table) {
        const timelineItem = Utils.getTimelineItem(table);
        if (!timelineItem) {
            return;
        }

        const timelineItemWithTestComment = Utils.getTimelineItemWithTestComment(timelineItem);
        if (!timelineItemWithTestComment) {
            return;
        }

        const testCommentComponent = timelineItemWithTestComment.querySelector(
            Graphene.TIMELINE_ITEM_TEST_SUITE,
        );
        if (!testCommentComponent) {
            return;
        }

        let failedSuite = testCommentComponent.textContent;
        const filterIndex = failedSuite.indexOf(" - filter ");
        if (filterIndex !== -1) {
            failedSuite = failedSuite.substr(0, filterIndex);
        }

        return failedSuite;
    },

    getTestComment: function (table) {
        const failedTests = Graphene.getFailedTests(table);
        if (!failedTests) {
            return;
        }

        const failedSuite = Graphene.getFailedTestSuite(table);
        if (!failedSuite) {
            return;
        }

        return failedSuite + " - filter " + failedTests;
    },
};

const TestCafe = {
    COLUMN_SUITE_NAME_INDEX: 0,
    COLUMN_TEST_NAME_INDEX: 1,

    getFailedTestsAndSuites: function (table) {
        const rows = table.querySelectorAll("tbody > tr");
        const failedSuites = [];
        const failedTests = [];
        for (let index = 0; index < rows.length; index++) {
            const row = rows[index];
            const columns = row.children;

            const failedSuite = '"' + columns[TestCafe.COLUMN_SUITE_NAME_INDEX].textContent + '"';
            if (!failedSuites.includes(failedSuite)) {
                failedSuites.push(failedSuite);
            }

            let failedTest = '"' + columns[TestCafe.COLUMN_TEST_NAME_INDEX].textContent + '"';
            failedTests.push(failedTest);
        }
        return {
            failedSuiteCount: failedSuites.length,
            failedSuites: failedSuites.join(","),
            failedTests: failedTests.join(","),
        };
    },

    getTestComment: function (table) {
        const { failedSuiteCount, failedSuites, failedTests } = TestCafe.getFailedTestsAndSuites(table);
        if (failedSuiteCount === 0 || !failedTests) {
            return;
        }

        // run failed tests again if there is only one failed suite
        if (failedSuiteCount === 1) {
            return "extended test - testcafe - filter " + failedTests;
        }

        // run the failed suites again if there are many failed suites
        return "extended test - testcafe - suite " + failedSuites;
    },
};

// ==

const observer = new MutationObserver(watcherCallback);

// watch for DOM changes
function startWatcher() {
    const config = { childList: true };
    observer.observe(TIMELINE_ITEM_ROOT, config);
}

function stopWatcher() {
    observer.disconnect();
}

function watcherCallback(mutationsList, _observer) {
    for (let mutation of mutationsList) {
        for (const addedNode of mutation.addedNodes) {
            if (addedNode.classList && addedNode.classList.contains("js-timeline-item")) {
                Utils.checkForFailedTests(addedNode);
            }
        }
    }
}

function onMessageReceived(message) {
    if (message.command === "Get-Failed-Tests-Enabled") {
        Utils.scanForFailedTests();
        startWatcher();
    } else if (message.command === "Get-Failed-Tests-Disabled") {
        stopWatcher();
        Utils.removeTestButtons();
    }
}

// listen to message from background.js
// https://developer.chrome.com/extensions/messaging
// https://developer.chrome.com/extensions/examples/api/messaging/timer/page.js
chrome.runtime.onConnect.addListener(function (port) {
    port.onMessage.addListener(onMessageReceived);
});

// listen to message from popup.js
// https://developer.chrome.com/extensions/messaging
chrome.runtime.onMessage.addListener(onMessageReceived);
