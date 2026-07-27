import { Request, Response, NextFunction } from "express";

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.adminUser) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  next();
}

export function requireAdminRole(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.adminUser) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  if (req.session.adminUser.role !== "Admin") {
    res.status(403).json({ error: "Insufficient permissions" });
    return;
  }
  next();
}

declare module "express-session" {
  interface SessionData {
    adminUser?: {
      id: number;
      username: string;
      displayName: string | null;
      role: string | null;
      station: string | null;
    };
  }
}
