import { createAuth } from "@pedia/auth";
import { createDb } from "@pedia/db";

import { ENV } from "./env.server";

export const db = createDb(ENV);
export const auth = createAuth(ENV, db);
