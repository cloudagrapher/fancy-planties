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

**Response:**
```json
{
  "plantInstances": [
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
      }
    }
  ]
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
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid input data |
| `DUPLICATE_ENTRY` | 409 | Resource already exists |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

## 🔄 Rate Limiting

API endpoints are rate limited to prevent abuse:

- **Authentication endpoints**: 5 requests per minute per IP
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