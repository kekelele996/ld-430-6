import { ForbiddenException, Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { UserRole } from '../types/enums';

@Injectable()
export class RbacMiddleware implements NestMiddleware {
  use(req: Request & { user?: { role: UserRole } }, _res: Response, next: NextFunction) {
    const routePath = req.originalUrl ?? req.url ?? req.path;

    if (routePath.includes('/reviews') && req.method !== 'GET') {
      if (req.user?.role !== UserRole.Admin && req.user?.role !== UserRole.Moderator) {
        throw new ForbiddenException('只有管理员和审核员才能执行审核操作');
      }
    }

    if (req.method === 'POST' && routePath.includes('/downloads')) {
      return next();
    }
    const writeMethod = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
    if (writeMethod && req.user?.role === UserRole.Viewer) {
      throw new ForbiddenException('Viewer 只能浏览和下载免费素材');
    }
    next();
  }
}
