/* eslint-disable @typescript-eslint/no-deprecated -- Drizzle pgTable constraint overload typing */
import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  pgEnum,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const roleEnum = pgEnum("role", [
  "ambassador",
  "country_lead",
  "global_admin",
]);

export const eventCategoryEnum = pgEnum("event_category", [
  "meetup",
  "workshop",
  "conference",
  "hackathon",
  "community_call",
  "other",
]);

export const pointsReasonEnum = pgEnum("points_reason", [
  "event_checkin",
  "manual_assignment",
  "adjustment",
  "other",
]);

export const levelTierEnum = pgEnum("level_tier", [
  "explorer",
  "stellar_pioneer",
  "orbit_builder",
  "nova_ambassador",
  "ecosystem_leader",
]);
export const notificationTypeEnum = pgEnum("notification_type", [
  "points_awarded",
  "level_up",
  "event_reminder",
  "chapter_update",
  "system",
]);

export const chapters = pgTable("chapters", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  countryCode: text("country_code").notNull(),
  region: text("region"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    stellarPublicKey: text("stellar_public_key").notNull(),
    name: text("name"),
    email: text("email"),
    language: text("language").default("en"),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    currentTier: levelTierEnum("current_tier").default("explorer").notNull(),
    countryCode: text("country_code").notNull(),
    role: roleEnum("role").notNull().default("ambassador"),
    chapterId: uuid("chapter_id")
      .references(() => chapters.id)
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    stellarKeyIdx: uniqueIndex("users_stellar_public_key_unique").on(
      table.stellarPublicKey,
    ),
    emailIdx: uniqueIndex("users_email_unique").on(table.email),
  }),
);

export const events = pgTable("events", {
  id: uuid("id").defaultRandom().primaryKey(),
  chapterId: uuid("chapter_id")
    .references(() => chapters.id)
    .notNull(),
  title: text("title").notNull(),
  description: text("description"),
  category: eventCategoryEnum("category").notNull(),
  location: text("location"),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  createdByUserId: uuid("created_by_user_id")
    .references(() => users.id)
    .notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const attendance = pgTable(
  "attendance",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    eventId: uuid("event_id")
      .references(() => events.id)
      .notNull(),
    userId: uuid("user_id")
      .references(() => users.id)
      .notNull(),
    checkedInAt: timestamp("checked_in_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    qrTokenId: text("qr_token_id"),
  },
  (table) => ({
    eventUserUnique: uniqueIndex("attendance_event_user_unique").on(
      table.eventId,
      table.userId,
    ),
  }),
);

export const pointsLedger = pgTable("points_ledger", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),
  delta: integer("delta").notNull(),
  reason: pointsReasonEnum("reason").notNull(),
  eventId: uuid("event_id").references(() => events.id),
  assignedByUserId: uuid("assigned_by_user_id").references(() => users.id),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const levels = pgTable(
  "levels",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tier: levelTierEnum("tier").notNull(),
    displayName: text("display_name").notNull(),
    minPoints: integer("min_points").notNull(),
    maxPoints: integer("max_points"),
    sortOrder: integer("sort_order").notNull(),
  },
  (table) => ({
    tierUnique: uniqueIndex("levels_tier_unique").on(table.tier),
  }),
);

export const notifications = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),
  type: notificationTypeEnum("type").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  readAt: timestamp("read_at", { withTimezone: true }),
  emailSentAt: timestamp("email_sent_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const leaderboardSnapshots = pgTable("leaderboard_snapshots", {
  id: uuid("id").defaultRandom().primaryKey(),
  scope: text("scope").notNull(),
  scopeKey: text("scope_key"),
  generatedAt: timestamp("generated_at", { withTimezone: true }).defaultNow().notNull(),
  payload: text("payload").notNull(),
});

export const usersRelations = relations(users, ({ one, many }) => ({
  chapter: one(chapters, {
    fields: [users.chapterId],
    references: [chapters.id],
  }),
  attendance: many(attendance),
  points: many(pointsLedger),
  notifications: many(notifications),
}));

export const chaptersRelations = relations(chapters, ({ many }) => ({
  users: many(users),
  events: many(events),
}));

export const levelsRelations = relations(levels, () => ({}));

export const eventsRelations = relations(events, ({ one, many }) => ({
  chapter: one(chapters, {
    fields: [events.chapterId],
    references: [chapters.id],
  }),
  creator: one(users, {
    fields: [events.createdByUserId],
    references: [users.id],
  }),
  attendance: many(attendance),
}));

export const attendanceRelations = relations(attendance, ({ one }) => ({
  event: one(events, {
    fields: [attendance.eventId],
    references: [events.id],
  }),
  user: one(users, {
    fields: [attendance.userId],
    references: [users.id],
  }),
}));

export const pointsLedgerRelations = relations(pointsLedger, ({ one }) => ({
  user: one(users, {
    fields: [pointsLedger.userId],
    references: [users.id],
  }),
  event: one(events, {
    fields: [pointsLedger.eventId],
    references: [events.id],
  }),
  assignedBy: one(users, {
    fields: [pointsLedger.assignedByUserId],
    references: [users.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;
export type ChapterRow = typeof chapters.$inferSelect;
export type EventRow = typeof events.$inferSelect;
export type AttendanceRow = typeof attendance.$inferSelect;
export type PointsLedgerRow = typeof pointsLedger.$inferSelect;
export type LevelRow = typeof levels.$inferSelect;
export type NotificationRow = typeof notifications.$inferSelect;
