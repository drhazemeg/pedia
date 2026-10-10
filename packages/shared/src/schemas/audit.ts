import { AUDIT_ACTIONS } from "@pedia/shared/constants";
import { z } from "zod";

export const auditActionSchema = z.enum(AUDIT_ACTIONS);
