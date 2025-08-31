# Rote System Design

## 1. High-level Architecture

The system will be based on a classic client-server architecture.

- **Client**: A web-based frontend built with a modern JavaScript framework (e.g., React, Vue, or Angular). The client will be responsible for rendering the user interface and interacting with the backend APIs.
- **Backend**: A RESTful API server built with a backend framework (e.g., Node.js with Express, Python with Django/Flask, or Go with Gin). The backend will handle business logic, user authentication, and database operations.
- **Database**: A relational database (e.g., PostgreSQL, MySQL) to store user data, content, and recitation progress.

## 2. Data Models

### Users Table

| Column | Data Type | Description |
|---|---|---|
| id | UUID | Primary Key |
| username | VARCHAR(255) | User's username (unique) |
| email | VARCHAR(255) | User's email (unique) |
| password_hash | VARCHAR(255) | Hashed password |
| created_at | TIMESTAMP | Timestamp of user creation |
| updated_at | TIMESTAMP | Timestamp of last user update |

### Content Table

| Column | Data Type | Description |
|---|---|---|
| id | UUID | Primary Key |
| user_id | UUID | Foreign Key to Users table |
| title | VARCHAR(255) | Title of the content |
| body | TEXT | The content to be recited |
| created_at | TIMESTAMP | Timestamp of content creation |
| updated_at | TIMESTAMP | Timestamp of last content update |

### Recitation Progress Table

| Column | Data Type | Description |
|---|---|---|
| id | UUID | Primary Key |
| user_id | UUID | Foreign Key to Users table |
| content_id | UUID | Foreign Key to Content table |
| n | INTEGER | Repetition count (from SM-2) |
| ef | FLOAT | Easiness factor (from SM-2) |
| i | INTEGER | Interval in days (from SM-2) |
| next_recite_at | TIMESTAMP | Timestamp of the next scheduled recitation |
| last_recited_at | TIMESTAMP | Timestamp of the last recitation |
| created_at | TIMESTAMP | Timestamp of progress creation |
| updated_at | TIMESTAMP | Timestamp of last progress update |

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

## 6. Technology Choices

### Frontend

| Technology | Pros | Cons |
|---|---|---|
| React | Large ecosystem, component-based, great for single-page applications. | Can be complex to set up, requires knowledge of JSX. |
| Vue.js | Easy to learn, good documentation, flexible. | Smaller ecosystem than React. |
| Angular | Full-featured framework, good for large applications, backed by Google. | Steep learning curve, can be overkill for small projects. |

**Decision**: **React**. Its large community, rich ecosystem, and component-based architecture make it a good choice for building a modern, interactive user interface.

### Backend

| Technology | Pros | Cons |
|---|---|---|
| Node.js (with Express) | Fast and scalable, uses JavaScript (same language as the frontend), large number of packages available through npm. | Can be inefficient for CPU-intensive tasks. |
| Python (with Django/Flask) | Easy to learn, great for data-intensive applications, large number of libraries available. | Can be slower than Node.js or Go. |
| Go (with Gin) | Excellent performance, great for building concurrent applications, statically typed. | Smaller ecosystem than Node.js or Python. |

**Decision**: **Go with Gin**. Since the project is already in a Go environment, it makes sense to use Go for the backend. Go is also highly performant and well-suited for building scalable APIs. Gin is a lightweight and fast framework for building web applications in Go.

### Database

| Technology | Pros | Cons |
|---|---|---|
| PostgreSQL | Feature-rich, highly extensible, strong support for JSON. | Can be more complex to manage than MySQL. |
| MySQL | Easy to use, good performance, widely used. | Less feature-rich than PostgreSQL. |
| SQLite | Lightweight, serverless, easy to set up. | Not suitable for large-scale or concurrent applications. |

**Decision**: **PostgreSQL**. Its robustness, feature set (including strong JSON support), and scalability make it a good choice for this application. It can handle the relational data model well and provides a solid foundation for future growth.

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
