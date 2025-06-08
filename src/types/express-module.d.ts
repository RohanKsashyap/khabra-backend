declare module 'express' {
  import { Application as CoreApplication, Request, Response, Router as CoreRouter, RequestHandler, IRouter, NextFunction } from 'express-serve-static-core';
  
  function express(): Application;
  
  namespace express {
    function json(): RequestHandler;
    function urlencoded(options?: any): RequestHandler;
    function static(root: string, options?: any): RequestHandler;
    function Router(): CoreRouter;
    function application(): Application;
  }

  interface Application extends CoreApplication {
    use(handler: RequestHandler): this;
    use(handler: ErrorRequestHandler): this;
    use(path: string, handler: RequestHandler): this;
    use(path: string, handler: ErrorRequestHandler): this;
    use(path: string, router: CoreRouter): this;
    use(router: CoreRouter): this;
    listen(port: number, callback?: () => void): any;
    listen(port: number, hostname: string, callback?: () => void): any;
  }

  interface ErrorRequestHandler {
    (err: any, req: Request, res: Response, next: (err?: any) => void): any;
  }
  
  export = express;
} 