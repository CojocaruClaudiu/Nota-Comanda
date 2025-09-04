# Nota-Comanda

Monorepo containing backend (Express + Prisma) and frontend (Vite + React + TypeScript) for managing clients, employees (with leave tracking), cars (fleet), and offers/orders.

## Structure
```
backend/   # Express REST API, Prisma ORM
frontend/  # Vite + React application (named Flota in code)
```

## Backend
Technologies:
- Node.js / Express
- Prisma (PostgreSQL assumed)
- TypeScript

### Setup
1. Install deps:
   - From repo root (installs root deps if any + may hoist):
     ```bash
     npm install
     ```
   - Or individually:
     ```bash
     cd backend && npm install
     ```
2. Copy environment:
   ```bash
   cp .env.example backend/.env
   ```
   Then edit values (DATABASE_URL, JWT_SECRET, etc).
3. Run migrations:
   ```bash
   npx prisma migrate deploy
   # or for dev to create new migrations (if schema changed)
   npx prisma migrate dev
   ```
4. (Optional) Seed data:
   ```bash
   npx ts-node prisma/seed.ts
   ```
5. Start API:
   ```bash
   npm run dev
   ```
   Default: http://localhost:4000

### Key Endpoints (partial)
- `GET /ping` health
- `/auth/*` authentication routes
- CRUD: `/clients`, `/employees`, `/cars`
- Leaves: `POST /employees/:id/leaves`, `GET /employees/:id/leaves`

## Frontend
Located in `frontend/` (or `Flota/` naming inside). Uses Vite.

### Setup & Run
```bash
cd frontend
npm install
npm run dev
```
App served (default) at: http://localhost:5173

Configure API base URL in any axios config file if needed (see `frontend/src/api/axios.ts`).

## Environment Variables
See `.env.example` for placeholders. Important:
- `DATABASE_URL` (PostgreSQL connection string)
- `PORT` (backend HTTP port)
- `JWT_SECRET` (auth signing secret)

## Development Notes
- Prisma schema in `backend/prisma/schema.prisma`
- Generated client is auto-used via `@prisma/client`
- Avoid committing real secrets—only `.env.example` is tracked.

## Scripts (backend/package.json)
Typical scripts you might add/use:
- `dev` - ts-node-dev / nodemon runner (verify actual script in `backend/package.json`)
- `build` - tsc compile
- `start` - node dist

## Contributing
1. Create feature branch
2. Commit with conventional style (feat:, fix:, chore:) when possible
3. Open PR

## License
Proprietary / Internal (adjust if open source later)
