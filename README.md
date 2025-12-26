# Research Leap

A modern, fullstack todo application built with Next.js. Features type-safe RPC communication, MongoDB persistence, and a polished UI with dark/light theme support.

## Tech Stack

### Frontend

- **Next.js** - React framework with App Router
- **React** - UI library
- **Tailwind CSS** - Utility-first styling
- **Shadcn/ui** - Component library (Radix UI primitives)
- **TanStack React Query** - Server state management
- **Zustand** - Client state management
- **React Hook Form + Zod** - Form handling and validation
- **next-themes** - Dark/light mode support

### Backend

- **ORPC** - Type-safe RPC framework with OpenAPI generation
- **MongoDB** - Database
- **Mongoose** - ODM for MongoDB
- **Zod** - Schema validation

### Development

- **TypeScript** - Type safety
- **Jest** - Testing framework
- **ESLint + Prettier 3** - Code quality
- **Docker** - MongoDB containerization

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/[[...rest]]/    # Catch-all API route (ORPC + OpenAPI)
│   ├── layout.tsx          # Root layout with providers
│   └── todos/              # Todo pages
│       ├── page.tsx        # List view
│       └── [todoId]/       # Detail view
│
├── features/               # Feature modules
│   └── todos/
│       ├── server/         # ORPC router definitions
│       ├── hooks/          # React Query hooks
│       ├── views/          # Page components
│       └── components/     # Feature components
│
├── components/             # Shared components
│   ├── ui/                 # Shadcn/ui components
│   ├── headers/            # App header
│   ├── buttons/            # Reusable buttons
│   └── providers/          # Context providers
│
├── lib/                    # Core utilities
│   ├── db.ts               # MongoDB connection
│   ├── orpc/               # ORPC configuration
│   └── query/              # React Query setup
│
├── models/                 # TypeScript interfaces & Zod schemas
├── collections/            # Mongoose models
├── stores/                 # Zustand stores
└── hooks/                  # Shared React hooks
```

## Getting Started

### Prerequisites

- Node.js 18+
- Docker (for MongoDB)

### Installation

1. Clone the repository:

   ```bash
   git clone <repository-url>
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start MongoDB:

   ```bash
   docker-compose up -d
   ```

4. Start the development server:

   ```bash
   npm run dev
   ```

5. Open [https://<your domain name>:3000] in your browser.

## Available Scripts

| Script               | Description                    |
| -------------------- | ------------------------------ |
| `npm run dev`        | Start development server       |
| `npm run build`      | Lint and build for production  |
| `npm start`          | Start production server        |
| `npm run lint`       | Run ESLint                     |
| `npm run format`     | Format code with Prettier      |
| `npm test`           | Run tests                      |
| `npm run test:watch` | Run tests in watch mode        |
| `npm run mongo-gui`  | Start MongoDB GUI on port 3091 |

## API Documentation

The API is built with ORPC and automatically generates OpenAPI documentation.

- **Scalar**: Available at `/api` endpoint

## Architecture

### Feature-Based Organization

Code is organized by features rather than technical layers. Each feature contains its server logic, React hooks, views, and components in one place.

### Type-Safe RPC with ORPC

ORPC provides end-to-end type safety between client and server:

- Server procedures defined with Zod schemas
- Auto-generated TypeScript types for client
- OpenAPI spec generation for API documentation

### State Management Strategy

- **Server State**: TanStack React Query handles caching, synchronization, and background updates
- **Client State**: Zustand for lightweight UI state (theme, toggles)

### Component Library

Uses Shadcn/ui components built on Radix UI primitives:

- Fully accessible (WAI-ARIA compliant)
- Customizable with Tailwind CSS
- Headless architecture

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch
```

Tests use Jest with React Testing Library for component testing.

## Docker Services

```bash
# Start MongoDB
docker-compose up -d

# Stop MongoDB
docker-compose down

# View logs
docker-compose logs -f mongo
```
