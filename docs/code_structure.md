# Code Structure for Rote (Next.js)

This document outlines the high-level design and code structure for the Rote application, which will be built using Next.js and PostgreSQL.

## 1. Technology Stack

- **Framework**: Next.js 14.2.3
- **Database**: PostgreSQL 16.2
- **Authentication**: NextAuth.js
- **ORM**: Prisma
- **Styling**: Tailwind CSS

## 2. Project Structure

```
/app
  /api
    /auth
      /[...nextauth]
        /route.ts
    /content
      /route.ts
      /[id]
        /route.ts
    /recite
      /today
        /route.ts
      /[id]
        /route.ts
  /auth
    /login
      /page.tsx
    /register
      /page.tsx
  /dashboard
    /page.tsx
  /content
    /page.tsx
    /[id]
      /page.tsx
  /recite
    /page.tsx
  /layout.tsx
  /page.tsx
/components
  /ui
    /Button.tsx
    /Input.tsx
    /Card.tsx
  /Navbar.tsx
  /Footer.tsx
/lib
  /auth.ts
  /db.ts
  /prisma.ts
  /sm2.ts
/prisma
  /schema.prisma
  /migrations
.env.local
next.config.js
package.json
```

## 3. Component Hierarchy

- **`layout.tsx`**: The root layout of the application. It will include the `Navbar` and `Footer` components.
- **`Navbar.tsx`**: The navigation bar of the application. It will display different links based on whether the user is authenticated or not.
- **`Footer.tsx`**: The footer of the application.
- **`page.tsx`**: The landing page of the application.
- **`/dashboard/page.tsx`**: The user's dashboard, which will display a summary of their recitation progress.
- **`/content/page.tsx`**: A page that displays a list of all the user's content.
- **`/content/[id]/page.tsx`**: A page that displays a specific piece of content.
- **`/recite/page.tsx`**: The recitation page, where the user can practice reciting content scheduled for today.
- **`/auth/login/page.tsx`**: The login page.
- **`/auth/register/page.tsx`**: The register page.

## 4. API Routes

The API routes will be implemented using Next.js API Routes.

- **`/api/auth/[...nextauth]/route.ts`**: This will handle user authentication using NextAuth.js.
- **`/api/content`**: This will handle creating and listing content.
- **`/api/content/[id]`**: This will handle getting, updating, and deleting a specific piece of content.
- **`/api/recite/today`**: This will get a list of all content scheduled for recitation today.
- **`/api/recite/[id]`**: This will handle submitting the result of a recitation for a specific piece of content.

## 5. Database Integration

We will use Prisma as the ORM to interact with the PostgreSQL database.

- **`prisma/schema.prisma`**: This file will define the database schema.
- **`lib/prisma.ts`**: This file will contain the Prisma client instance.
- **`lib/db.ts`**: This file will contain database query functions that use the Prisma client.

## 6. Authentication

We will use NextAuth.js for user authentication.

- **`lib/auth.ts`**: This file will contain the NextAuth.js configuration.
- The `[...nextauth]` route will handle the authentication logic, including sign-in, sign-out, and session management.

## 7. SM-2 Algorithm

- **`lib/sm2.ts`**: This file will contain the implementation of the SM-2 algorithm, as defined in `docs/memory_theory.md`.

## 8. Monitoring

We will use a combination of tools and libraries to implement our monitoring strategy.

### Logging

- We will use a logging library, such as `pino` or `winston`, to log all API requests and responses.
- We will configure the logging library to output logs in a structured JSON format, which can be easily parsed by a logging service.
- We will use a log shipper, such as Filebeat or Fluentd, to send our logs to a centralized logging service.

### Metrics

- We will use a library, such as `prom-client`, to expose our application metrics in a Prometheus-compatible format.
- We will use a Prometheus server to scrape our metrics and store them in a time-series database.
- We will use Grafana to create dashboards to visualize our metrics.

### Alerting

- We will use Prometheus Alertmanager to define our alerting rules and send alerts to the development team.