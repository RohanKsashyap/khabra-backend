import { RequestHandler } from 'express';

declare module 'express' {
  export interface Request {
    user?: any;
  }
}

declare module 'express-mongo-sanitize' {
  const mongoSanitize: () => RequestHandler;
  export = mongoSanitize;
}

declare module 'xss-clean' {
  const xss: () => RequestHandler;
  export = xss;
}

declare module 'hpp' {
  const hpp: () => RequestHandler;
  export = hpp;
}

declare module 'helmet' {
  const helmet: () => RequestHandler;
  export = helmet;
}

declare module 'express-rate-limit' {
  function rateLimit(options: any): RequestHandler;
  export = rateLimit;
}

declare module 'cookie-parser' {
  function cookieParser(secret?: string | string[]): RequestHandler;
  export = cookieParser;
}

declare module 'compression' {
  function compression(options?: any): RequestHandler;
  export = compression;
} 