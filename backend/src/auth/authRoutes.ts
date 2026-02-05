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

router.post("/change-password", async (req, res) => {
  const userId = (req as any).user?.sub;
  const { currentPassword, newPassword } = req.body || {};

  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: "Current and new password required" });
  }
  if (String(newPassword).length < 8) {
    return res.status(400).json({ error: "New password must be at least 8 characters" });
  }

  const user = await prisma.user.findUnique({ where: { id: Number(userId) } });
  if (!user) return res.status(404).json({ error: "User not found" });

  const valid = await bcrypt.compare(String(currentPassword), user.passwordHash);
  if (!valid) return res.status(401).json({ error: "Invalid current password" });

  const passwordHash = await bcrypt.hash(String(newPassword), 10);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

  return res.json({ ok: true });
});

export default router;