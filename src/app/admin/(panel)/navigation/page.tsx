import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/server/db/client";
import { requireAdmin } from "@/server/auth/session";
import { NavigationEditor } from "@/components/admin/navigation-editor";
import { PageTitle } from "@/components/admin/ui";

export const metadata = { title: "Navigation" };

export default async function NavigationPage() {
  await requireAdmin("navigation.manage");
  const [items, pages] = await Promise.all([
    db.select().from(schema.navigationItems).orderBy(asc(schema.navigationItems.menu), asc(schema.navigationItems.position)),
    db.select({ path: schema.pages.path, title: schema.pages.title }).from(schema.pages).where(eq(schema.pages.status, "published")).orderBy(asc(schema.pages.path)),
  ]);
  const toEditor = (menu: string) => {
    const list = items.filter((i) => i.menu === menu);
    return list.map((i) => ({
      label: i.label,
      href: i.href,
      isVisible: i.isVisible,
      openInNewTab: i.openInNewTab,
      parentIndex: i.parentId ? list.findIndex((p) => p.id === i.parentId) : -1,
    }));
  };
  return (
    <>
      <PageTitle title="Navigation" description="Header, footer and legal menus. Internal links are checked against published pages when you save. If the footer menu is empty, the header links are shown in the footer." />
      <div className="space-y-6">
        <NavigationEditor menu="header" title="Header menu" initial={toEditor("header")} pages={pages} />
        <NavigationEditor menu="footer" title="Footer menu" initial={toEditor("footer")} pages={pages} />
        <NavigationEditor menu="legal" title="Footer legal links" initial={toEditor("legal")} pages={pages} />
      </div>
    </>
  );
}

// Admin screens always read fresh, per-request data.
export const instant = false;
