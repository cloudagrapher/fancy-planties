# API Documentation

Fancy Planties provides a RESTful API for managing plants, care schedules, and propagations. All endpoints require authentication unless otherwise noted.

## 🔐 Authentication

The API uses session-based authentication with cookies. Users must sign in through the web interface to obtain a session.

### Authentication Headers

```http
Cookie: auth_session=<session_token>
```

### Authentication Endpoints

#### Sign Up
```http
POST /api/auth/signup
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword",
  "name": "Plant Lover"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "Plant Lover"
  }
}
```

#### Sign In
```http
POST /api/auth/signin
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword"
}
```

#### Sign Out
```http
POST /api/auth/signout
```

#### Verify Email
```http
POST /api/auth/verify-email
Content-Type: application/json

{
  "code": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Email verified successfully"
}
```

#### Resend Verification Code
```http
POST /api/auth/resend-verification
```

**Response:**
```json
{
  "success": true,
  "message": "Verification code sent",
  "cooldownSeconds": 60
}
```

## 🌿 Plants API

### Get All Plants (Taxonomy)
```http
GET /api/plants
```

**Query Parameters:**
- `search` (string): Search across all taxonomy fields
- `family` (string): Filter by plant family
- `genus` (string): Filter by genus

**Response:**
```json
{
  "plants": [
    {
      "id": 1,
      "family": "Araceae",
      "genus": "Monstera",
      "species": "deliciosa",
      "cultivar": "Thai Constellation",
      "commonName": "Swiss Cheese Plant",
      "careInstructions": "Bright indirect light, weekly watering",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### Create Plant Type
```http
POST /api/plants
Content-Type: application/json

{
  "family": "Araceae",
  "genus": "Monstera",
  "species": "deliciosa",
  "cultivar": "Thai Constellation",
  "commonName": "Swiss Cheese Plant",
  "careInstructions": "Bright indirect light, weekly watering"
}
```

### Get Plant by ID
```http
GET /api/plants/{id}
```

### Search Plants
```http
GET /api/plants/search?q=monstera
```

## 🪴 Plant Instances API

### Get User's Plant Instances
```http
GET /api/plant-instances
```

**Query Parameters:**
- `active` (boolean): Filter by active status (default: true)
- `location` (string): Filter by location
- `search` (string): Search plant nicknames and taxonomy

### Enhanced Search Plant Instances
```http
GET /api/plant-instances/enhanced-search
```

**Query Parameters:**
- `searchQuery` (string): Text search across multiple fields
- `searchFields` (array): Specific fields to search (nickname, location, notes, plant_name)
- `location` (string): Filter by location
- `plantId` (number): Filter by specific plant type
- `isActive` (boolean): Filter by active status
- `overdueOnly` (boolean): Show only overdue plants
- `dueSoonDays` (number): Show plants due within X days
- `hasImages` (boolean): Filter by image presence
- `imageCount` (object): Filter by image count range `{"min": 1, "max": 5}`
- `fertilizerFrequency` (object): Filter by fertilizer frequency `{"unit": "weeks", "min": 1, "max": 4}`
- `datePreset` (string): Date range preset (today, this_week, this_month, last_month, last_3_months)
- `createdAfter` (string): Filter by creation date (ISO 8601)
- `createdBefore` (string): Filter by creation date (ISO 8601)
- `lastFertilizedAfter` (string): Filter by last fertilized date (ISO 8601)
- `lastFertilizedBefore` (string): Filter by last fertilized date (ISO 8601)
- `sortBy` (string): Sort field (nickname, location, created_at, last_fertilized, fertilizer_due, care_urgency, plant_name)
- `sortOrder` (string): Sort order (asc, desc)
- `limit` (number): Results per page (default: 20, max: 100)
- `offset` (number): Pagination offset
- `includeStats` (boolean): Include care statistics
- `includeFacets` (boolean): Include search facets

**Response:**
```json
{
  "instances": [
    {
      "id": 1,
      "userId": 1,
      "plantId": 1,
      "nickname": "Monty",
      "location": "Living room window",
      "lastFertilized": "2024-01-15T00:00:00Z",
      "fertilizerSchedule": "weekly",
      "fertilizerDue": "2024-01-22T00:00:00Z",
      "lastRepot": "2023-06-01T00:00:00Z",
      "notes": "Growing beautifully!",
      "images": ["base64_image_data"],
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00Z",
      "plant": {
        "id": 1,
        "family": "Araceae",
        "genus": "Monstera",
        "species": "deliciosa",
        "cultivar": "Thai Constellation",
        "commonName": "Swiss Cheese Plant"
      },
      "careStatus": "due_soon",
      "careUrgency": "medium",
      "daysUntilFertilizerDue": 2,
      "daysSinceLastFertilized": 5,
      "displayName": "Monty",
      "primaryImage": "base64_image_data"
    }
  ],
  "totalCount": 25,
  "hasMore": true,
  "searchTime": 45,
  "filters": {
    "userId": 1,
    "isActive": true,
    "limit": 20,
    "offset": 0,
    "sortBy": "created_at",
    "sortOrder": "desc"
  }
}
```

**Enhanced Search Response (with stats and facets):**
```json
{
  "instances": [...],
  "totalCount": 25,
  "hasMore": true,
  "searchTime": 67,
  "filters": {...},
  "stats": {
    "totalActivePlants": 25,
    "overdueCount": 3,
    "dueTodayCount": 2,
    "dueSoonCount": 5
  },
  "facets": {
    "locations": [
      {"value": "Living room", "count": 8},
      {"value": "Bedroom", "count": 5}
    ]
  }
}
```

### Create Plant Instance
```http
POST /api/plant-instances
Content-Type: application/json

{
  "plantId": 1,
  "nickname": "Monty",
  "location": "Living room window",
  "fertilizerSchedule": "weekly",
  "lastFertilized": "2024-01-15T00:00:00Z",
  "notes": "New addition to the family",
  "images": ["base64_image_data"]
}
```

### Update Plant Instance
```http
PUT /api/plant-instances/{id}
Content-Type: application/json

{
  "nickname": "Monty Jr",
  "location": "Bedroom",
  "notes": "Moved to get more light"
}
```

### Delete Plant Instance
```http
DELETE /api/plant-instances/{id}
```

### Get Plant Instance Care Dashboard
```http
GET /api/plant-instances/dashboard
```

**Response:**
```json
{
  "overdue": [
    {
      "plantInstance": { /* plant instance object */ },
      "daysOverdue": 3,
      "careType": "fertilizer"
    }
  ],
  "dueToday": [
    {
      "plantInstance": { /* plant instance object */ },
      "careType": "fertilizer"
    }
  ],
  "upcoming": [
    {
      "plantInstance": { /* plant instance object */ },
      "daysUntilDue": 2,
      "careType": "fertilizer"
    }
  ]
}
```

## ❤️ Care History API

### Get Care History
```http
GET /api/care/history?plantInstanceId={id}
```

**Query Parameters:**
- `plantInstanceId` (number): Filter by plant instance
- `careType` (string): Filter by care type (fertilizer, repot, water, etc.)
- `limit` (number): Limit results (default: 50)

### Log Care Activity
```http
POST /api/care/log
Content-Type: application/json

{
  "plantInstanceId": 1,
  "careType": "fertilizer",
  "careDate": "2024-01-22T00:00:00Z",
  "notes": "Used liquid fertilizer"
}
```

### Quick Care Log
```http
POST /api/care/quick-log
Content-Type: application/json

{
  "plantInstanceId": 1,
  "careType": "fertilizer"
}
```

## 🌱 Propagations API

### Get User's Propagations
```http
GET /api/propagations
```

**Query Parameters:**
- `status` (string): Filter by status (started, rooting, planted, established)
- `sourceType` (string): Filter by source type (internal, external)

**Response:**
```json
{
  "propagations": [
    {
      "id": 1,
      "userId": 1,
      "plantId": 1,
      "parentInstanceId": 2,
      "nickname": "Monty Baby",
      "location": "Propagation station",
      "dateStarted": "2024-01-01T00:00:00Z",
      "status": "rooting",
      "sourceType": "internal",
      "notes": "Taken from mother plant",
      "images": ["base64_image_data"],
      "plant": { /* plant object */ },
      "parentInstance": { /* parent plant instance */ }
    }
  ]
}
```

### Create Propagation
```http
POST /api/propagations
Content-Type: application/json

{
  "plantId": 1,
  "parentInstanceId": 2,
  "nickname": "Monty Baby",
  "location": "Propagation station",
  "sourceType": "internal",
  "notes": "Taken from mother plant"
}
```

### Create External Propagation
```http
POST /api/propagations
Content-Type: application/json

{
  "plantId": 1,
  "nickname": "Gift Cutting",
  "location": "Propagation station",
  "sourceType": "external",
  "externalSource": "gift",
  "externalSourceDetails": "Gift from Sarah's garden",
  "notes": "Beautiful cutting!"
}
```

### Update Propagation Status
```http
PUT /api/propagations/{id}
Content-Type: application/json

{
  "status": "planted",
  "notes": "Successfully rooted and planted in soil"
}
```

### Convert Propagation to Plant Instance
```http
POST /api/propagations/{id}/convert
Content-Type: application/json

{
  "nickname": "Monty Jr",
  "location": "Living room",
  "fertilizerSchedule": "weekly"
}
```

## 📊 Import/Export API

### Import CSV Data
```http
POST /api/import/csv
Content-Type: multipart/form-data

file: <csv_file>
type: "plants" | "plant-instances" | "propagations"
```

**Response:**
```json
{
  "success": true,
  "imported": 15,
  "errors": [],
  "summary": {
    "plantsCreated": 5,
    "instancesCreated": 10,
    "duplicatesSkipped": 2
  }
}
```

### Export User Data
```http
GET /api/export?type=plants
```

**Query Parameters:**
- `type` (string): Data type to export (plants, plant-instances, propagations, all)
- `format` (string): Export format (csv, json) - default: csv

## 🔍 Search API

### Advanced Search
```http
POST /api/search/advanced
Content-Type: application/json

{
  "query": "monstera",
  "filters": {
    "location": "living room",
    "careStatus": "overdue",
    "family": "Araceae"
  },
  "sortBy": "nickname",
  "sortOrder": "asc"
}
```

### Search Suggestions
```http
GET /api/search/suggestions?q=mon
```

## 🛡️ Admin API

**Note:** All admin endpoints require curator privileges. Access is restricted to users with `isCurator: true`.

### Email Verification System Monitor
```http
GET /api/admin/email-verification-monitor
```

**Response:**
```json
{
  "systemHealth": {
    "totalUsers": 150,
    "verifiedUsers": 142,
    "pendingVerifications": 8,
    "verificationRate": 94.7
  },
  "recentActivity": [
    {
      "id": 1,
      "email": "user@example.com",
      "status": "verified",
      "timestamp": "2024-01-22T10:30:00Z",
      "attempts": 1
    }
  ],
  "systemStats": {
    "codesGenerated": 1250,
    "successfulVerifications": 1180,
    "failedAttempts": 45,
    "expiredCodes": 25
  }
}
```

### Admin Actions
```http
POST /api/admin/email-verification-monitor
Content-Type: application/json

{
  "action": "cleanup" | "reset_stats"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Action completed successfully",
  "details": {
    "recordsAffected": 25
  }
}
```

### Admin Analytics Dashboard
```http
GET /api/admin/analytics/dashboard
```

**Response:**
```json
{
  "users": {
    "total": 150,
    "curators": 5,
    "newThisMonth": 12,
    "activeThisWeek": 8,
    "emailVerified": 142
  },
  "plants": {
    "total": 450,
    "verified": 420,
    "pendingApproval": 30,
    "submittedThisMonth": 25
  },
  "activity": {
    "recentRegistrations": [
      {
        "id": 151,
        "name": "New User",
        "email": "user@example.com",
        "createdAt": "2024-01-22T10:30:00Z"
      }
    ],
    "recentSubmissions": [
      {
        "id": 451,
        "genus": "Monstera",
        "species": "deliciosa",
        "createdAt": "2024-01-22T09:15:00Z"
      }
    ],
    "totalInstances": 1250,
    "totalPropagations": 380,
    "totalCareEntries": 5420
  },
  "systemHealth": {
    "activeSessions": 45,
    "lastWeekRegistrations": 8,
    "lastWeekSubmissions": 15
  }
}
```

### Admin Analytics - User Growth
```http
GET /api/admin/analytics/user-growth
```

**Response:**
```json
[
  {
    "date": "2024-01-01",
    "count": 3
  },
  {
    "date": "2024-01-02", 
    "count": 5
  }
]
```

### Admin Analytics - Plant Submission Trends
```http
GET /api/admin/analytics/plant-trends
```

**Response:**
```json
[
  {
    "date": "2024-01-01",
    "verified": 8,
    "pending": 2
  },
  {
    "date": "2024-01-02",
    "verified": 12,
    "pending": 3
  }
]
```

### Admin Analytics - Top Plant Families
```http
GET /api/admin/analytics/top-families?limit=10
```

**Response:**
```json
[
  {
    "family": "Araceae",
    "count": 125
  },
  {
    "family": "Pothos",
    "count": 98
  }
]
```

### Admin Analytics - Curator Activity
```http
GET /api/admin/analytics/curator-activity
```

**Response:**
```json
[
  {
    "curatorId": 1,
    "curatorName": "Admin User",
    "plantsApproved": 45,
    "usersPromoted": 2
  }
]
```

### Admin Analytics - Pending Approval Count
```http
GET /api/admin/analytics/pending-count
```

**Response:**
```json
{
  "count": 30
}
```

### Admin Analytics - System Alerts
```http
GET /api/admin/analytics/system-alerts
```

**Response:**
```json
[
  {
    "type": "warning",
    "message": "High number of pending plant approvals: 52",
    "timestamp": "2024-01-22T10:30:00Z"
  },
  {
    "type": "info",
    "message": "No curator activity in the last 30 days",
    "timestamp": "2024-01-22T10:30:00Z"
  }
]
```

### Admin Audit Logs
```http
GET /api/admin/audit-logs
```

**Query Parameters:**
- `action` (string): Filter by action type (e.g., 'user_promoted', 'plant_approved')
- `entityType` (string): Filter by entity type (user, plant, plant_instance, propagation, system)
- `entityId` (number): Filter by specific entity ID
- `performedBy` (number): Filter by curator who performed the action
- `success` (boolean): Filter by success/failure status
- `startDate` (string): Filter actions after this date (ISO 8601)
- `endDate` (string): Filter actions before this date (ISO 8601)
- `limit` (number): Limit results (default: 50, max: 100)
- `offset` (number): Pagination offset

**Response:**
```json
{
  "auditLogs": [
    {
      "id": 1,
      "action": "user_promoted",
      "entityType": "user",
      "entityId": 42,
      "performedBy": 1,
      "timestamp": "2024-01-22T10:30:00Z",
      "details": {
        "previousRole": "user",
        "newRole": "curator",
        "reason": "Promoted for plant expertise"
      },
      "ipAddress": "192.168.1.100",
      "userAgent": "Mozilla/5.0...",
      "success": true,
      "errorMessage": null,
      "performer": {
        "id": 1,
        "name": "Admin User",
        "email": "admin@example.com"
      }
    },
    {
      "id": 2,
      "action": "plant_approved",
      "entityType": "plant",
      "entityId": 123,
      "performedBy": 1,
      "timestamp": "2024-01-22T09:15:00Z",
      "details": {
        "plantName": "Monstera deliciosa 'Thai Constellation'",
        "submittedBy": 15,
        "modifications": ["Updated care instructions", "Corrected cultivar name"]
      },
      "ipAddress": "192.168.1.100",
      "userAgent": "Mozilla/5.0...",
      "success": true,
      "errorMessage": null,
      "performer": {
        "id": 1,
        "name": "Admin User",
        "email": "admin@example.com"
      }
    }
  ],
  "pagination": {
    "total": 150,
    "limit": 50,
    "offset": 0,
    "hasMore": true
  }
}
```

### Create Audit Log Entry
```http
POST /api/admin/audit-logs
Content-Type: application/json

{
  "action": "plant_rejected",
  "entityType": "plant",
  "entityId": 124,
  "details": {
    "reason": "Duplicate entry",
    "existingPlantId": 45,
    "submittedBy": 20
  },
  "success": true
}
```

**Response:**
```json
{
  "success": true,
  "auditLogId": 151,
  "message": "Audit log entry created successfully"
}
```

## 🏥 System API

### Health Check
```http
GET /api/health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-22T10:30:00Z",
  "version": "0.1.0",
  "environment": "production",
  "uptime": 86400,
  "database": {
    "status": "connected",
    "responseTime": 15
  },
  "metrics": {
    "memoryUsage": {
      "rss": 134217728,
      "heapTotal": 67108864,
      "heapUsed": 45088768
    },
    "requestCount": 1250,
    "errorCount": 2,
    "averageResponseTime": 125
  }
}
```

## 📝 Error Responses

All API endpoints return consistent error responses:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "Specific field error"
  }
}
```

### Common Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `UNAUTHORIZED` | 401 | Authentication required |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `CURATOR_REQUIRED` | 403 | Curator privileges required |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid input data |
| `DUPLICATE_ENTRY` | 409 | Resource already exists |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

## 🔄 Rate Limiting

API endpoints are rate limited to prevent abuse:

- **Authentication endpoints**: 5 requests per minute per IP
- **Email verification endpoints**: 5 verification attempts per hour, 60-second cooldown for resend
- **General API endpoints**: 100 requests per minute per user
- **File upload endpoints**: 10 requests per minute per user

Rate limit headers are included in responses:
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642867200
```

## 📋 Data Validation

All API endpoints validate input data using Zod schemas. Common validation rules:

- **Email**: Must be valid email format
- **Password**: Minimum 8 characters
- **Plant names**: 1-100 characters, no special characters except spaces and hyphens
- **Images**: Base64 encoded, max 5MB when decoded
- **Dates**: ISO 8601 format (YYYY-MM-DDTHH:mm:ssZ)

## 🔗 Webhooks (Future Feature)

Planned webhook support for external integrations:

- Plant care reminders
- Propagation status updates
- Data export completion
- System health alerts

---

For more information, see the [Getting Started Guide](./GETTING_STARTED.md) or [open an issue](https://github.com/your-repo/fancy-planties/issues).