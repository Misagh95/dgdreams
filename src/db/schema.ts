import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  boolean,
  jsonb,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  avatar: text("avatar"),
  walletAddress: text("wallet_address"),
  currentStreak: integer("current_streak").default(0),
  longestStreak: integer("longest_streak").default(0),
  totalPoints: integer("total_points").default(0),
  lastActiveAt: timestamp("last_active_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const wallets = pgTable("wallets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  address: text("address").notNull(),
  chainId: integer("chain_id").notNull(),
  label: text("label"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const socialLinks = pgTable("social_links", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  platform: text("platform").notNull(), // twitter, discord, telegram, github
  handle: text("handle").notNull(),
  verified: boolean("verified").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  hash: text("hash").notNull(),
  chainId: integer("chain_id").notNull(),
  chainName: text("chain_name").notNull(),
  type: text("type").notNull(), // send, swap, bridge, contract
  status: text("status").notNull(), // pending, success, failed
  amount: text("amount"),
  token: text("token"),
  gasUsed: text("gas_used"),
  blockNumber: integer("block_number"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const streaks = pgTable("streaks", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  date: timestamp("date").notNull(),
  chainId: integer("chain_id"),
  chainName: text("chain_name"),
  actionCount: integer("action_count").default(0),
  points: integer("points").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const achievements = pgTable("achievements", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  type: text("type").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  earnedAt: timestamp("earned_at").defaultNow(),
});

export const gameScores = pgTable("game_scores", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  walletAddress: text("wallet_address"),
  score: integer("score").notNull(),
  bestTile: integer("best_tile").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const dailyTasks = pgTable("daily_tasks", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  taskType: text("task_type").notNull(),
  taskLabel: text("task_label").notNull(),
  chainId: integer("chain_id"),
  completed: boolean("completed").default(false),
  points: integer("points").default(10),
  completedAt: timestamp("completed_at"),
  date: timestamp("date").defaultNow(),
});

export const litevmStats = pgTable("litevm_stats", {
  id: serial("id").primaryKey(),
  walletAddress: text("wallet_address").notNull(),
  playCount: integer("play_count").default(0),
  highScore: integer("high_score").default(0),
  streak: integer("streak").default(0),
  totalCi: integer("total_ci").default(0),
  totalAct: integer("total_act").default(0),
  totalPred: integer("total_pred").default(0),
  totalPoints: integer("total_points").default(0),
  lastSyncAt: timestamp("last_sync_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const predictionActivities = pgTable("prediction_activities", {
  id: serial("id").primaryKey(),
  walletAddress: text("wallet_address").notNull(),
  action: text("action").notNull(), // create_market, predict_yes, predict_no, resolve_market
  question: text("question").notNull(),
  marketId: text("market_id"),
  chain: text("chain").notNull().default("genlayer"), // genlayer, litvm
  txHash: text("tx_hash"),
  points: integer("points").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const walletSocials = pgTable("wallet_socials", {
  id: serial("id").primaryKey(),
  walletAddress: text("wallet_address").notNull(),
  platform: text("platform").notNull(), // gmail, telegram, twitter, discord, github
  handle: text("handle").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  walletPlatformIdx: uniqueIndex("wallet_platform_idx").on(table.walletAddress, table.platform),
}));

export const tournaments = pgTable("tournaments", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  gameType: text("game_type").notNull().default("2048"),
  entryFee: integer("entry_fee").default(0),
  prizePool: integer("prize_pool").default(0),
  maxPlayers: integer("max_players").default(100),
  status: text("status").notNull().default("pending"), // pending | active | completed
  startsAt: timestamp("starts_at").notNull(),
  endsAt: timestamp("ends_at").notNull(),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const tournamentEntries = pgTable("tournament_entries", {
  id: serial("id").primaryKey(),
  tournamentId: integer("tournament_id").references(() => tournaments.id).notNull(),
  walletAddress: text("wallet_address").notNull(),
  score: integer("score").default(0),
  bestTile: integer("best_tile").default(0),
  rank: integer("rank"),
  prize: integer("prize").default(0),
  paid: integer("paid").default(0), // entry fee paid
  createdAt: timestamp("created_at").defaultNow(),
});
