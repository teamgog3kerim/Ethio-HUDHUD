import assert from "node:assert/strict";
import test from "node:test";
import { INVITE_APP_URL, INVITE_MESSAGES, getInviteLinks, getInviteText } from "../src/invitations";

test("all invitation templates preserve the Arabic samples and include the public domain exactly once", () => {
  assert.equal(INVITE_MESSAGES.length, 4);
  assert.equal(INVITE_APP_URL, "https://ethio-hudhud.replit.app");
  for (const lang of ["ar", "en"] as const) {
    for (let i = 0; i < INVITE_MESSAGES.length; i++) {
      const text = getInviteText(i, lang);
      assert.ok(text.startsWith(INVITE_MESSAGES[i]![lang]));
      assert.equal(text.split(INVITE_APP_URL).length - 1, 1);
      assert.ok(!text.includes("replit.dev"));
      assert.ok(!text.includes("localhost"));
    }
  }
  assert.equal(getInviteText(999, "ar"), getInviteText(0, "ar"));
});

test("social forwarding preserves Arabic, punctuation and the public link", () => {
  const text = `${getInviteText(2, "ar")}\nأهلاً & مرحباً؟ #تعلّم`;
  const links = getInviteLinks(text);
  const whatsapp = new URL(links.whatsapp);
  assert.equal(whatsapp.origin, "https://wa.me");
  assert.equal(whatsapp.searchParams.get("text"), text);
  const telegram = new URL(links.telegram);
  assert.equal(telegram.origin, "https://t.me");
  assert.equal(telegram.searchParams.get("url"), INVITE_APP_URL);
  assert.equal(telegram.searchParams.get("text"), text.replaceAll(INVITE_APP_URL, "").trim());
});
