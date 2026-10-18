import bcrypt from "bcryptjs";
import { Router } from "express";
import { z } from "zod";
import { ageOn, MIN_AGE } from "../domain/user.js";
import { requireAuth } from "../middleware/auth.js";
import { HttpError } from "../middleware/error-handler.js";
import { authLimiter } from "../middleware/rate-limit.js";
import { repositories } from "../repositories/index.js";
import { endSession, startSession } from "../services/session.js";
import { bdPhone, savedAddressSchema } from "../utils/validation.js";

export const authRouter = Router();

const email = z.string().trim().toLowerCase().email().max(254);
const password = z.string().min(8, "Password must be at least 8 characters").max(128);
const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email,
  password,
  phone: bdPhone,
  dateOfBirth: z.iso.date().transform((d) => new Date(`${d}T00:00:00Z`)),
});

const loginSchema = z.object({ email, password: z.string().min(1).max(128) });

const updateMeSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  phone: bdPhone.optional(),
  address: savedAddressSchema.nullable().optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: password,
});

authRouter.post("/register", authLimiter, async (req, res) => {
  const { password, dateOfBirth, ...data } = registerSchema.parse(req.body);

  if (ageOn(dateOfBirth) < MIN_AGE) {
    throw new HttpError(403, `You must be at least ${MIN_AGE} years old to register`);
  }

  const user = await repositories.users.create({
    ...data,
    address: null,
    dateOfBirth,
    role: "customer",
    passwordHash: await bcrypt.hash(password, 12),
  });

  startSession(res, user.id);
  res.status(201).json({ data: user });
});

authRouter.post("/login", authLimiter, async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);
  const user = await repositories.users.findByEmailWithPassword(email);

  // Same message for unknown email and wrong password, so accounts can't be enumerated.
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new HttpError(401, "Invalid email or password");
  }

  const { passwordHash: _omit, ...publicUser } = user;
  startSession(res, user.id);
  res.json({ data: publicUser });
});

authRouter.post("/logout", (_req, res) => {
  endSession(res);
  res.status(204).end();
});

authRouter.get("/me", requireAuth, (req, res) => {
  res.json({ data: req.user });
});

authRouter.patch("/me", requireAuth, async (req, res) => {
  const data = updateMeSchema.parse(req.body);
  const user = await repositories.users.update(req.user!.id, data);
  res.json({ data: user });
});

authRouter.post("/change-password", requireAuth, authLimiter, async (req, res) => {
  const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
  const user = await repositories.users.findByEmailWithPassword(req.user!.email);
  if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
    throw new HttpError(400, "Current password is incorrect");
  }
  await repositories.users.setPasswordHash(user.id, await bcrypt.hash(newPassword, 12));
  res.status(204).end();
});
