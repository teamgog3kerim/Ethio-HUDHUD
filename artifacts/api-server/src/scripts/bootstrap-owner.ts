import { bootstrapConfiguredOwner } from "../lib/admin-auth";
import { logger } from "../lib/logger";
import { pool } from "@workspace/db";
bootstrapConfiguredOwner().then(status => {
  logger.info({ status }, "Owner bootstrap result");
}).catch(err => {
  logger.error({ err }, "Owner bootstrap failed");
  process.exitCode = 1;
}).finally(() => pool.end());
