// Shared by server (enforcement) and client (hiding controls). Enforcement always happens on the server.
export const PERMISSIONS = {
  "dashboard.view": "View the admin dashboard",
  "content.view": "View pages, catalogue, FAQs and testimonials in the CMS",
  "content.edit": "Create and edit content and drafts",
  "content.publish": "Publish, unpublish, archive and restore content",
  "content.delete": "Permanently delete content",
  "media.upload": "Upload and edit media",
  "media.delete": "Delete media",
  "navigation.manage": "Edit header and footer navigation",
  "seo.manage": "Edit SEO metadata",
  "redirects.manage": "Create and edit redirects",
  "settings.manage": "Edit global site settings and analytics",
  "enquiries.view": "View enquiries",
  "enquiries.manage": "Change enquiry status, assignment and notes",
  "enquiries.export": "Export enquiries to CSV",
  "users.manage": "Manage admin users, roles and sessions",
  "audit.view": "View the audit log",
} as const;

export type Permission = keyof typeof PERMISSIONS;

const ALL = Object.keys(PERMISSIONS) as Permission[];

export const ROLES: Record<string, { name: string; description: string; permissions: Permission[] }> = {
  super_admin: { name: "Super Admin", description: "Full access including user management", permissions: ALL },
  administrator: {
    name: "Administrator",
    description: "Everything except managing admin users",
    permissions: ALL.filter((p) => p !== "users.manage"),
  },
  content_editor: {
    name: "Content Editor",
    description: "Edits and publishes website content and media",
    permissions: ["dashboard.view", "content.view", "content.edit", "content.publish", "media.upload", "seo.manage"],
  },
  enquiry_manager: {
    name: "Enquiry Manager",
    description: "Handles customer enquiries",
    permissions: ["dashboard.view", "enquiries.view", "enquiries.manage", "enquiries.export"],
  },
};

export type RoleKey = keyof typeof ROLES;
