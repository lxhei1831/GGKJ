# USPTO PDF Risk Report Design

## Goal

Add a first-version US trademark risk report flow for the risk detection page. A user uploads their own trademark/product image and optional listing text. The cloud backend enriches the AI analysis with USPTO trademark candidates, compares the uploaded image against official candidate marks when available, and returns a PDF report file that the mini program can preview.

## Scope

- Support the risk detection page first, especially image recognition and product/link checks.
- Use the existing `aiGateway` cloud function as the backend entry point.
- Use USPTO trademark search data only for United States detections in this first version.
- Generate a PDF report after a successful AI risk detection.
- Leave Excel/batch report parsing out of this version.

## Data Flow

1. The user enters detection information and uploads their own image.
2. The mini program uploads selected images to WeChat Cloud Storage and calls `aiGateway`.
3. `aiGateway` resolves image file IDs to temporary URLs.
4. `aiGateway` asks the AI model to extract trademark search signals from the listing and uploaded image.
5. For US-market checks, `aiGateway` queries USPTO trademark search with extracted words and user-provided title/keywords.
6. `aiGateway` asks the AI model for a structured risk result using user data, image URLs, and USPTO candidates.
7. `aiGateway` generates a PDF report and uploads it to cloud storage.
8. The mini program shows the normal result plus a "view PDF report" action.

## Report Content

The PDF contains:

- Cover page with report title, target platform/market, generated date, and disclaimer.
- Uploaded image section with the user's image URLs and extracted visual/textual signals.
- USPTO candidate section with serial number, registration number, word mark, owner, status, goods/services summary, and source URL when present.
- Similarity analysis section covering wording, visual composition, protected elements, differences, and risk level.
- Action recommendations and evidence checklist.

## Error Handling

- If AI succeeds but USPTO lookup fails, return the AI result and include an empty `trademarkCandidates` list with a warning note.
- If PDF generation fails, return the normal AI result and set `pdfReportError` without blocking detection.
- If the AI cloud call fails entirely, existing local-rule fallback remains available and should still label output with `[本地规则]`.

## Testing

- Unit/static tests verify the frontend passes uploaded image IDs and can open the returned PDF.
- USPTO helper tests verify query payload building and candidate normalization.
- PDF helper tests verify a PDF buffer is created from structured report data.
- Cloud function scaffold tests verify USPTO, PDF generation, and upload hooks are present.
