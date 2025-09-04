import { RoleName } from "@prisma/client";

export type JwtPayload = {
  sub: number;             // user id
  email: string;
  roles: RoleName[];
  iat: number;
  exp: number;
};
