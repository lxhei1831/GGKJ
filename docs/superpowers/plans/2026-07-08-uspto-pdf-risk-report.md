# USPTO PDF Risk Report Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first-version US trademark risk report flow with USPTO candidates, AI visual comparison context, and a downloadable PDF report.

**Architecture:** Keep `pages/detect` as the UI entry, `services/riskEngine` as the frontend service boundary, and `cloudfunctions/aiGateway` as the backend orchestrator. Split USPTO lookup and PDF generation into focused cloud-function modules so the main handler stays understandable.

**Tech Stack:** WeChat Mini Program JavaScript, WeChat Cloud Functions, `wx-server-sdk`, OpenAI-compatible chat completions, USPTO trademark search endpoint, Node PDF generation.

---

### Task 1: Frontend PDF Entry Tests

**Files:**
- Modify: `tests/detectImageFlow.test.js`
- Modify: `tests/detectPageLoadResilience.test.js`

- [ ] Add assertions that the detect page stores `pdfReportFileID`, exposes a `viewPdfReport` method, downloads the cloud file, and calls `wx.openDocument`.
- [ ] Run: `node tests/detectImageFlow.test.js`
- [ ] Expected: FAIL because the PDF report entry does not exist yet.

### Task 2: Cloud USPTO Helper Tests

**Files:**
- Create: `tests/usptoTrademarkSearch.test.js`
- Create: `cloudfunctions/aiGateway/usptoSearch.js`

- [ ] Write tests for `buildTrademarkSearchTerms`, `buildUsptoSearchPayload`, and `normalizeTrademarkCandidates`.
- [ ] Run: `node tests/usptoTrademarkSearch.test.js`
- [ ] Expected: FAIL because the helper module does not exist yet.

### Task 3: PDF Helper Tests

**Files:**
- Create: `tests/pdfReportGenerator.test.js`
- Create: `cloudfunctions/aiGateway/pdfReport.js`

- [ ] Write a test that builds a sample report and asserts the returned buffer starts with `%PDF`.
- [ ] Run: `node tests/pdfReportGenerator.test.js`
- [ ] Expected: FAIL because the PDF helper module does not exist yet.

### Task 4: Implement USPTO Lookup

**Files:**
- Create: `cloudfunctions/aiGateway/usptoSearch.js`
- Modify: `cloudfunctions/aiGateway/index.js`

- [ ] Implement term extraction from product title, keywords, copy text, and AI-extracted signals.
- [ ] Implement a POST request to USPTO search with defensive timeout handling.
- [ ] Normalize candidates to a compact structure for AI and PDF.
- [ ] Run: `node tests/usptoTrademarkSearch.test.js`
- [ ] Expected: PASS.

### Task 5: Implement PDF Generation

**Files:**
- Create: `cloudfunctions/aiGateway/pdfReport.js`
- Modify: `cloudfunctions/aiGateway/package.json`
- Modify: `cloudfunctions/aiGateway/index.js`

- [ ] Add a Node PDF dependency and generate a multi-section report buffer.
- [ ] Upload the PDF buffer to cloud storage when detection completes.
- [ ] Return `pdfReportFileID`, `pdfReportCloudPath`, and `trademarkCandidates`.
- [ ] Run: `node tests/pdfReportGenerator.test.js`
- [ ] Expected: PASS.

### Task 6: Implement Frontend PDF Preview

**Files:**
- Modify: `pages/detect/detect.js`
- Modify: `pages/detect/detect.wxml`
- Modify: `pages/detect/detect.wxss`

- [ ] Add a result button for PDF when `result.pdfReportFileID` exists.
- [ ] Download the cloud PDF and call `wx.openDocument({ fileType: 'pdf' })`.
- [ ] Run: `node tests/detectImageFlow.test.js`
- [ ] Expected: PASS.

### Task 7: Full Verification

**Files:**
- Modify: `tests/cloudFunctionScaffold.test.js`

- [ ] Update scaffold assertions for USPTO and PDF hooks.
- [ ] Run every test file in `tests`.
- [ ] Expected: all tests pass.
