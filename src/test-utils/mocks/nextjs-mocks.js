// Next.js specific mocks for testing

const navigationMock = {
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn(),
    pathname: '/dashboard/plants',
    query: {},
    asPath: '/dashboard/plants',
    route: '/dashboard/plants',
    events: {
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
    },
  }),
  usePathname: () => '/dashboard/plants',
  useSearchParams: () => {
    const searchParams = new URLSearchParams();
    return {
      get: (key) => searchParams.get(key),
      getAll: (key) => searchParams.getAll(key),
      has: (key) => searchParams.has(key),
      keys: () => searchParams.keys(),
      values: () => searchParams.values(),
      entries: () => searchParams.entries(),
      forEach: (callback) => searchParams.forEach(callback),
      toString: () => searchParams.toString(),
    };
  },
  useParams: () => ({}),
};

const imageMock = (() => {
  const React = require('react');
  return React.forwardRef((props, ref) => {
    const { src, alt, width, height, fill, priority, placeholder, blurDataURL, sizes, quality, loader, onLoad, onError, ...rest } = props;
    return React.createElement('img', { ref, src, alt, ...rest });
  });
})();

const serverMock = {
  NextRequest: class MockNextRequest {
    constructor(input, init = {}) {
      this.url = input instanceof MockNextRequest ? input.url : input.toString();
      this.method = init.method || 'GET';
      this.headers = new Headers(init.headers || {});
      this.body = init.body || null;
      this.nextUrl = new URL(this.url);
    }
    
    async json() {
      return this.body ? JSON.parse(this.body) : {};
    }
    
    async text() {
      return this.body ? this.body.toString() : '';
    }
    
    static from(request) {
      return new MockNextRequest(request.url, {
        method: request.method,
        headers: request.headers,
        body: request.body,
      });
    }
  },

  NextResponse: class MockNextResponse {
    constructor(body, init = {}) {
      this.body = body;
      this.status = init.status || 200;
      this.statusText = init.statusText || 'OK';
      this.headers = new Headers(init.headers || {});
      this.ok = this.status >= 200 && this.status < 300;
    }
    
    static json(object, init = {}) {
      return new MockNextResponse(JSON.stringify(object), {
        ...init,
        headers: {
          'content-type': 'application/json',
          ...init?.headers,
        },
      });
    }

    static redirect(url, init = {}) {
      return new MockNextResponse(null, {
        ...init,
        status: init?.status || 302,
        headers: {
          location: url.toString(),
          ...init?.headers,
        },
      });
    }
    
    async json() {
      return JSON.parse(this.body);
    }
    
    async text() {
      return this.body;
    }
  }
};

const headersMock = {
  headers: () => {
    const headerMap = new Map([
      ['user-agent', 'Mozilla/5.0 (Test Environment)'],
      ['accept', 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'],
      ['accept-language', 'en-US,en;q=0.5'],
    ]);

    return {
      get: (key) => headerMap.get(key.toLowerCase()) || null,
      has: (key) => headerMap.has(key.toLowerCase()),
      keys: () => Array.from(headerMap.keys()),
      values: () => Array.from(headerMap.values()),
      entries: () => Array.from(headerMap.entries()),
      forEach: (callback) => headerMap.forEach(callback),
    };
  },

  cookies: () => {
    const cookieMap = new Map();
    return {
      get: (key) => ({ name: key, value: cookieMap.get(key) || '' }),
      set: (key, value) => cookieMap.set(key, value),
      delete: (key) => cookieMap.delete(key),
      has: (key) => cookieMap.has(key),
      getAll: () => Array.from(cookieMap.entries()).map(([name, value]) => ({ name, value })),
      clear: () => cookieMap.clear(),
    };
  }
};

module.exports = {
  navigationMock,
  imageMock,
  serverMock,
  headersMock,
};