import { runStudyDelivery } from "../lib/study-reminder-delivery";
import { pool } from "@workspace/db";

// For an authorized scheduled runner with the same DB and SESSION_SECRET.
// No public dispatch endpoint, and no session/learner data is printed.
try { await runStudyDelivery(); }
finally { await pool.end(); }
