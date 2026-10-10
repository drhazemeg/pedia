import type { Session } from "@pedia/auth";
import type { Database } from "@pedia/db";

import type { Repositories } from "./repositories";

export type Context = {
  session: Session | null;
  user: Session["user"] | null;
  db: Database;
  clinicId?: string | null;
  repositories?: Repositories;
};
