"use server";

import { audit } from "../audit";
import { deleteMedia, listMedia, mediaUsages, updateMediaMeta } from "../cms/media-store";
import { guarded, toId, UserFacingError } from "./guard";

export async function listMediaAction(q: string, page: number) {
  return guarded("content.view", async () => listMedia({ q: q.slice(0, 100), page }));
}

export async function updateMediaAction(id: number, values: { altText: string; caption: string; credit: string; licenceStatus: string }) {
  return guarded(
    "media.upload",
    async (user) => {
      await updateMediaMeta(toId(id), values, user.id);
      await audit(user.id, "media.update", "media", id, "Alt/caption/licence updated");
      return null;
    },
    { invalidate: true, message: "Saved" },
  );
}

export async function deleteMediaAction(id: number, confirmInUse: boolean) {
  return guarded(
    "media.delete",
    async (user) => {
      const usages = await mediaUsages(toId(id));
      if (usages.length && !confirmInUse) {
        throw new UserFacingError(`This image is used in ${usages.length} place(s): ${usages.map((u) => u.label).join("; ")}. Confirm to delete it anyway.`);
      }
      await deleteMedia(id);
      await audit(user.id, "media.delete", "media", id, usages.length ? `Deleted while in use (${usages.length})` : "Deleted");
      return null;
    },
    { invalidate: true, message: "Deleted" },
  );
}
