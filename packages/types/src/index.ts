export type Role = "ambassador" | "country_lead" | "global_admin";

export type User = {
  id: string;
  stellarPublicKey: string;
  email: string | null;
  role: Role;
  chapterId: string;
  createdAt: string;
  updatedAt: string;
};

export type Ambassador = User & { role: "ambassador" };

export type CountryLead = User & { role: "country_lead" };

export type GlobalAdmin = User & { role: "global_admin" };

export type Chapter = {
  id: string;
  name: string;
  countryCode: string;
  region: string | null;
  createdAt: string;
};

export type EventCategory =
  | "meetup"
  | "workshop"
  | "conference"
  | "hackathon"
  | "community_call"
  | "other";

export type Event = {
  id: string;
  chapterId: string;
  title: string;
  description: string | null;
  category: EventCategory;
  location: string | null;
  startsAt: string;
  endsAt: string;
  createdByUserId: string;
  createdAt: string;
};

export type Attendance = {
  id: string;
  eventId: string;
  userId: string;
  checkedInAt: string;
  qrTokenId: string | null;
};

export type PointsReason =
  | "event_checkin"
  | "manual_assignment"
  | "adjustment"
  | "other";

export type PointsLedgerEntry = {
  id: string;
  userId: string;
  delta: number;
  reason: PointsReason;
  eventId: string | null;
  assignedByUserId: string | null;
  note: string | null;
  createdAt: string;
};

export type LevelTier =
  | "explorer"
  | "stellar_pioneer"
  | "orbit_builder"
  | "nova_ambassador"
  | "ecosystem_leader";

export type Level = {
  id: string;
  tier: LevelTier;
  displayName: string;
  minPoints: number;
  maxPoints: number | null;
  sortOrder: number;
};

export type NotificationType =
  | "points_awarded"
  | "level_up"
  | "event_reminder"
  | "chapter_update"
  | "system";

export type Notification = {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  readAt: string | null;
  emailSentAt: string | null;
  createdAt: string;
};

export type LeaderboardScope = "chapter" | "regional" | "global";

export type LeaderboardEntry = {
  rank: number;
  userId: string;
  stellarPublicKey: string;
  displayName: string | null;
  chapterId: string;
  chapterName: string;
  points: number;
  levelTier: LevelTier;
};

export type AnalyticsSnapshot = {
  generatedAt: string;
  totalUsers: number;
  totalChapters: number;
  totalEvents: number;
  checkinsLast30Days: number;
  pointsIssuedLast30Days: number;
  activeAmbassadorsLast30Days: number;
};

export type ChapterOption = {
  id: string;
  name: string;
};

export type AnalyticsChapterBucket = {
  chapterId: string;
  chapterName: string;
  count: number;
};

export type AnalyticsCategoryBucket = {
  category: EventCategory;
  count: number;
};

export type AnalyticsChapterEngagementRow = {
  chapterId: string;
  chapterName: string;
  ambassadorCount: number;
  eventsHeld: number;
  totalCheckIns: number;
  averageAttendancePerEvent: number | null;
  activeAmbassadorsLast30Days: number;
  checkInsLast30Days: number;
};

export type AnalyticsDashboard = {
  generatedAt: string;
  chapterId: string | null;
  chapterOptions: ChapterOption[];
  totalUsers: number;
  verifiedUsers: number;
  newUsersLast30Days: number;
  totalChapters: number;
  totalEvents: number;
  checkinsLast30Days: number;
  pointsIssuedLast30Days: number;
  activeAmbassadorsLast30Days: number;
  chapterUserCounts: AnalyticsChapterBucket[];
  levelDistributionByComputedTier: Record<LevelTier, number>;
  eventsByCategory: AnalyticsCategoryBucket[];
  averageAttendancePerEvent: number | null;
  repeatAttendanceRate: number | null;
  engagementByChapter: AnalyticsChapterEngagementRow[];
};
