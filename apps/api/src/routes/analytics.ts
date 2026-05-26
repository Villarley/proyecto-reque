import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { and, asc, desc, eq, gte, isNotNull, sql } from "drizzle-orm";
import type { LevelTier } from "@stellar-orbit/types";
import type { AppVariables } from "../middleware/auth.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { db } from "../db/index.js";
import { attendance, chapters, events, levels, pointsLedger, users } from "../db/schema.js";
import { tierForTotalPoints } from "../lib/tiers.js";

const csvEscapeCell = (value: string | number | boolean): string =>
  `"${String(value).replaceAll('"', '""')}"`;

const analyticsQuerySchema = z.object({
  chapterId: z.string().uuid().optional(),
});

export const analyticsRoutes = new Hono<{ Variables: AppVariables }>()
  .use("*", requireAuth)
  .use("*", requireRole(["global_admin"]))
  .get("/", zValidator("query", analyticsQuerySchema), async (c) => {
    const { chapterId } = c.req.valid("query");
    const chapterFilterUsers = chapterId ? eq(users.chapterId, chapterId) : undefined;
    const chapterFilterEvents = chapterId ? eq(events.chapterId, chapterId) : undefined;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30);

    const usersCountBase = db.select({ count: sql<number>`count(*)::int` }).from(users);
    const [userCount] = chapterFilterUsers
      ? await usersCountBase.where(chapterFilterUsers)
      : await usersCountBase;

    const [chapterCount] = await db.select({ count: sql<number>`count(*)::int` }).from(chapters);

    const eventsCountBase = db.select({ count: sql<number>`count(*)::int` }).from(events);
    const [eventCount] = chapterFilterEvents
      ? await eventsCountBase.where(chapterFilterEvents)
      : await eventsCountBase;

    const checkinWhereParts = chapterId
      ? [gte(attendance.checkedInAt, thirtyDaysAgo), eq(events.chapterId, chapterId)]
      : [gte(attendance.checkedInAt, thirtyDaysAgo)];

    const [checkins] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(attendance)
      .innerJoin(events, eq(attendance.eventId, events.id))
      .where(and(...checkinWhereParts));

    const pointsWhereParts = chapterId
      ? [gte(pointsLedger.createdAt, thirtyDaysAgo), eq(users.chapterId, chapterId)]
      : [gte(pointsLedger.createdAt, thirtyDaysAgo)];

    const [pointsRow] = await db
      .select({
        sum: sql<number>`coalesce(sum(${pointsLedger.delta}), 0)::int`,
      })
      .from(pointsLedger)
      .innerJoin(users, eq(users.id, pointsLedger.userId))
      .where(and(...pointsWhereParts));

    const activeWhereParts = chapterId
      ? [gte(attendance.checkedInAt, thirtyDaysAgo), eq(events.chapterId, chapterId)]
      : [gte(attendance.checkedInAt, thirtyDaysAgo)];

    const [activeAmbassadors] = await db
      .select({ count: sql<number>`count(distinct ${attendance.userId})::int` })
      .from(attendance)
      .innerJoin(events, eq(attendance.eventId, events.id))
      .where(and(...activeWhereParts));

    const levelsDescending = await db
      .select()
      .from(levels)
      .orderBy(desc(levels.minPoints));

    const userTotalsBaseQuery = db
      .select({
        userId: users.id,
        points: sql<number>`coalesce(sum(${pointsLedger.delta}), 0)::int`,
      })
      .from(users)
      .leftJoin(pointsLedger, eq(pointsLedger.userId, users.id));

    const userTotals = chapterFilterUsers
      ? await userTotalsBaseQuery.where(chapterFilterUsers).groupBy(users.id)
      : await userTotalsBaseQuery.groupBy(users.id);

    const levelDistributionByComputedTier: Record<LevelTier, number> = {
      explorer: 0,
      stellar_pioneer: 0,
      orbit_builder: 0,
      nova_ambassador: 0,
      ecosystem_leader: 0,
    };

    for (const row of userTotals) {
      const computedTier = tierForTotalPoints(row.points, levelsDescending);
      const bucket = levelDistributionByComputedTier[computedTier];
      if (bucket !== undefined) {
        levelDistributionByComputedTier[computedTier] = bucket + 1;
      }
    }

    const verifiedWhereParts = chapterId
      ? [chapterFilterUsers!, isNotNull(users.verifiedAt)]
      : [isNotNull(users.verifiedAt)];

    const [verifiedUsersCountRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(and(...verifiedWhereParts));

    const newUsersWhereParts = chapterId
      ? [chapterFilterUsers!, gte(users.createdAt, thirtyDaysAgo)]
      : [gte(users.createdAt, thirtyDaysAgo)];

    const [newUsersRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(and(...newUsersWhereParts));

    const chapterDistributionRows = await db
      .select({
        chapterId: chapters.id,
        chapterName: chapters.name,
        userCount: sql<number>`count(${users.id})::int`,
      })
      .from(chapters)
      .leftJoin(users, eq(users.chapterId, chapters.id))
      .where(chapterId ? eq(chapters.id, chapterId) : undefined)
      .groupBy(chapters.id, chapters.name)
      .orderBy(asc(chapters.name));

    const eventsCatBaseQuery = db
      .select({
        category: events.category,
        count: sql<number>`count(*)::int`,
      })
      .from(events);
    const eventsByCategoryRows = chapterFilterEvents
      ? await eventsCatBaseQuery.where(chapterFilterEvents).groupBy(events.category)
      : await eventsCatBaseQuery.groupBy(events.category);

    const totalCheckInsWhereParts = chapterId ? [eq(events.chapterId, chapterId)] : [];
    const [totalCheckInsRow] =
      totalCheckInsWhereParts.length === 0
        ? await db.select({ total: sql<number>`count(*)::int` }).from(attendance)
        : await db
            .select({ total: sql<number>`count(*)::int` })
            .from(attendance)
            .innerJoin(events, eq(attendance.eventId, events.id))
            .where(eq(events.chapterId, chapterId!));

    const totalCheckInsAllTime = totalCheckInsRow?.total ?? 0;
    const avgAttendancePerEvent =
      (eventCount?.count ?? 0) <= 0
        ? null
        : totalCheckInsAllTime / Number(eventCount?.count ?? 0);

    const visitGroupWhereParts =
      chapterId === undefined ? [] : [eq(events.chapterId, chapterId)];
    const attendanceVisitRows =
      visitGroupWhereParts.length === 0
        ? await db
            .select({
              userId: attendance.userId,
              ct: sql<number>`count(*)::int`,
            })
            .from(attendance)
            .groupBy(attendance.userId)
        : await db
            .select({
              userId: attendance.userId,
              ct: sql<number>`count(*)::int`,
            })
            .from(attendance)
            .innerJoin(events, eq(attendance.eventId, events.id))
            .where(eq(events.chapterId, chapterId!))
            .groupBy(attendance.userId);

    let attendeesWithOnePlus = 0;
    let repeatAttendees = 0;
    for (const row of attendanceVisitRows) {
      attendeesWithOnePlus += 1;
      if ((row.ct ?? 0) >= 2) {
        repeatAttendees += 1;
      }
    }
    const repeatAttendanceRate =
      attendeesWithOnePlus === 0 ? null : repeatAttendees / attendeesWithOnePlus;

    const lifecycleChapterFilter = chapterId
      ? sql`AND ${events.chapterId} = ${chapterId}`
      : sql``;

    const [lifecycleRow] = await db.execute<{ avg_days: string | null }>(sql`
      WITH ranked AS (
        SELECT
          ${attendance.userId} AS user_id,
          ${attendance.checkedInAt} AS checked_in_at,
          ROW_NUMBER() OVER (
            PARTITION BY ${attendance.userId}
            ORDER BY ${attendance.checkedInAt} ASC
          ) AS rn
        FROM ${attendance}
        INNER JOIN ${events} ON ${attendance.eventId} = ${events.id}
        WHERE 1 = 1 ${lifecycleChapterFilter}
      ),
      pairs AS (
        SELECT
          user_id,
          MAX(checked_in_at) FILTER (WHERE rn = 1) AS first_at,
          MAX(checked_in_at) FILTER (WHERE rn = 2) AS second_at
        FROM ranked
        WHERE rn <= 2
        GROUP BY user_id
        HAVING COUNT(*) >= 2
      )
      SELECT AVG(
        EXTRACT(EPOCH FROM (second_at - first_at)) / 86400.0
      )::float AS avg_days
      FROM pairs
    `);

    const avgDaysBetweenFirstAndSecondEvent =
      lifecycleRow?.avg_days === null || lifecycleRow?.avg_days === undefined
        ? null
        : Number(lifecycleRow.avg_days);

    const chaptersForComparison = chapterId
      ? await db.query.chapters.findMany({ where: eq(chapters.id, chapterId) })
      : await db.query.chapters.findMany({ orderBy: [asc(chapters.name)] });

    const thirtyDayCheckinsForChapter = async (chapterCid: string) => {
      const [row] = await db
        .select({ total: sql<number>`count(*)::int` })
        .from(attendance)
        .innerJoin(events, eq(attendance.eventId, events.id))
        .where(
          and(eq(events.chapterId, chapterCid), gte(attendance.checkedInAt, thirtyDaysAgo)),
        );
      return row?.total ?? 0;
    };

    const chapterComparison = await Promise.all(
      chaptersForComparison.map(async (ch) => {
        const ambassadorCountParts = eq(users.chapterId, ch.id);
        const ambassadorCountPartsRole = eq(users.role, "ambassador");

        const [ambassadorsRow] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(users)
          .where(and(ambassadorCountParts, ambassadorCountPartsRole));

        const [chapterEventsRow] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(events)
          .where(eq(events.chapterId, ch.id));

        const chapterEventsHeld = chapterEventsRow?.count ?? 0;

        const [chapterCheckInsRow] = await db
          .select({ total: sql<number>`count(*)::int` })
          .from(attendance)
          .innerJoin(events, eq(attendance.eventId, events.id))
          .where(eq(events.chapterId, ch.id));

        const chapterCheckInsTotal = chapterCheckInsRow?.total ?? 0;

        const [chapterActiveAmbRow] = await db
          .select({ count: sql<number>`count(distinct ${attendance.userId})::int` })
          .from(attendance)
          .innerJoin(events, eq(attendance.eventId, events.id))
          .where(and(eq(events.chapterId, ch.id), gte(attendance.checkedInAt, thirtyDaysAgo)));

        const checkInsLast30Days = await thirtyDayCheckinsForChapter(ch.id);

        return {
          chapterId: ch.id,
          chapterName: ch.name,
          ambassadorCount: ambassadorsRow?.count ?? 0,
          eventsHeld: chapterEventsHeld,
          totalCheckIns: chapterCheckInsTotal,
          averageAttendancePerEvent:
            chapterEventsHeld <= 0 ? null : chapterCheckInsTotal / chapterEventsHeld,
          activeAmbassadorsLast30Days: chapterActiveAmbRow?.count ?? 0,
          checkInsLast30Days,
        };
      }),
    );

    const chapterOptions = await db.query.chapters.findMany({
      columns: { id: true, name: true },
      orderBy: [asc(chapters.name)],
    });

    return c.json({
      analytics: {
        generatedAt: new Date().toISOString(),
        chapterId: chapterId ?? null,
        chapterOptions,
        totalUsers: userCount?.count ?? 0,
        verifiedUsers: verifiedUsersCountRow?.count ?? 0,
        newUsersLast30Days: newUsersRow?.count ?? 0,
        totalChapters: chapterCount?.count ?? 0,
        totalEvents: eventCount?.count ?? 0,
        checkinsLast30Days: checkins?.count ?? 0,
        pointsIssuedLast30Days: pointsRow?.sum ?? 0,
        activeAmbassadorsLast30Days: activeAmbassadors?.count ?? 0,
        chapterUserCounts: chapterDistributionRows.map((row) => ({
          chapterId: row.chapterId,
          chapterName: row.chapterName,
          count: row.userCount,
        })),
        levelDistributionByComputedTier,
        eventsByCategory: eventsByCategoryRows,
        averageAttendancePerEvent: avgAttendancePerEvent,
        repeatAttendanceRate,
        avgDaysBetweenFirstAndSecondEvent,
        engagementByChapter: chapterComparison,
      },
    });
  })
  .get("/export", zValidator("query", analyticsQuerySchema), async (c) => {
    const { chapterId } = c.req.valid("query");
    const chapterFilterUsers = chapterId ? eq(users.chapterId, chapterId) : undefined;

    const levelRowsDescending = await db
      .select()
      .from(levels)
      .orderBy(desc(levels.minPoints));

    const exportRowsBaseQuery = db
      .select({
        userId: users.id,
        name: users.name,
        email: users.email,
        chapterName: chapters.name,
        totalPoints: sql<number>`coalesce(sum(${pointsLedger.delta}), 0)::int`,
        joinedAt: users.createdAt,
        eventsAttended: sql<number>`(
          select count(*)::int from attendance where attendance.user_id = ${users.id}
        )`,
      })
      .from(users)
      .innerJoin(chapters, eq(users.chapterId, chapters.id))
      .leftJoin(pointsLedger, eq(pointsLedger.userId, users.id));

    const rows = chapterFilterUsers
      ? await exportRowsBaseQuery.where(chapterFilterUsers).groupBy(users.id, users.name, users.email, chapters.name, users.createdAt)
      : await exportRowsBaseQuery.groupBy(users.id, users.name, users.email, chapters.name, users.createdAt);

    const header = [
      "userId",
      "name",
      "email",
      "chapter",
      "totalPoints",
      "currentTier",
      "eventsAttended",
      "joinedAt",
    ].join(",");

    const lines = rows.map((row) =>
      [
        csvEscapeCell(row.userId),
        csvEscapeCell(row.name ?? ""),
        csvEscapeCell(row.email ?? ""),
        csvEscapeCell(row.chapterName),
        csvEscapeCell(row.totalPoints),
        csvEscapeCell(tierForTotalPoints(row.totalPoints, levelRowsDescending)),
        csvEscapeCell(row.eventsAttended),
        csvEscapeCell(row.joinedAt.toISOString()),
      ].join(","),
    );

    const csv = [header, ...lines].join("\n");
    const exportDate = new Date().toISOString().slice(0, 10);
    c.header("Content-Type", "text/csv; charset=utf-8");
    c.header(
      "Content-Disposition",
      `attachment; filename="stellar-orbit-analytics-${exportDate}.csv"`,
    );
    return c.body(csv, 200);
  });
