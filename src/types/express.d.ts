import { Request as ExpressRequest, Response as ExpressResponse, Router as ExpressRouter, Application as ExpressApplication } from 'express';

declare global {
  namespace Express {
    interface Request extends ExpressRequest {
      user?: any;
    }
    interface Response extends ExpressResponse {}
    interface Router extends ExpressRouter {}
    interface Application extends ExpressApplication {}
  }
}

declare module 'express' {
  export interface Request extends ExpressRequest {
    user?: any;
  }
  export interface Response extends ExpressResponse {}
  export interface Router extends ExpressRouter {}
  export interface Application extends ExpressApplication {}
  
  export function json(): any;
  export function urlencoded(options?: any): any;
  export function static(root: string, options?: any): any;
  export function Router(): ExpressRouter;
  export function application(): ExpressApplication;
  
  export default function express(): ExpressApplication;
} 