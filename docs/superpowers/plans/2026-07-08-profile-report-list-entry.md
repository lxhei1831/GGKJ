# Profile Report List Entry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move report history into a "我的检测报告" function entry and keep only the latest three reports on the detection page.

**Architecture:** Add a dedicated report list page that reads all saved local reports and navigates to the existing report detail page. Profile becomes a compact function menu; detect keeps a three-item preview plus a button into the full report list.

**Tech Stack:** WeChat Mini Program JavaScript/WXML/WXSS, local report storage via `services/reportStore.js`.

---

### Task 1: Tests

**Files:**
- Modify: `tests/profileContent.test.js`
- Modify: `tests/reportHistoryPages.test.js`

- [ ] Assert profile menus include `我的检测报告` immediately after `我的TRO案件`.
- [ ] Assert profile no longer renders a standalone `最近检测报告` section.
- [ ] Assert detect loads only three reports and has a button to `/pages/profile-reports/profile-reports`.
- [ ] Assert a new `profile-reports` page is registered and renders saved reports.

### Task 2: Implement Navigation

**Files:**
- Modify: `data/mock.js`
- Modify: `pages/profile/profile.js`
- Modify: `pages/profile/profile.wxml`
- Create: `pages/profile-reports/profile-reports.*`
- Modify: `app.json`
- Modify: `pages/detect/detect.js`
- Modify: `pages/detect/detect.wxml`
- Modify: `pages/detect/detect.wxss`

- [ ] Insert the report menu after the TRO menu.
- [ ] Remove the profile standalone recent report section.
- [ ] Create the report list page with rows opening `report-detail`.
- [ ] Limit detect recent reports to 3 and add a full-list button.

### Task 3: Verification

- [ ] Run affected tests.
- [ ] Run all tests.
- [ ] Run JS syntax checks and `git diff --check`.
