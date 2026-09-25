import { addSocialSnapshot } from "@/db/admin";
import { adminJsonRoute } from "@/lib/admin/route";
import { payloadHash } from "@/lib/providers/tmdb";
import { fetchFacebook } from "@/lib/providers/facebook";
import { fetchInstagram } from "@/lib/providers/instagram";
import { fetchX } from "@/lib/providers/x";
import { fetchYouTube } from "@/lib/providers/youtube";
import { socialSnapshotInput } from "@/lib/validation/admin";

const FETCHERS = { instagram: fetchInstagram, x: fetchX, youtube: fetchYouTube, facebook: fetchFacebook };

/** Manual snapshot (followersCount given) or adapter fetch for an explicit official profile. */
export const POST = adminJsonRoute(socialSnapshotInput, async (db, input, actor) => {
  if (!input.isOfficial) throw new Error("Only official profiles can be snapshotted");
  if (input.followersCount !== undefined)
    return addSocialSnapshot(db, { ...input, followersCount: input.followersCount, sourceMethod: "manual_editorial" }, actor);
  const fetched = await FETCHERS[input.platform](input.handle);
  if (fetched.followersCount === null) throw new Error("Platform did not return a public follower count");
  return addSocialSnapshot(
    db,
    {
      ...input,
      followersCount: fetched.followersCount,
      platformUserId: fetched.platformUserId,
      snapshotAt: fetched.snapshotAt,
      sourceMethod: fetched.sourceMethod,
      rawPayloadHash: await payloadHash(fetched.rawPayload),
    },
    actor,
  );
});
