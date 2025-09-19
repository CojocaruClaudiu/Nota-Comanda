import { RoleName } from "@prisma/client";

export type JwtPayload = {
  sub: number;             // user id
  email: string;
  roles: RoleName[];
  iat: number;
  exp: number;
};

export type ProjectStatus = 'PLANNING' | 'IN_PROGRESS' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED';

export type ClientLocation = {
  id: string;
  clientId: string;
  client?: {
    id: string;
    name: string;
  };
  name: string;
  address: string;
  createdAt: Date;
  updatedAt: Date;
};

export type Project = {
  id: number;
  name: string;
  description?: string;
  status: ProjectStatus;
  startDate?: Date;
  endDate?: Date;
  budget?: number;
  currency?: 'RON' | 'EUR';
  clientId?: string;
  client?: {
    id: string;
    name: string;
  };
  location?: string;
  createdAt: Date;
  updatedAt: Date;
};
