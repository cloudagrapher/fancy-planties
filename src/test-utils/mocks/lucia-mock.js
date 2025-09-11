// Mock for Lucia auth package to handle ES module issues in Jest

export class Lucia {
  constructor(adapter, options = {}) {
    this.adapter = adapter;
    this.options = options;
  }

  async createSession(userId, attributes = {}) {
    return {
      id: 'mock-session-' + userId,
      userId,
      expiresAt: new Date(Date.now() + 86400000), // 24 hours
      ...attributes
    };
  }

  async validateSession(sessionId) {
    if (sessionId && sessionId.startsWith('mock-session-')) {
      const userId = sessionId.replace('mock-session-', '');
      return {
        session: {
          id: sessionId,
          userId,
          expiresAt: new Date(Date.now() + 86400000),
          fresh: true
        },
        user: {
          id: userId,
          email: 'test@example.com',
          name: 'Test User'
        }
      };
    }
    return {
      session: null,
      user: null
    };
  }

  async invalidateSession(sessionId) {
    return true;
  }

  async invalidateUserSessions(userId) {
    return true;
  }

  createSessionCookie(session) {
    return {
      name: 'session',
      value: session.id,
      attributes: {
        httpOnly: true,
        secure: false,
        path: '/',
        maxAge: 86400
      }
    };
  }

  createBlankSessionCookie() {
    return {
      name: 'session',
      value: '',
      attributes: {
        httpOnly: true,
        secure: false,
        path: '/',
        maxAge: 0
      }
    };
  }
}

export class PostgresJsAdapter {
  constructor(client, config) {
    this.client = client;
    this.config = config;
  }
}

// Default export
export default {
  Lucia,
  PostgresJsAdapter
};