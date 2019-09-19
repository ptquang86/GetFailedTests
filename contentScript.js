// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

const FAILED_TYPES = ['UNSTABLE', 'FAILED', 'ABORTED'];

const TIMELINE_ITEM =
    'js-timeline-item js-timeline-progressive-focus-container';
const TIMELINE_ITEM_AUTHOR =
    'div.timeline-comment.current-user > div.timeline-comment-header > span';
const TIMELINE_ITEM_FIRST_CHILD = 'TimelineItem js-comment-container';
const TIMELINE_ITEM_TEST_SUITE =
    'div.unminimized-comment > div.edit-comment-hide > task-lists > table';
const TIMELINE_ITEM_TEST_SUITE_CONTENT = 'tbody > tr > td > p';

function getTable(e) {
    let table = e.target;
    while (table && table.tagName !== 'TABLE') {
        table = table.parentElement;
    }
    return table;
}

function getFailedTests(table) {
    const children = table.querySelector('tbody').children;
    const failedTests = [];
    for (let index = 0; index < children.length; index++) {
        const columns = children.item(index).children;
        // 0: name, 1: status
        if (FAILED_TYPES.indexOf(columns.item(1).textContent) !== -1) {
            failedTests.push(columns.item(0).textContent);
        }
    }
    return failedTests.join(',');
}

function getTimelineItem(table) {
    let timelineItem = table.parentElement;
    while (timelineItem && timelineItem.className !== TIMELINE_ITEM) {
        timelineItem = timelineItem.parentElement;
    }

    let previousTimelineItem = timelineItem.previousElementSibling;
    while (
        previousTimelineItem &&
        (previousTimelineItem.children[0].className !==
            TIMELINE_ITEM_FIRST_CHILD ||
            !previousTimelineItem.querySelector(TIMELINE_ITEM_AUTHOR))
    ) {
        previousTimelineItem = previousTimelineItem.previousElementSibling;
    }

    return previousTimelineItem;
}

function getFailedSuite(timelineItem) {
    const table = timelineItem.querySelector(TIMELINE_ITEM_TEST_SUITE);
    const suite = table.querySelector(TIMELINE_ITEM_TEST_SUITE_CONTENT);
    return suite.textContent;
}

document.body.addEventListener('click', e => {
    const table = getTable(e);
    if (!table || table.className !== '') {
        return;
    }

    const failedTests = getFailedTests(table);
    if (!failedTests) {
        return;
    }

    const timelineItem = getTimelineItem(table);
    if (!timelineItem) {
        return;
    }

    let failedSuite = getFailedSuite(timelineItem);
    if (!failedSuite) {
        return;
    }

    if (failedSuite.indexOf(' - filter ') !== -1) {
        failedSuite = failedSuite.substr(0, failedSuite.indexOf(' - filter '));
    }

    document.getElementById('new_comment_field').value =
        failedSuite + ' - filter ' + failedTests;
});
