# Automated Testing Strategy for Rote

Automated testing is essential for ensuring the quality and reliability of the Rote application. Our testing strategy will cover three levels of testing: unit tests, integration tests, and end-to-end (E2E) tests. We will also set up a Continuous Integration/Continuous Deployment (CI/CD) pipeline to automate the testing process.

## 1. Unit Tests

Unit tests will be used to test individual components and functions in isolation.

-   **What to test**: We will write unit tests for all React components, utility functions, and API route handlers.
-   **Tools**: We will use Jest and React Testing Library for writing unit tests for our React components. For utility functions and API route handlers, we will use Jest.
-   **Location**: Unit tests will be located in the same directory as the code they are testing, with a `*.test.ts` or `*.test.tsx` extension.

## 2. Integration Tests

Integration tests will be used to test the interaction between different parts of the application.

-   **What to test**: We will write integration tests for our API routes to ensure that they are working correctly with the database. We will also write integration tests for our React components to ensure that they are working correctly with the API routes.
-   **Tools**: We will use Jest and Supertest for writing integration tests for our API routes. For our React components, we will use React Testing Library and Mock Service Worker (MSW) to mock the API requests.
-   **Location**: Integration tests will be located in a separate `__tests__` directory.

## 3. End-to-End (E2E) Tests

E2E tests will be used to test the application from the user's perspective.

-   **What to test**: We will write E2E tests for all critical user flows, such as:
    -   User registration and login.
    -   Creating, updating, and deleting content.
    -   Reciting content.
-   **Tools**: We will use Cypress for writing E2E tests.
-   **Location**: E2E tests will be located in a separate `cypress` directory.

## 4. CI/CD

We will set up a CI/CD pipeline to automate the testing process.

-   **Tools**: We will use GitHub Actions to set up our CI/CD pipeline.
-   **Workflow**: The CI/CD pipeline will be triggered on every push to the `main` branch and on every pull request. The pipeline will:
    1.  Install the dependencies.
    2.  Run the linter.
    3.  Run the unit tests.
    4.  Run the integration tests.
    5.  Run the E2E tests.
    6.  Build the application.
    7.  Deploy the application to a staging environment.
    8.  Deploy the application to production (on merge to `main`).

By implementing this automated testing strategy, we can ensure that the Rote application is always in a deployable state and that we can release new features with confidence.

## 5. API Testing

We will use Jest and `next-test-api-route-handler` to write integration tests for our API routes. We will also use a separate test database to avoid polluting the development database.

### Test Cases

#### User Management

-   **`POST /api/auth/register`**
    -   **Test Code Path**: `src/app/api/auth/register/__tests__/route.test.ts`
    -   **Test Case 1**: Should register a new user with valid data.
    -   **Test Case 2**: Should return an error if the email is already taken.
    -   **Test Case 3**: Should return an error if the username is already taken.
    -   **Test Case 4**: Should return an error if the email is invalid. (Not implemented)
    -   **Test Case 5**: Should return an error if the password is too short. (Not implemented)
-   **`POST /api/auth/login`** (Not implemented)
    -   **Test Case 1**: Should log in a user with valid credentials.
    -   **Test Case 2**: Should return an error with invalid credentials.

#### Content Management

-   **`POST /api/content`**
    -   **Test Code Path**: `src/app/api/content/__tests__/route.test.ts`
    -   **Test Case 1**: Should create a new piece of content for an authenticated user.
    -   **Test Case 2**: Should return an error if the user is not authenticated.
-   **`GET /api/content`**
    -   **Test Code Path**: `src/app/api/content/__tests__/route.test.ts`
    -   **Test Case 1**: Should return a list of content for an authenticated user.
    -   **Test Case 2**: Should return an empty list if the user has no content.
    -   **Test Case 3**: Should return an error if the user is not authenticated.
-   **`GET /api/content/:id`**
    -   **Test Code Path**: `src/app/api/content/[id]/__tests__/route.test.ts`
    -   **Test Case 1**: Should return a specific piece of content for an authenticated user.
    -   **Test Case 2**: Should return an error if the content does not exist.
    -   **Test Case 3**: Should return an error if the user is not the owner of the content.
    -   **Test Case 4**: Should return an error if the user is not authenticated.
-   **`PUT /api/content/:id`**
    -   **Test Code Path**: `src/app/api/content/[id]/__tests__/route.test.ts`
    -   **Test Case 1**: Should update a specific piece of content for an authenticated user.
    -   **Test Case 2**: Should return an error if the content does not exist.
    -   **Test Case 3**: Should return an error if the user is not the owner of the content.
    -   **Test Case 4**: Should return an error if the user is not authenticated.
-   **`DELETE /api/content/:id`**
    -   **Test Code Path**: `src/app/api/content/[id]/__tests__/route.test.ts`
    -   **Test Case 1**: Should delete a specific piece of content for an authenticated user.
    -   **Test Case 2**: Should return an error if the content does not exist.
    -   **Test Case 3**: Should return an error if the user is not the owner of the content.
    -   **Test Case 4**: Should return an error if the user is not authenticated.

#### Recitation

-   **`GET /api/recite/today`**
    -   **Test Code Path**: `src/app/api/recite/__tests__/today.test.ts`
    -   **Test Case 1**: Should return a list of content to recite today for an authenticated user.
    -   **Test Case 2**: Should return an empty list if there is no content to recite today.
    -   **Test Case 3**: Should return an error if the user is not authenticated.
-   **`POST /api/recite/:id`**
    -   **Test Code Path**: `src/app/api/recite/[id]/__tests__/route.test.ts`
    -   **Test Case 1**: Should submit the result of a recitation for an authenticated user.
    -   **Test Case 2**: Should create a new recitation progress if it does not exist.
    -   **Test Case 3**: Should update the recitation progress if it already exists.
    -   **Test Case 4**: Should return an error if the content does not exist.
    -   **Test Case 5**: Should return an error if the user is not authenticated.

### How to Test

This guide provides a step-by-step process for running the API tests locally.

#### 1. Prerequisites

-   You have a local PostgreSQL instance running.
-   You have created a separate database for testing (e.g., `rote_test`).

#### 2. Setup

1.  **Install dependencies**:
    ```bash
    npm install
    ```

2.  **Create a `.env.test` file**:
    Create a `.env.test` file in the root of the project and add the following line, replacing the credentials and database name with your own:
    ```
    DATABASE_URL="postgresql://user:password@localhost:5432/rote_test"
    ```

3.  **Apply database migrations**:
    Run the following command to apply the database migrations to the test database:
    ```bash
    npm run test:migrate
    ```

#### 3. Running Tests

1.  **Run all tests**:
    Run the following command to run all the API tests:
    ```bash
    npm test
    ```

2.  **Run a specific test file**:
    To run a specific test file, you can use the following command:
    ```bash
    npm test -- src/app/api/auth/register/__tests__/route.test.ts
    ```

#### 4. Resetting the Test Database

If you want to reset the test database, you can run the following command:
```bash
npm run test:reset
```
