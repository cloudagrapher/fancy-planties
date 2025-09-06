-- Initialize database with Row Level Security
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable Row Level Security
ALTER DATABASE fancy_planties SET row_security = on;