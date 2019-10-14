'use strict';

// == Selectors

const TIMELINE_ITEM = '.js-timeline-item';
const TIMELINE_ITEM_AUTHOR =
    'div.timeline-comment > div.timeline-comment-header > h3.timeline-comment-header-text > strong > a.author';
const TIMELINE_ITEM_TEST_SUITE =
    'div.unminimized-comment > div.edit-comment-hide > task-lists > table > tbody > tr > td > p';

const TEXTAREA_COMMENT_ID = 'new_comment_field';
const BUTTON_COMMENT =
    '.discussion-timeline-actions > .timeline-new-comment #partial-new-comment-form-actions button.btn-primary';

const Utils = {
    SYSTEM_IDS: ['yenkins', 'gdgate'],
    isGrapheneTest: function(table) {
        const firstColumn = table.querySelector('thead > tr > th');

        // Graphene  is 'Test'  | 'Status' | 'Duration' | Test link
        // Test-cafe is 'Suite' | 'Test'

        return firstColumn.textContent === 'Test';
    },
    isSystemComment: function(timelineItem) {
        const authorComponent = timelineItem.querySelector(
            TIMELINE_ITEM_AUTHOR
        );
        return (
            !authorComponent ||
            Utils.SYSTEM_IDS.includes(authorComponent.textContent)
        );
    },
    getResultTable: function(e) {
        const table = e.target.closest('table');
        return table;
    },
    getTimelineItem: function(table) {
        const timelineItem = table.closest(TIMELINE_ITEM);
        return timelineItem;
    },
    getTimelineItemWithTestComment: function(timelineItem) {
        let previousTimelineItem = timelineItem.previousElementSibling;
        while (
            previousTimelineItem &&
            Utils.isSystemComment(previousTimelineItem)
        ) {
            previousTimelineItem = previousTimelineItem.previousElementSibling;
        }

        return previousTimelineItem;
    }
};

const Graphene = {
    COLUMN_NAME_INDEX: 0,
    COLUMN_STATUS_INDEX: 1,
    FAILED_TYPES: ['UNSTABLE', 'FAILED', 'ABORTED'],
    getFailedTests: function(table) {
        const rows = table.querySelectorAll('tbody > tr');
        const failedTests = [];
        for (let index = 0; index < rows.length; index++) {
            const row = rows[index];
            const columns = row.children;
            if (
                Graphene.FAILED_TYPES.includes(
                    columns[Graphene.COLUMN_STATUS_INDEX].textContent
                )
            ) {
                failedTests.push(
                    columns[Graphene.COLUMN_NAME_INDEX].textContent
                );
            }
        }
        return failedTests.join(',');
    },
    getFailedTestSuite: function(table) {
        const timelineItem = Utils.getTimelineItem(table);
        if (!timelineItem) {
            return;
        }

        const timelineItemWithTestComment = Utils.getTimelineItemWithTestComment(
            timelineItem
        );
        if (!timelineItemWithTestComment) {
            return;
        }

        const testCommentComponent = timelineItemWithTestComment.querySelector(
            TIMELINE_ITEM_TEST_SUITE
        );
        if (!testCommentComponent) {
            return;
        }

        let failedSuite = testCommentComponent.textContent;
        const filterIndex = failedSuite.indexOf(' - filter ');
        if (filterIndex !== -1) {
            failedSuite = failedSuite.substr(0, filterIndex);
        }

        return failedSuite;
    },
    getTestComment: function(table) {
        const failedTests = Graphene.getFailedTests(table);
        if (!failedTests) {
            return;
        }

        const failedSuite = Graphene.getFailedTestSuite(table);
        if (!failedSuite) {
            return;
        }

        return failedSuite + ' - filter ' + failedTests;
    }
};

const TestCafe = {
    COLUMN_SUITE_NAME_INDEX: 0,
    COLUMN_TEST_NAME_INDEX: 1,
    getFailedTestsAndSuites: function(table) {
        const rows = table.querySelectorAll('tbody > tr');
        const failedSuites = [];
        const failedTests = [];
        for (let index = 0; index < rows.length; index++) {
            const row = rows[index];
            const columns = row.children;

            const failedSuite =
                '"' +
                columns[TestCafe.COLUMN_SUITE_NAME_INDEX].textContent +
                '"';
            if (!failedSuites.includes(failedSuite)) {
                failedSuites.push(failedSuite);
            }

            let failedTest =
                '"' +
                columns[TestCafe.COLUMN_TEST_NAME_INDEX].textContent +
                '"';
            failedTests.push(failedTest);
        }
        return {
            failedSuiteCount: failedSuites.length,
            failedSuites: failedSuites.join(','),
            failedTests: failedTests.join(',')
        };
    },
    getTestComment: function(table) {
        const {
            failedSuiteCount,
            failedSuites,
            failedTests
        } = TestCafe.getFailedTestsAndSuites(table);
        if (failedSuiteCount === 0 || !failedTests) {
            return;
        }

        // run failed tests again if there is only one failed suite
        if (failedSuiteCount === 1) {
            return 'extended test - testcafe - filter ' + failedTests;
        }

        // run the failed suites again if there are many failed suites
        return 'extended test - testcafe - suite ' + failedSuites;
    }
};

function onClick(e) {
    const table = Utils.getResultTable(e);
    // result table must have thead
    if (!table || !table.querySelector('thead')) {
        return;
    }

    let testComment;
    if (Utils.isGrapheneTest(table)) {
        testComment = Graphene.getTestComment(table);
    } else {
        testComment = TestCafe.getTestComment(table);
    }

    if (!testComment) {
        return;
    }

    document.getElementById(TEXTAREA_COMMENT_ID).value = testComment;

    // enable button Comment
    const buttonComment = document.querySelector(BUTTON_COMMENT);
    buttonComment.removeAttribute('disabled');
}

document.body.addEventListener('click', onClick);
