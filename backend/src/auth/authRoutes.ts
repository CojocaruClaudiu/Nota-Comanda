import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();
const router = Router();

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: "Email and password required" });

  const user = await prisma.user.findUnique({
    where: { email },
    include: { roles: { include: { role: true } } },
  });
  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(401).json({ error: "Invalid credentials" });

  const roleNames = user.roles.map((r) => r.role.name);
  const token = jwt.sign(
    { sub: user.id, email: user.email, roles: roleNames },
    process.env.JWT_SECRET || "change_me_now",
    { expiresIn: "1d" }
  );

  res.json({
    accessToken: token,
    user: { id: user.id, email: user.email, name: user.name, roles: roleNames },
  });
});

router.get("/me", async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer "))
    return res.status(401).json({ error: "Missing token" });
  const token = auth.slice(7);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "change_me_now") as any;
    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
      include: { roles: { include: { role: true } } },
    });
    if (!user) return res.status(401).json({ error: "User not found" });
    const roleNames = user.roles.map((r) => r.role.name);
    res.json({ id: user.id, email: user.email, name: user.name, roles: roleNames });
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
});

export default router;