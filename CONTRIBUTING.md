# Contributing

Thanks for improving MicroManus.

## Development workflow

1. Use Node.js 22 and install dependencies with `npm ci`.
2. Copy `.env.example` to `.env.local` and use test/development credentials only.
3. Create a focused branch and keep unrelated changes separate.
4. Run the quality gate before opening a pull request:

   ```bash
   npm run check
   npm run test:integration
   npm run test:e2e
   ```

Database integration tests create isolated temporary rows and remove them afterward. Browser tests use mocked HTTP boundaries and never call paid model APIs.

## Pull requests

Describe the problem, the implementation, security or migration impact, and verification performed. Include screenshots for visible UI changes. Never commit `.env` files, API keys, database passwords, test reports, or provider credentials.

## Database changes

Change `prisma/schema.prisma`, generate a named migration, inspect its SQL, and verify `npx prisma migrate deploy` against a non-production database before release.
