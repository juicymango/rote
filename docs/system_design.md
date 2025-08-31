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
- `POST /api/users/login`: Log in a user and get a JWT token.
- `GET /api/users/me`: Get the current user's profile.

### Content Management

- `POST /api/content`: Create a new piece of content to recite.
- `GET /api/content`: Get a list of all content for the current user.
- `GET /api/content/:id`: Get a specific piece of content.
- `PUT /api/content/:id`: Update a piece of content.
- `DELETE /api/content/:id`: Delete a piece of content.

### Recitation

- `GET /api/recite/today`: Get a list of all content scheduled for recitation today.
- `POST /api/recite/:content_id`: Submit the result of a recitation for a specific piece of content.

The request body for `POST /api/recite/:content_id` would look like this:

```json
{
  "quality": 4
}
```

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
