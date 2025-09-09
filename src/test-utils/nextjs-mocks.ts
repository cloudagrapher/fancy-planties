/**
 * Next.js Mocks for Testing
 * Provides mock implementations for Next.js specific modules
 */

import React from 'react';

// Mock Next.js Image component
export const Image = React.forwardRef<
  HTMLImageElement,
  React.ImgHTMLAttributes<HTMLImageElement> & {
    src: string;
    alt: string;
    width?: number | string;
    height?: number | string;
    fill?: boolean;
    priority?: boolean;
    placeholder?: 'blur' | 'empty';
    blurDataURL?: string;
    sizes?: string;
    quality?: number;
    loader?: (props: { src: string; width: number; quality?: number }) => string;
    onLoad?: (event: React.SyntheticEvent<HTMLImageElement>) => void;
    onError?: (event: React.SyntheticEvent<HTMLImageElement>) => void;
  }
>((props, ref) => {
  const { src, alt, width, height, fill, priority, placeholder, blurDataURL, sizes, quality, loader, onLoad, onError, ...rest } = props;
  
  // eslint-disable-next-line @next/next/no-img-element
  return <img ref={ref} src={src} alt={alt} {...rest} />;
});

Image.displayName = 'NextImage';

// Mock Next.js navigation hooks
export const useRouter = () => ({
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
});

export const usePathname = () => '/dashboard/plants';

export const useSearchParams = () => {
  const searchParams = new URLSearchParams();
  return {
    get: (key: string) => searchParams.get(key),
    getAll: (key: string) => searchParams.getAll(key),
    has: (key: string) => searchParams.has(key),
    keys: () => searchParams.keys(),
    values: () => searchParams.values(),
    entries: () => searchParams.entries(),
    forEach: (callback: (value: string, key: string) => void) => searchParams.forEach(callback),
    toString: () => searchParams.toString(),
  };
};

export const useParams = () => ({});

// Mock Next.js Request and Response for API route testing
export class NextRequest extends Request {
  public nextUrl: URL;
  public geo?: {
    city?: string;
    country?: string;
    region?: string;
    latitude?: string;
    longitude?: string;
  };
  public ip?: string;

  constructor(input: RequestInfo | URL, init?: RequestInit) {
    super(input, init);
    this.nextUrl = new URL(input instanceof Request ? input.url : input.toString());
  }

  static from(request: Request): NextRequest {
    return new NextRequest(request.url, {
      method: request.method,
      headers: request.headers,
      body: request.body,
    });
  }
}

export class NextResponse extends Response {
  static json(object: any, init?: ResponseInit): NextResponse {
    const response = new NextResponse(JSON.stringify(object), {
      ...init,
      headers: {
        'content-type': 'application/json',
        ...init?.headers,
      },
    });
    return response;
  }

  static redirect(url: string | URL, init?: ResponseInit): NextResponse {
    return new NextResponse(null, {
      ...init,
      status: init?.status || 302,
      headers: {
        location: url.toString(),
        ...init?.headers,
      },
    });
  }

  static rewrite(destination: string | URL, init?: ResponseInit): NextResponse {
    return new NextResponse(null, {
      ...init,
      headers: {
        'x-middleware-rewrite': destination.toString(),
        ...init?.headers,
      },
    });
  }

  static next(init?: ResponseInit): NextResponse {
    return new NextResponse(null, {
      ...init,
      headers: {
        'x-middleware-next': '1',
        ...init?.headers,
      },
    });
  }
}

// Mock Next.js headers
export const headers = () => {
  const headerMap = new Map([
    ['user-agent', 'Mozilla/5.0 (Test Environment)'],
    ['accept', 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'],
    ['accept-language', 'en-US,en;q=0.5'],
  ]);

  return {
    get: (key: string) => headerMap.get(key.toLowerCase()) || null,
    has: (key: string) => headerMap.has(key.toLowerCase()),
    keys: () => Array.from(headerMap.keys()),
    values: () => Array.from(headerMap.values()),
    entries: () => Array.from(headerMap.entries()),
    forEach: (callback: (value: string, key: string) => void) => {
      headerMap.forEach(callback);
    },
  };
};

// Mock Next.js cookies
export const cookies = () => {
  const cookieMap = new Map<string, string>();

  return {
    get: (key: string) => ({ name: key, value: cookieMap.get(key) || '' }),
    set: (key: string, value: string) => cookieMap.set(key, value),
    delete: (key: string) => cookieMap.delete(key),
    has: (key: string) => cookieMap.has(key),
    getAll: () => Array.from(cookieMap.entries()).map(([name, value]) => ({ name, value })),
    clear: () => cookieMap.clear(),
  };
};

// Default export for compatibility
export default {
  Image,
  useRouter,
  usePathname,
  useSearchParams,
  useParams,
  NextRequest,
  NextResponse,
  headers,
  cookies,
};