# Security policy

## Reporting a vulnerability

Please do not open a public issue for suspected vulnerabilities or exposed credentials. Contact the repository owner privately through their GitHub profile with a concise reproduction and impact assessment.

## Supported version

Security fixes are applied to the latest commit on `main`.

## Secrets and user data

- LLM credentials are encrypted with AES-256-GCM before database storage.
- Stripe webhook signatures are verified before payment state changes.
- Every user resource is ownership-scoped at the server boundary.
- Private and reserved network targets are blocked for research page reads.
- `.env` files and generated test artifacts are excluded from Git and deployment uploads.

If a credential is accidentally shared, rotate it immediately. Removing it from a later commit does not remove it from Git history.
