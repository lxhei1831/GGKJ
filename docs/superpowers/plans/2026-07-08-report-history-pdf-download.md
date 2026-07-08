# Report History PDF Download Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users download/view the generated PDF from both the current detection result and saved report history.

**Architecture:** Store each detection as a local record containing both summary fields and the full result payload. Add a `report-detail` mini program page that reads a saved record by ID, renders the complete report, and reuses the same cloud PDF download/open flow.

**Tech Stack:** WeChat Mini Program JavaScript/WXML/WXSS, local storage via `wx.getStorageSync`, existing `wx.cloud.downloadFile` and `wx.openDocument`.

---

### Task 1: Report Store Behavior

**Files:**
- Modify: `tests/reportStore.test.js`
- Modify: `services/reportStore.js`

- [ ] Add failing tests that saved records include `payload`, `result`, `pdfReportFileID`, `pdfReportCloudPath`, `trademarkCandidates`, and can be read by `getReportById`.
- [ ] Implement `getReportById` and persist full report fields while keeping summary fields.
- [ ] Run `node tests/reportStore.test.js`.

### Task 2: Report Detail Page

**Files:**
- Create: `pages/report-detail/report-detail.js`
- Create: `pages/report-detail/report-detail.wxml`
- Create: `pages/report-detail/report-detail.wxss`
- Create: `pages/report-detail/report-detail.json`
- Modify: `app.json`
- Modify: `tests/reportHistoryPages.test.js`

- [ ] Add failing static tests that the route is registered and the page loads a report by ID.
- [ ] Implement detail page rendering and PDF download/open action.
- [ ] Run `node tests/reportHistoryPages.test.js`.

### Task 3: Clickable History Rows

**Files:**
- Modify: `pages/detect/detect.js`
- Modify: `pages/detect/detect.wxml`
- Modify: `pages/profile/profile.js`
- Modify: `pages/profile/profile.wxml`
- Modify: `tests/reportHistoryPages.test.js`

- [ ] Add failing tests that recent report rows call `openReportDetail`.
- [ ] Implement navigation to `/pages/report-detail/report-detail?id=...`.
- [ ] Run `node tests/reportHistoryPages.test.js`.

### Task 4: Full Verification

**Files:**
- All changed test files.

- [ ] Run every file under `tests/*.test.js`.
- [ ] Run syntax checks for changed JavaScript pages and services.
