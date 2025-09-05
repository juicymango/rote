# Rote System Design (Updated: Task 19 Implementation Complete)

## 1. High-level Architecture

The system is implemented using Next.js with an integrated frontend and backend architecture.

- **Frontend**: Built with Next.js 15.5.2 and React 19.1.0, providing server-side rendering and API routes in a single codebase.
- **Backend**: Integrated Next.js API routes handling business logic, user authentication, and database operations.
- **Database**: PostgreSQL with Prisma ORM for data persistence.
- **Authentication**: NextAuth.js 4.24.11 for user session management.

## 2. Data Models

### Users Table

| Column | Data Type | Description |
|---|---|---|
| id | String | Primary Key (CUID) |
| username | String | User's username (unique) |
| email | String | User's email (unique) |
| password_hash | String | Hashed password using bcrypt |
| created_at | DateTime | Timestamp of user creation |
| updated_at | DateTime | Timestamp of last user update |

### Content Table

| Column | Data Type | Description |
|---|---|---|
| id | String | Primary Key (CUID) |
| user_id | String | Foreign Key to Users table |
| title | String | Title of the content |
| body | String | The content to be recited |
| created_at | DateTime | Timestamp of content creation |
| updated_at | DateTime | Timestamp of last content update |

### Recitation Progress Table

| Column | Data Type | Description |
|---|---|---|
| id | String | Primary Key (CUID) |
| user_id | String | Foreign Key to Users table |
| content_id | String | Foreign Key to Content table |
| n | Int | Repetition count (from SM-2) |
| ef | Float | Easiness factor (from SM-2) |
| i | Int | Interval in days (from SM-2) |
| next_recite_at | DateTime | Timestamp of the next scheduled recitation |
| last_recited_at | DateTime | Timestamp of the last recitation |
| created_at | DateTime | Timestamp of progress creation |
| updated_at | DateTime | Timestamp of last progress update |

## 3. Functional APIs

### User Management

- `POST /api/users/register`: Register a new user.
    - **Input**: `{ "username": "test", "email": "test@example.com", "password": "password" }`
    - **Output**: `{ "id": "uuid", "username": "test", "email": "test@example.com" }`
- `POST /api/users/login`: Log in a user and get a JWT token.
    - **Input**: `{ "email": "test@example.com", "password": "password" }`
    - **Output**: `{ "token": "jwt_token" }`
- `GET /api/users/me`: Get the current user's profile.
    - **Input**: None (Authorization header with JWT token)
    - **Output**: `{ "id": "uuid", "username": "test", "email": "test@example.com" }`

### Content Management

- `POST /api/content`: Create a new piece of content to recite.
    - **Input**: `{ "title": "My first content", "body": "This is the content to be recited." }`
    - **Output**: `{ "id": "uuid", "title": "My first content", "body": "This is the content to be recited." }`
- `GET /api/content`: Get a list of all content for the current user.
    - **Input**: None
    - **Output**: `[{ "id": "uuid", "title": "My first content" }, ...]`
- `GET /api/content/:id`: Get a specific piece of content.
    - **Input**: None
    - **Output**: `{ "id": "uuid", "title": "My first content", "body": "This is the content to be recited." }`
- `PUT /api/content/:id`: Update a piece of content.
    - **Input**: `{ "title": "Updated title", "body": "Updated content." }`
    - **Output**: `{ "id": "uuid", "title": "Updated title", "body": "Updated content." }`
- `DELETE /api/content/:id`: Delete a piece of content.
    - **Input**: None
    - **Output**: `204 No Content`

### Recitation

- `GET /api/recite/today`: Get a list of all content scheduled for recitation today.
    - **Input**: None
    - **Output**: `[{ "id": "uuid", "title": "Content to recite today" }, ...]`
- `POST /api/recite/:content_id`: Submit the result of a recitation for a specific piece of content.
    - **Input**: `{ "quality": 4 }`
    - **Output**: `{ "message": "Recitation result submitted successfully." }`

## 4. Recitation Scheduling

The system will use the SM-2 algorithm to schedule recitations.

When a user submits a recitation result (`POST /api/recite/:content_id`), the backend will:

1.  Retrieve the `RecitationProgress` for the given `user_id` and `content_id`.
2.  Get the user's quality of response (`q`) from the request body.
3.  Use the `sm2` function (as defined in `memory_theory.md`) to calculate the new `n`, `ef`, and `i` values.
4.  Update the `RecitationProgress` with the new values.
5.  Calculate the `next_recite_at` by adding `i` days to the current date.
6.  Save the updated `RecitationProgress` to the database.

## 5. Other System Design Considerations

### Scalability

- The backend can be designed as a stateless service, allowing for horizontal scaling by adding more server instances behind a load balancer.
- The database can be scaled vertically (by using a more powerful machine) or horizontally (by using sharding or read replicas).

### Security

- **Authentication**: Use JWT (JSON Web Tokens) for authenticating API requests.
- **Password Hashing**: Hash user passwords using a strong hashing algorithm (e.g., bcrypt).
- **Input Validation**: Validate all user input to prevent SQL injection, XSS, and other attacks.
- **HTTPS**: Use HTTPS to encrypt all communication between the client and the server.

## 6. Technology Choices (Implemented)

### Frontend and Backend

| Technology | Version | Description |
|---|---|---|
| Next.js | 15.5.2 | React framework with server-side rendering and API routes |
| React | 19.1.0 | UI library for building interactive user interfaces |
| TypeScript | 5.x | Static type checking for JavaScript |

### Database and ORM

| Technology | Version | Description |
|---|---|---|
| PostgreSQL | Latest | Relational database for data persistence |
| Prisma | 6.15.0 | Type-safe ORM for database operations |

### Authentication and Security

| Technology | Version | Description |
|---|---|---|
| NextAuth.js | 4.24.11 | Authentication library for Next.js |
| bcrypt | 6.0.0 | Password hashing library |

### Testing

| Technology | Version | Description |
|---|---|---|
| Jest | 30.1.2 | JavaScript testing framework |
| Cypress | 15.0.0 | End-to-end testing framework |
| @testing-library/react | 16.3.0 | React testing utilities |

### Development Tools

| Technology | Version | Description |
|---|---|---|
| Tailwind CSS | 4 | Utility-first CSS framework |
| ESLint | 9.x | JavaScript linting utility |
| Babel | 7.x | JavaScript compiler |

## 7. Is Next.js a better choice?

Next.js is a popular React framework that provides a number of features out of the box, including server-side rendering (SSR), static site generation (SSG), and API routes. It is a good choice for building modern, performant web applications.

### Comparison with the current technology stack

| Aspect | Current Stack (React + Go/Gin) | Next.js |
|---|---|---|
| **Architecture** | Separate frontend and backend | Integrated frontend and backend |
| **Rendering** | Client-side rendering (CSR) | Server-side rendering (SSR) or static site generation (SSG) |
| **API** | Separate REST API server | Integrated API routes |
| **Development Experience** | Requires managing two separate codebases and development environments | Simplified development experience with a single codebase |
| **Performance** | Can be slower on initial page load due to CSR | Faster initial page load and better SEO with SSR/SSG |
| **Scalability** | Can be scaled independently | Can be scaled as a whole |

### Pros of using Next.js

- **Improved Performance**: SSR and SSG can lead to faster initial page loads and better SEO.
- **Simplified Development**: A single codebase for both the frontend and backend can simplify development and reduce the amount of boilerplate code.
- **Built-in Features**: Next.js comes with a number of built-in features, such as routing, image optimization, and internationalization, which can save development time.
- **Vercel Integration**: Next.js is developed by Vercel, which provides a seamless deployment experience.

### Cons of using Next.js

- **Opinionated**: Next.js is an opinionated framework, which may not be suitable for all projects.
- **Learning Curve**: While Next.js is based on React, it has its own set of conventions and APIs that need to be learned.
- **Vendor Lock-in**: While Next.js is open-source, it is tightly integrated with the Vercel platform, which could lead to vendor lock-in.

### Conclusion

For this project, **Next.js is a better choice**. The benefits of improved performance, simplified development, and built-in features outweigh the cons. While the current stack of React and Go/Gin is a solid choice, Next.js provides a more integrated and streamlined development experience, which is especially beneficial for a small team or a solo developer. The ability to have a single codebase for both the frontend and backend is a significant advantage.

Therefore, I recommend using **Next.js with PostgreSQL** for this project.

## 8. Monitoring

Monitoring is crucial for ensuring the reliability, performance, and availability of the Rote application. Our monitoring strategy will focus on three key areas: logging, metrics, and alerting.

### Logging

- **What to log**: We will log all API requests and responses, as well as any errors that occur in the application. We will also log key events, such as user registrations and content creation.
- **Where to store logs**: We will use a cloud-based logging service, such as Datadog, Logz.io, or the ELK stack (Elasticsearch, Logstash, and Kibana). This will allow us to centralize our logs, search them easily, and create dashboards and alerts based on log data.

### Metrics

- **What to collect**: We will collect a variety of metrics to monitor the health and performance of the application, including:
    - **Application-level metrics**: Request latency, error rates, and throughput for each API endpoint.
    - **Database metrics**: CPU utilization, memory usage, and query latency for the PostgreSQL database.
    - **System-level metrics**: CPU utilization, memory usage, and disk space for the application servers.
- **How to visualize metrics**: We will use a monitoring service, such as Datadog, Grafana, or Prometheus, to visualize our metrics in dashboards. This will allow us to easily identify trends and anomalies.

### Alerting

- **When to trigger alerts**: We will set up alerts to notify us of any critical issues, such as:
    - A sudden spike in error rates.
    - High request latency.
    - High CPU or memory utilization.
    - Low disk space.
- **Who to notify**: Alerts will be sent to the development team via email, Slack, or a paging service like PagerDuty.
