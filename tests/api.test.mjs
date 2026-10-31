import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { createApp } from "../server/app.mjs";

test("Dareme account, privacy, consent, and safety boundaries", async (t) => {
  const dataDir = await mkdtemp(join(tmpdir(), "dareme-test-"));
  const { app, db } = createApp({ dataDir });
  const server = app.listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  function client() {
    let cookie = "";
    return async (
      path,
      data,
      method = data === undefined ? "GET" : "POST",
      headers = {},
    ) => {
      const form = data instanceof FormData;
      const response = await fetch(base + path, {
        method,
        headers: {
          ...(cookie ? { cookie } : {}),
          ...(!form && data !== undefined
            ? { "Content-Type": "application/json" }
            : {}),
          ...headers,
        },
        body:
          data === undefined ? undefined : form ? data : JSON.stringify(data),
      });
      const set = response.headers.get("set-cookie");
      if (set) cookie = set.split(";")[0];
      const type = response.headers.get("content-type") || "";
      const body = type.includes("application/json")
        ? await response.json()
        : Buffer.from(await response.arrayBuffer());
      return { status: response.status, body, headers: response.headers };
    };
  }
  const a = client(),
    b = client(),
    c = client(),
    outsider = client();
  let alice, bob, charlie, post, match;
  try {
    await t.test(
      "unauthenticated API requests and cross-site writes are denied",
      async () => {
        assert.equal((await outsider("/state")).status, 401);
        assert.equal(
          (
            await outsider("/demo", {}, "POST", {
              Origin: "https://untrusted.example",
            })
          ).status,
          403,
        );
        assert.equal(
          (
            await outsider("/auth/register", {
              name: "No Age",
              email: "noage@example.test",
              password: "sample-password12",
              adult: false,
              rules: true,
            })
          ).status,
          400,
        );
      },
    );
    await t.test(
      "accounts start private and unverified, with protected session cookies",
      async () => {
        const r = await a("/auth/register", {
          name: "Alice Test",
          email: "alice@example.test",
          password: "test-password-123",
          adult: true,
          rules: true,
        });
        assert.equal(r.status, 201);
        alice = r.body.user;
        assert.equal(alice.private, true);
        assert.equal(alice.verified, false);
        assert.equal(alice.verifiedOnly, true);
        assert.match(r.headers.get("set-cookie"), /HttpOnly/);
        assert.match(r.headers.get("set-cookie"), /SameSite=Strict/);
        assert.equal(r.body.user.password, undefined);
        assert.equal(r.body.user.email, undefined);
        const stored = db
          .prepare("SELECT password FROM users WHERE id=?")
          .get(alice.id).password;
        assert.ok(!stored.includes("test-password-123"));
        assert.match(stored, /^[a-f0-9]{32}:[a-f0-9]{128}$/);
        bob = (
          await b("/auth/register", {
            name: "Bob Test",
            email: "bob@example.test",
            password: "test-password-123",
            adult: true,
            rules: true,
          })
        ).body.user;
        charlie = (
          await c("/auth/register", {
            name: "Charlie Test",
            email: "charlie@example.test",
            password: "test-password-123",
            adult: true,
            rules: true,
          })
        ).body.user;
        assert.ok(bob.id && charlie.id);
        assert.equal((await a("/me", { verified: true }, "PATCH")).status, 400);
        assert.equal((await a("/me", { demo: true }, "PATCH")).status, 400);
      },
    );
    await t.test(
      "uploaded private photos are re-encoded and inaccessible to other accounts",
      async () => {
        const photo = await sharp({
          create: { width: 80, height: 60, channels: 3, background: "#77aa88" },
        })
          .jpeg()
          .withMetadata({
            exif: { IFD0: { Artist: "Sensitive sample metadata" } },
          })
          .toBuffer();
        const form = new FormData();
        form.append("caption", "Private little moment");
        form.append(
          "image",
          new Blob([photo], { type: "image/jpeg" }),
          "test.jpg",
        );
        const r = await a("/posts", form);
        assert.equal(r.status, 201);
        post = r.body.post;
        assert.match(post.image, /^\/api\/media\//);
        const own = await a(`/media/${post.id}`);
        assert.equal(own.status, 200);
        const meta = await sharp(own.body).metadata();
        assert.equal(meta.format, "webp");
        assert.equal(meta.exif, undefined);
        assert.equal((await b(`/media/${post.id}`)).status, 404);
        assert.equal((await b(`/posts/${post.id}/like`, {})).status, 404);
        const profile = await b(`/users/${alice.id}`);
        assert.equal(profile.body.canSeePosts, false);
        assert.deepEqual(profile.body.posts, []);
        assert.ok(
          !(await b("/state")).body.posts.some((p) => p.id === post.id),
        );
        assert.equal((await outsider(`/media/${post.id}`)).status, 401);
      },
    );
    await t.test(
      "private follow requests require owner approval before photo access",
      async () => {
        assert.equal((await b(`/users/${alice.id}/follow`, {})).status, 200);
        assert.equal((await b(`/media/${post.id}`)).status, 404);
        assert.equal((await a("/state")).body.requests[0].id, bob.id);
        assert.equal((await a(`/requests/${bob.id}/accept`, {})).status, 200);
        assert.equal((await b(`/media/${post.id}`)).status, 200);
        assert.ok((await b("/state")).body.posts.some((p) => p.id === post.id));
        assert.equal(
          (await b(`/posts/${post.id}`, undefined, "DELETE")).status,
          404,
        );
      },
    );
    await t.test(
      "public/private changes immediately change server-side photo visibility",
      async () => {
        assert.equal((await c(`/media/${post.id}`)).status, 404);
        await a("/me", { private: false }, "PATCH");
        assert.equal((await c(`/media/${post.id}`)).status, 200);
        await a("/me", { private: true }, "PATCH");
        assert.equal((await c(`/media/${post.id}`)).status, 404);
      },
    );
    await t.test(
      "image type validation and text lengths cannot be bypassed through the API",
      async () => {
        const form = new FormData();
        form.append("caption", "Not a photo");
        form.append(
          "image",
          new Blob(["unsafe"], { type: "image/svg+xml" }),
          "fake.svg",
        );
        assert.equal((await a("/posts", form)).status, 400);
        assert.equal(
          (await a("/posts", { caption: "x".repeat(1501) })).status,
          400,
        );
        const invalid = new FormData();
        invalid.append("caption", "Invalid photo");
        invalid.append(
          "image",
          new Blob(["not really an image"], { type: "image/jpeg" }),
          "fake.jpg",
        );
        assert.equal((await a("/posts", invalid)).status, 400);
      },
    );
    await t.test(
      "verified-only matching is enforced for new unverified accounts",
      async () => {
        assert.equal(
          (await a("/dares/little-things/accept", { consent: true })).status,
          409,
        );
        await a("/me", { verifiedOnly: false }, "PATCH");
        // A partner who requires verification still cannot be matched with an unverified requester.
        assert.equal(
          (await a("/dares/little-things/accept", { consent: true })).status,
          409,
        );
        await b("/me", { verifiedOnly: false }, "PATCH");
      },
    );
    await t.test(
      "only two reviewed daily assignments exist and both require explicit consent",
      async () => {
        assert.equal(
          (await a("/dares/little-things/accept", { consent: false })).status,
          400,
        );
        const r = await a("/dares/little-things/accept", { consent: true });
        assert.equal(r.status, 201);
        match = r.body.match;
        assert.equal(match.peer.id, bob.id);
        assert.equal(match.status, "pending");
        assert.equal(
          (await a("/dares/little-things/accept", { consent: true })).status,
          409,
        );
        assert.equal(
          (await a("/dares/unreviewed-dare/accept", { consent: true })).status,
          400,
        );
        assert.equal((await b("/state")).body.matches[0].incoming, true);
      },
    );
    await t.test(
      "chat is locked before mutual consent and samples cannot impersonate real acceptance",
      async () => {
        assert.equal((await a(`/matches/${match.id}/messages`)).status, 403);
        assert.equal(
          (await a(`/matches/${match.id}/messages`, { text: "Not yet" }))
            .status,
          403,
        );
        assert.equal(
          (await a(`/matches/${match.id}/accept`, { consent: true })).status,
          403,
        );
        assert.equal(
          (await a(`/matches/${match.id}/preview-accept`, {})).status,
          403,
        );
        assert.equal((await c(`/matches/${match.id}/messages`)).status, 404);
        assert.equal(
          (await b(`/matches/${match.id}/accept`, { consent: false })).status,
          400,
        );
        await b("/me", { verifiedOnly: true }, "PATCH");
        assert.equal(
          (await b(`/matches/${match.id}/accept`, { consent: true })).status,
          409,
        );
        assert.equal((await a(`/matches/${match.id}/messages`)).status, 403);
        await b("/me", { verifiedOnly: false }, "PATCH");
        assert.equal(
          (await b(`/matches/${match.id}/accept`, { consent: true })).status,
          200,
        );
        assert.equal(
          (
            await a(`/matches/${match.id}/messages`, {
              text: "A kind little hello",
            })
          ).status,
          201,
        );
        assert.equal(
          (await b(`/matches/${match.id}/messages`)).body.messages[0].text,
          "A kind little hello",
        );
        // Accepting a dare does not itself grant any profile access to unrelated users.
        assert.equal((await c(`/media/${post.id}`)).status, 404);
      },
    );
    await t.test("completed dares become read-only", async () => {
      assert.equal((await a(`/matches/${match.id}/complete`, {})).status, 200);
      assert.equal(
        (await b(`/matches/${match.id}/messages`, { text: "After completion" }))
          .status,
        403,
      );
      assert.equal((await a(`/matches/${match.id}/messages`)).status, 200);
    });
    await t.test(
      "reports are persisted privately and blocking revokes profile, media, and chat access",
      async () => {
        const report = await a("/reports", {
          targetId: bob.id,
          reason: "Harassment or bullying",
          detail: "Synthetic integration test",
        });
        assert.equal(report.status, 201);
        assert.equal(
          db
            .prepare("SELECT user_id FROM reports WHERE id=?")
            .get(report.body.id).user_id,
          alice.id,
        );
        assert.equal((await b("/reports")).status, 404);
        assert.equal((await a(`/users/${bob.id}/block`, {})).status, 200);
        assert.equal((await b(`/users/${alice.id}`)).status, 404);
        assert.equal((await b(`/media/${post.id}`)).status, 404);
        assert.equal((await b(`/matches/${match.id}/messages`)).status, 404);
        assert.ok(
          !(await b("/state")).body.people.some((u) => u.id === alice.id),
        );
      },
    );
    await t.test(
      "preview sessions are isolated and sample consent is explicitly preview-only",
      async () => {
        const d = client(),
          e = client();
        const du = (await d("/demo", {})).body.user;
        const eu = (await e("/demo", {})).body.user;
        assert.notEqual(du.id, eu.id);
        const p = (await d("/posts", { caption: "Private preview post" })).body
          .post;
        assert.ok(!(await e("/state")).body.posts.some((q) => q.id === p.id));
        const before = (await e("/state")).body.posts.find(
          (q) => q.id === "sample-post-1",
        ).likes;
        await d("/posts/sample-post-1/like", {});
        await d("/posts/sample-post-1/comments", {
          text: "A comment only for this preview",
        });
        assert.equal(
          (await e("/state")).body.posts.find((q) => q.id === "sample-post-1")
            .likes,
          before,
        );
        assert.equal(
          (await e("/posts/sample-post-1/comments")).body.comments.length,
          0,
        );
        assert.equal(
          (await d("/posts/sample-post-1/comments")).body.comments.length,
          1,
        );
        const m = (await d("/dares/little-things/accept", { consent: true }))
          .body.match;
        const m2 = (await e("/dares/little-things/accept", { consent: true }))
          .body.match;
        assert.ok(m.id && m2.id);
        assert.equal(
          (await e(`/matches/${m.id}/preview-accept`, {})).status,
          404,
        );
        assert.equal(
          (await d(`/matches/${m.id}/preview-accept`, {})).status,
          200,
        );
        assert.equal(
          (await d(`/matches/${m.id}/messages`)).body.messages.length,
          1,
        );
        assert.ok(!(await a("/state")).body.people.some((u) => u.id === du.id));
      },
    );
    await t.test(
      "logout expires access and login verifies the password",
      async () => {
        assert.equal((await a("/auth/logout", {})).status, 200);
        assert.equal((await a("/state")).status, 401);
        assert.equal(
          (
            await a("/auth/login", {
              email: "alice@example.test",
              password: "wrong-password",
            })
          ).status,
          401,
        );
        assert.equal(
          (
            await a("/auth/login", {
              email: "alice@example.test",
              password: "test-password-123",
            })
          ).status,
          200,
        );
        assert.equal((await a("/state")).body.user.id, alice.id);
      },
    );
  } finally {
    await new Promise((r) => server.close(r));
    db.close();
    await rm(dataDir, { recursive: true, force: true });
  }
});

test("trusted hosting proxy keeps rate limits separate for different clients", async () => {
  const dataDir = await mkdtemp(join(tmpdir(), "dareme-proxy-test-"));
  const { app, db } = createApp({
    dataDir,
    trustProxyHops: 1,
    production: true,
  });
  const server = app.listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  const origin = `http://127.0.0.1:${server.address().port}`;
  try {
    const request = (ip) =>
      fetch(`${origin}/api/health`, { headers: { "X-Forwarded-For": ip } });
    for (let i = 0; i < 160; i++) {
      const response = await request("203.0.113.10");
      assert.equal(response.status, 200);
      await response.arrayBuffer();
    }
    const limited = await request("203.0.113.10");
    assert.equal(limited.status, 429);
    await limited.arrayBuffer();
    const other = await request("203.0.113.11");
    assert.equal(other.status, 200);
    await other.arrayBuffer();
    const crossSite = await fetch(`${origin}/api/demo`, {
      method: "POST",
      headers: {
        Origin: "https://untrusted.example",
        "X-Forwarded-For": "203.0.113.11",
      },
    });
    assert.equal(crossSite.status, 403);
    await crossSite.arrayBuffer();
    const session = await fetch(`${origin}/api/demo`, {
      method: "POST",
      headers: { Origin: origin, "X-Forwarded-For": "203.0.113.11" },
    });
    assert.equal(session.status, 200);
    assert.match(session.headers.get("set-cookie"), /Secure/);
    await session.arrayBuffer();
  } finally {
    await new Promise((r) => server.close(r));
    db.close();
    await rm(dataDir, { recursive: true, force: true });
  }
});
