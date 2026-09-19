export {
  requireAdmin,
  getAdminOrNull,
  adminErrorStatus,
  AdminAccessError,
  mapUserRoleToAdmin,
  type AdminMember,
  type AdminRole,
} from "./guard"

// Pure helper kept here for unit-test convenience.
export { tierIdFor } from "./types"
