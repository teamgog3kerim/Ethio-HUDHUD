import { runRenewalDelivery } from "../lib/renewal-delivery";
import { pool } from "@workspace/db";

// One-shot entrypoint for an externally scheduled runner using the same DB and
// secrets. Never expose an unauthenticated HTTP endpoint for dispatch.
try { await runRenewalDelivery(); }
finally { await pool.end(); }
