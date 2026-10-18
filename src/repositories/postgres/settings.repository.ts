import type { SettingsRepository } from "../types.js";
import { notImplementedRepository } from "./stub.js";

export const postgresSettingsRepository = notImplementedRepository<SettingsRepository>("settings");
