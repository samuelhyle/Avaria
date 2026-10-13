/**
 * Drizzle relations, extracted from `./index.ts` so the table definitions can
 * be inferred without a circular type cycle. TypeScript struggles to infer
 * the return type of `pgTable(...)` when a sibling `relations()` block in the
 * same file references forward-declared tables (e.g. `productsRelations`
 * forward-references `vials` and `batches` while `vialsRelations` references
 * `products`). Moving the relations to a sibling file that imports the
 * already-inferred tables breaks the cycle.
 */
import { relations } from "drizzle-orm"

import {
  accounts,
  addresses,
  batches,
  categories,
  coaTests,
  forumCategories,
  forumPosts,
  forumReactions,
  forumReports,
  forumThreads,
  inventoryReservations,
  orderItems,
  orders,
  passkeys,
  productTranslations,
  products,
  sessions,
  users,
  vials,
} from "./index"

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  addresses: many(addresses),
  orders: many(orders),
  passkeys: many(passkeys),
  sessions: many(sessions),
}))

export const productsRelations = relations(products, ({ many, one }) => ({
  vials: many(vials),
  translations: many(productTranslations),
  category: one(categories, { fields: [products.categoryId], references: [categories.id] }),
  activeBatch: one(batches, {
    fields: [products.activeBatchId],
    references: [batches.id],
  }),
}))

export const vialsRelations = relations(vials, ({ many, one }) => ({
  product: one(products, { fields: [vials.productId], references: [products.id] }),
  batches: many(batches),
  reservations: many(inventoryReservations),
  orderItems: many(orderItems),
}))

export const batchesRelations = relations(batches, ({ one, many }) => ({
  vial: one(vials, { fields: [batches.vialId], references: [vials.id] }),
  tests: many(coaTests),
}))

export const ordersRelations = relations(orders, ({ many }) => ({
  items: many(orderItems),
  reservations: many(inventoryReservations),
}))

export const inventoryReservationsRelations = relations(inventoryReservations, ({ one }) => ({
  order: one(orders, { fields: [inventoryReservations.orderId], references: [orders.id] }),
  vial: one(vials, { fields: [inventoryReservations.vialId], references: [vials.id] }),
}))

export const forumCategoriesRelations = relations(forumCategories, ({ many }) => ({
  threads: many(forumThreads),
}))

export const forumThreadsRelations = relations(forumThreads, ({ one, many }) => ({
  category: one(forumCategories, {
    fields: [forumThreads.categoryId],
    references: [forumCategories.id],
  }),
  author: one(users, { fields: [forumThreads.authorId], references: [users.id] }),
  posts: many(forumPosts),
}))

export const forumPostsRelations = relations(forumPosts, ({ one, many }) => ({
  thread: one(forumThreads, { fields: [forumPosts.threadId], references: [forumThreads.id] }),
  author: one(users, { fields: [forumPosts.authorId], references: [users.id] }),
  reactions: many(forumReactions),
  reports: many(forumReports),
}))

export const forumReactionsRelations = relations(forumReactions, ({ one }) => ({
  post: one(forumPosts, { fields: [forumReactions.postId], references: [forumPosts.id] }),
  user: one(users, { fields: [forumReactions.userId], references: [users.id] }),
}))
