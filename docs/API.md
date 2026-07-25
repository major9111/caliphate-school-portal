# FUGUSAU Portal — Full API Documentation

**Base URL:** `http://your-server/api/v1/`  
**Authentication:** Bearer JWT Token  
**Interactive Docs:** `http://your-server/api/docs/` (Swagger UI)

---

## 🔐 Authentication Endpoints

| Method | Endpoint | Description | Auth |
|--------|---------|-------------|------|
| POST | `/auth/login/` | Login — returns JWT tokens + user data | ❌ |
| POST | `/auth/logout/` | Logout — blacklists refresh token | ✅ |
| POST | `/auth/register/` | Register new user | ❌ |
| POST | `/auth/token/refresh/` | Refresh access token | ❌ |
| GET  | `/auth/me/` | Get current user profile | ✅ |
| PATCH | `/auth/me/` | Update user profile | ✅ |
| POST | `/auth/change-password/` | Change password | ✅ |
| GET  | `/auth/users/` | List all users (Admin only) | ✅ Admin |
| GET  | `/auth/audit-logs/` | System audit trail (Admin only) | ✅ Admin |

### Login Request/Response
```json
POST /auth/login/
{
  "email": "2210308164@student.fugusau.edu.ng",
  "password": "your_password"
}

Response 200:
{
  "access": "eyJ0eXAiOiJKV1Qi...",
  "refresh": "eyJ0eXAiOiJKV1Qi...",
  "user": {
    "id": "uuid",
    "email": "student@fugusau.edu.ng",
    "name": "Aminu Usman Ibrahim",
    "role": "student",
    "is_verified": true,
    "two_fa_enabled": false,
    "profile_photo": null
  }
}
```

---

## 👥 Students Endpoints

| Method | Endpoint | Description | Auth |
|--------|---------|-------------|------|
| GET  | `/students/profile/` | Get student profile | ✅ Student |
| PATCH | `/students/profile/` | Update student profile | ✅ Student |
| GET  | `/students/faculties/` | List all faculties | ✅ |
| GET  | `/students/departments/` | List departments | ✅ |
| GET  | `/students/specializations/` | List specializations | ✅ |
| GET  | `/students/admission-requirements/` | Entry requirements per dept | ❌ |

---

## 📚 Courses Endpoints

| Method | Endpoint | Description | Auth |
|--------|---------|-------------|------|
| GET  | `/courses/` | List available courses | ✅ |
| GET  | `/courses/{id}/` | Course detail | ✅ |
| GET  | `/courses/enrollments/` | My enrolled courses | ✅ Student |
| POST | `/courses/register/` | Register a course | ✅ Student |
| DELETE | `/courses/enrollments/{id}/` | Drop a course | ✅ Student |
| GET  | `/courses/timetable/` | My weekly timetable | ✅ |
| GET  | `/courses/{id}/attendance/` | Course attendance | ✅ |
| POST | `/courses/{id}/mark-attendance/` | Mark attendance | ✅ Lecturer |

### Register Course
```json
POST /courses/register/
{ "course_id": "uuid-of-course" }

Response 201: { "enrollment": {...}, "total_credit_units": 11 }
```

---

## 🎫 Exams Endpoints

| Method | Endpoint | Description | Auth |
|--------|---------|-------------|------|
| GET  | `/exams/schedule/` | Full exam timetable | ✅ |
| GET  | `/exams/exam-card/` | My personal exam card | ✅ Student |
| GET  | `/exams/clearance/` | Exam clearance status | ✅ Student |
| GET  | `/exams/results/` | My results | ✅ |
| GET  | `/exams/results/?senate_approved=true` | Senate approved results | ✅ |
| POST | `/exams/results/upload/` | Upload results (Lecturer) | ✅ Lecturer |
| POST | `/exams/clearance/{id}/approve/` | Approve clearance (Admin) | ✅ Admin |

---

## 💳 Fees Endpoints

| Method | Endpoint | Description | Auth |
|--------|---------|-------------|------|
| GET  | `/fees/types/` | Fee structure for session | ✅ |
| GET  | `/fees/invoices/` | My invoices | ✅ |
| POST | `/fees/generate-invoice/` | Generate semester invoice | ✅ Student |
| POST | `/fees/pay/` | Initiate Paystack payment | ✅ Student |
| POST | `/fees/verify-payment/` | Verify payment after redirect | ✅ Student |
| GET  | `/fees/payment-history/` | All verified payments | ✅ Student |

### Payment Flow
```
1. POST /fees/generate-invoice/     → Get/create invoice
2. POST /fees/pay/ {invoice_id}     → Get Paystack authorization_url
3. Redirect user to authorization_url (Paystack handles payment)
4. POST /fees/verify-payment/ {reference} → Verify & update invoice status
```

---

## 📖 Library Endpoints

| Method | Endpoint | Description | Auth |
|--------|---------|-------------|------|
| GET  | `/library/books/` | Search physical books | ✅ |
| GET  | `/library/ebooks/` | Browse eBooks | ✅ |
| GET  | `/library/ebooks/{id}/` | eBook detail + download URL | ✅ |
| POST | `/library/borrow/` | Borrow a physical book | ✅ Student |
| POST | `/library/return/{id}/` | Return a book | ✅ Student |
| GET  | `/library/borrowed/` | My borrowed books | ✅ Student |
| POST | `/library/ai-recommend/` | AI book recommendations | ✅ |

### AI Recommendation
```json
POST /library/ai-recommend/
{ "query": "I need books on database normalization for CSC303" }

Response 200:
{
  "recommendations": [
    { "id": "uuid", "title": "Database System Concepts", "relevance": 0.95 },
    ...
  ]
}
```

---

## 💬 Chat Endpoints

| Method | Endpoint | Description | Auth |
|--------|---------|-------------|------|
| GET  | `/chat/rooms/` | My chat rooms | ✅ |
| POST | `/chat/rooms/` | Create/join a room | ✅ |
| GET  | `/chat/rooms/{name}/messages/` | Room message history | ✅ |
| POST | `/chat/rooms/{name}/messages/` | Send message (REST fallback) | ✅ |
| POST | `/chat/ai-advisor/` | Ask AI academic advisor | ✅ |

### WebSocket Chat
```javascript
// Connect to course chat
const ws = new WebSocket('ws://server/ws/chat/course_CSC301/')

// Send message
ws.send(JSON.stringify({ type: 'message', content: 'Hello class!' }))

// Receive messages
ws.onmessage = (e) => {
  const data = JSON.parse(e.data)
  // data.type: 'message', 'typing', 'notification', 'message_history'
}
```

---

## 🔐 Credentials Endpoints

| Method | Endpoint | Description | Auth |
|--------|---------|-------------|------|
| GET  | `/credentials/` | My uploaded credentials | ✅ Student |
| POST | `/credentials/` | Upload credential document | ✅ Student |
| GET  | `/credentials/{id}/` | Credential detail + AI report | ✅ |
| POST | `/credentials/{id}/analyze/` | Run AI forgery analysis | ✅ |
| POST | `/credentials/{id}/external-verify/` | Verify vs WAEC/NECO/JAMB | ✅ |
| PATCH | `/credentials/{id}/review/` | Manual admin review | ✅ Admin |

### Upload Credential
```
POST /credentials/
Content-Type: multipart/form-data

file: <file binary>
doc_type: "WAEC" | "NECO" | "JAMB" | "BIRTH_CERT" | "LGC" | "NYSC" | "DEGREE"
```

### AI Analysis Response
```json
POST /credentials/{id}/analyze/
{
  "risk_score": 12,
  "verdict": "AUTHENTIC",  // "AUTHENTIC" | "SUSPICIOUS" | "LIKELY_FORGED"
  "status": "authentic",
  "findings": {
    "checks": {
      "resolution": "PASS",
      "font_consistency": "PASS",
      "artifact_analysis": "PASS",
      "ela_analysis": "PASS",
      "color_analysis": "PASS",
      "seal_verification": "PASS"
    },
    "flags": [],
    "extracted_text": "WEST AFRICAN EXAMINATIONS COUNCIL..."
  }
}
```

---

## 🔔 Notifications Endpoints

| Method | Endpoint | Description | Auth |
|--------|---------|-------------|------|
| GET  | `/notifications/` | All my notifications | ✅ |
| PATCH | `/notifications/{id}/` | Mark as read | ✅ |
| POST | `/notifications/mark-all-read/` | Mark all read | ✅ |

### WebSocket Notifications
```javascript
const ws = new WebSocket('ws://server/ws/notifications/')
ws.onmessage = (e) => {
  const notif = JSON.parse(e.data)
  // { type: 'notification', title: '...', message: '...', type: 'INFO' }
}
```

---

## 📈 Reports Endpoints

| Method | Endpoint | Description | Auth |
|--------|---------|-------------|------|
| GET  | `/reports/transcript/` | Download transcript PDF | ✅ Student |
| GET  | `/reports/financial/` | Download financial statement PDF | ✅ Student |
| GET  | `/reports/enrollment/` | Enrollment report (Admin) | ✅ Admin |
| GET  | `/reports/results-excel/` | Results Excel export (Admin/Lecturer) | ✅ |

---

## 🏠 Hostel Endpoints

| Method | Endpoint | Description | Auth |
|--------|---------|-------------|------|
| GET  | `/hostel/halls/` | Available hostel halls | ✅ |
| POST | `/hostel/apply/` | Apply for hostel | ✅ Student |
| GET  | `/hostel/my-application/` | My hostel application | ✅ Student |
| PATCH | `/hostel/applications/{id}/approve/` | Approve application (Admin) | ✅ Admin |

---

## Error Response Format

```json
{
  "error": "Human readable error message",
  "detail": "Technical detail (validation errors etc.)",
  "code": "ERROR_CODE"
}
```

## HTTP Status Codes Used

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 204 | Deleted |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (no/invalid token) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not Found |
| 422 | Unprocessable Entity |
| 429 | Too Many Requests (rate limit) |
| 500 | Server Error |
| 502 | External API Error (Paystack, WAEC etc.) |
