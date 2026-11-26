import {env} from '@moneta/environment';import {getPlatformUser} from '@moneta/auth';import {createApiHandler} from './api-handler.js';
export const platformRoute=(request:Request)=>createApiHandler({env,resolveUser:()=>getPlatformUser()})(request);
