export { CATEGORY_SEEDS, type CategorySeed, type CategorySlug } from "./categories"

export {
  checkText,
  sanitize,
  normalizeTitle,
  slugifyTitle,
  type Verdict,
  type GuardResult,
} from "./guard"

export {
  TIERS,
  tierFor,
  nextTier,
  progressToNext,
  type ReputationTier,
  type Tier,
} from "./reputation"

export {
  ensureCategories,
  listCategories,
  getCategoryBySlug,
  listThreads,
  getThreadBySlug,
  createThread,
  incrementViewCount,
  createReply,
  listPostsForThread,
  getPostById,
  toggleReaction,
  getReactionsForPosts,
  reportPost,
  topMembers,
  moderationQueue,
  moderatorVerdict,
  listOpenReports,
  resolveReport,
  type ReactionKind,
  type CreateThreadInput,
  type CreatePostInput,
} from "./service"

export {
  getCurrentMember,
  requireMember,
  requireRole,
  ForumAuthError,
  type Member,
  type ForumRole,
} from "./auth"
