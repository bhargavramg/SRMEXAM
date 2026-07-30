# Exam Portal API Documentation

## Base URL
`/api`

## Global Error Responses
All endpoints follow a unified response structure.

**Validation Error (400)**
```json
{
  "status": "fail",
  "message": "Validation Error",
  "errors": [
    { "path": "text", "message": "Question text must be at least 5 characters" }
  ]
}
```

---

## 1. Authentication (`/api/auth`)

### 1.1 Login
- **Endpoint**: `/login`
- **Method**: `POST`
- **Auth**: None
- **Request Body**:
  ```json
  {
    "email": "user@srm.edu",
    "password": "password123"
  }
  ```
- **Success (200)**:
  ```json
  {
    "status": "success",
    "token": "jwt_token_here",
    "user": {
      "id": "uuid",
      "name": "John Doe",
      "role": "FACULTY"
    }
  }
  ```

---

## 2. Question Bank (`/api/questions`)

All Question endpoints require `Authorization: Bearer <token>` and Roles: `[FACULTY, ADMIN, SUPER_ADMIN]`.

### 2.1 Create Question
- **Endpoint**: `/`
- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "bankId": "uuid-of-bank",
    "type": "MCQ", // MCQ, MULTIPLE_CORRECT, TRUE_FALSE, CODING, etc.
    "text": "What is 2 + 2?",
    "marks": 2,
    "negativeMarks": 0.5,
    "difficulty": "EASY",
    "tags": ["math", "algebra"],
    "options": [
      { "text": "3", "isCorrect": false },
      { "text": "4", "isCorrect": true }
    ],
    "codingDetails": null
  }
  ```
- **Success (201)**: Returns the created Question object with options and tags.

### 2.2 Get All Questions
- **Endpoint**: `/`
- **Method**: `GET`
- **Query Params**:
  - `bankId` (optional): Filter by bank ID
  - `type` (optional): Filter by question type
  - `difficulty` (optional): Filter by difficulty
  - `search` (optional): Search term against text/topic
- **Success (200)**: Returns an array of Question objects.

### 2.3 Get Question by ID
- **Endpoint**: `/:id`
- **Method**: `GET`
- **Success (200)**: Returns the Question object.
- **Error (404)**: If question does not exist.

### 2.4 Update Question
- **Endpoint**: `/:id`
- **Method**: `PUT`
- **Request Body**: Partial fields from Create Question.
- **Success (200)**: Returns the updated Question object.

### 2.5 Delete Question
- **Endpoint**: `/:id`
- **Method**: `DELETE`
- **Success (204)**: No Content.
