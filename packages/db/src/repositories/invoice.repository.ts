// packages/db/src/repositories/invoice.repository.ts
import { db, withTransaction } from "@pedia/db";
import type { Transaction } from "@pedia/db";
import { queryCache } from "@pedia/db/cache";
import { invoiceItems, invoices, payments } from "@pedia/db/schema";
import type {
  NewInvoice,
  Invoice,
  NewInvoiceItem,
  NewPayment,
  Payment,
} from "@pedia/db/schema/types";
import { and, eq, sql } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";

import { BaseRepository } from "./base.repository";

const CACHE_TTL = 60_000;

export class InvoiceRepository extends BaseRepository {
  protected readonly table = invoices;
  protected readonly idColumn: PgColumn = invoices.id;
  protected readonly tableName = "invoices";

  async findById(
    id: string
  ): Promise<(Invoice & { items: unknown[]; payments: Payment[] }) | null> {
    const key = `invoice:${id}`;
    const cached = queryCache.get<
      (Invoice & { items: unknown[]; payments: Payment[] }) | null
    >(key);
    if (cached) return cached;

    const row = await db.query.invoices.findFirst({
      where: { id },
      with: { items: true, payments: true, patient: true },
    });
    if (!row) return null;

    queryCache.set(key, row, {
      ttl: CACHE_TTL,
      tags: [`invoice:${id}`, `patient:${row.patientId}:invoices`],
    });
    return row;
  }

  async findByNumber(invoiceNumber: string): Promise<Invoice | null> {
    const rows = await this.findManyImpl(
      eq(invoices.invoiceNumber, invoiceNumber),
      { limit: 1 }
    );
    return rows[0] ? (rows[0] as Invoice) : null;
  }

  async findByPatient(
    patientId: string,
    options: { limit?: number; offset?: number } = {}
  ) {
    const { limit = 50, offset = 0 } = options;
    const key = `invoice:patient:${patientId}:${limit}:${offset}`;
    const cached = queryCache.get<{ data: Invoice[]; total: number }>(key);
    if (cached) return cached;

    const [rows, total] = await Promise.all([
      db.query.invoices.findMany({
        where: { patientId },
        limit,
        offset,
        orderBy: { issuedAt: "desc" },
        with: { items: true, payments: true },
      }),
      this.count(eq(invoices.patientId, patientId)),
    ]);

    const result = { data: rows as Invoice[], total };
    queryCache.set(key, result, {
      ttl: CACHE_TTL,
      tags: [`patient:${patientId}:invoices`],
    });
    return result;
  }

  async create(
    data: NewInvoice,
    items: Omit<NewInvoiceItem, "invoiceId">[]
  ): Promise<Invoice> {
    const result = await withTransaction(async (tx: Transaction) => {
      const [invoice] = await tx.insert(invoices).values(data).returning();
      if (!invoice) throw new Error("Failed to create invoice");

      if (items.length > 0) {
        await tx.insert(invoiceItems).values(
          items.map((item) => ({
            ...item,
            invoiceId: invoice.id,
          }))
        );
      }
      return invoice;
    });

    queryCache.invalidateTag(`patient:${result.patientId}:invoices`);
    queryCache.invalidateTag("invoice:stats");
    return result;
  }

  async recordPayment(data: NewPayment): Promise<Payment> {
    const result = await withTransaction(async (tx: Transaction) => {
      const [payment] = await tx.insert(payments).values(data).returning();
      if (!payment) throw new Error("Failed to record payment");

      // Recompute invoice totals
      const [paidRow] = await tx
        .select({
          paid: sql<string>`COALESCE(sum(${payments.amount}), 0)::text`,
        })
        .from(payments)
        .where(
          and(
            eq(payments.invoiceId, data.invoiceId),
            eq(payments.status, "completed")
          )
        );

      const paid = Number(paidRow?.paid ?? 0);
      const [inv] = await tx
        .select()
        .from(invoices)
        .where(eq(invoices.id, data.invoiceId))
        .limit(1);
      if (inv) {
        const grand = Number(inv.grandTotal);
        const balance = Math.max(0, grand - paid);
        const status =
          balance === 0 ? "paid" : paid > 0 ? "partially_paid" : inv.status;
        await tx
          .update(invoices)
          .set({
            amountPaid: paid.toFixed(2),
            balanceDue: balance.toFixed(2),
            status,
            updatedAt: new Date(),
          })
          .where(eq(invoices.id, data.invoiceId));
      }
      return payment;
    });

    queryCache.invalidate(`invoice:${data.invoiceId}`);
    queryCache.invalidateTag(`patient:${data.patientId}:invoices`);
    return result;
  }

  async update(id: string, data: Partial<Invoice>): Promise<Invoice | null> {
    const result = await withTransaction(async (tx: Transaction) => {
      const [updatedInvoice] = await tx
        .update(invoices)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(invoices.id, id))
        .returning();

      return updatedInvoice ?? null;
    });

    if (!result) return null;

    queryCache.invalidate(`invoice:${id}`);
    queryCache.invalidateTag(`patient:${result.patientId}:invoices`);
    queryCache.invalidateTag("invoice:stats");
    return result;
  }

  async delete(id: string): Promise<boolean> {
    const result = await withTransaction(async (tx: Transaction) => {
      const [invoice] = await tx
        .select({ patientId: invoices.patientId })
        .from(invoices)
        .where(eq(invoices.id, id))
        .limit(1);

      if (!invoice) return false;

      await tx.delete(invoiceItems).where(eq(invoiceItems.invoiceId, id));
      await tx.delete(payments).where(eq(payments.invoiceId, id));
      const [deletedInvoice] = await tx
        .delete(invoices)
        .where(eq(invoices.id, id))
        .returning();

      if (!deletedInvoice) return false;
      return { deleted: true, patientId: invoice.patientId };
    });

    if (!result) return false;

    queryCache.invalidate(`invoice:${id}`);
    queryCache.invalidateTag(`patient:${result.patientId}:invoices`);
    queryCache.invalidateTag("invoice:stats");
    return true;
  }

  async getStats(): Promise<{
    total: number;
    draft: number;
    issued: number;
    paid: number;
    overdue: number;
    totalRevenue: string;
    totalOutstanding: string;
  }> {
    const key = "invoice:stats";
    const cached = queryCache.get<{
      total: number;
      draft: number;
      issued: number;
      paid: number;
      overdue: number;
      totalRevenue: string;
      totalOutstanding: string;
    }>(key);
    if (cached) return cached;

    const [row] = await db
      .select({
        total: sql<number>`count(*)::int`,
        draft: sql<number>`count(*) filter (where ${invoices.status} = 'draft')::int`,
        issued: sql<number>`count(*) filter (where ${invoices.status} = 'issued')::int`,
        paid: sql<number>`count(*) filter (where ${invoices.status} = 'paid')::int`,
        overdue: sql<number>`count(*) filter (where ${invoices.status} = 'overdue')::int`,
        totalRevenue: sql<string>`COALESCE(sum(${invoices.amountPaid}), 0)::text`,
        totalOutstanding: sql<string>`COALESCE(sum(${invoices.balanceDue}), 0)::text`,
      })
      .from(invoices);

    const result = row ?? {
      total: 0,
      draft: 0,
      issued: 0,
      paid: 0,
      overdue: 0,
      totalRevenue: "0",
      totalOutstanding: "0",
    };
    queryCache.set(key, result, {
      ttl: CACHE_TTL,
      tags: ["invoice:stats"],
    });
    return result;
  }

  async getByDateRange(startDate: Date, endDate: Date) {
    const rows = await db.query.invoices.findMany({
      where: { issuedAt: { gte: startDate, lte: endDate } },
      orderBy: { issuedAt: "desc" },
    });
    return rows;
  }
}

export const invoiceRepository = new InvoiceRepository(db);
