import type { Session } from "@pedia/auth";
import type { Database } from "@pedia/db";

export type Context = {
  session: Session | null;
  db: Database;
};
