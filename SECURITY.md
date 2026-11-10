# Security Policy

Humpy Calculator is a fully static website (HTML, CSS, JavaScript). It has no server code,
no database, no accounts and no API keys, and calculator inputs never leave the visitor's browser.

## Reporting a vulnerability

Please report security problems **privately** and do not open a public GitHub issue.

- Email: humpycalculator@gmail.com (subject: "Security report")
- Include the page address, the steps to reproduce, and what you expected to happen.

We will reply as soon as we can and will credit you if you wish. Please give us a reasonable
amount of time to fix the problem before you share it publicly.

## What is in scope

- Cross-site scripting (XSS) or anything that bypasses the Content-Security-Policy
- Problems with the security headers in `_headers`
- Anything that exposes developer files or secrets through the live site

## Notes for contributors

- Never commit passwords, API keys or private files. Only the public website files belong in this repo.
- Do not add inline `<script>`, `onclick="..."` or `style="..."`; the policy blocks them.
- See section 7 of `README.md` for the full list of protections and rules for new code.
