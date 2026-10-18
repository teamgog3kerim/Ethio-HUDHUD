import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getMobilePlatform, isInAppBrowser } from './install-platform';

test('recognizes Android phones and tablets', () => {
  assert.equal(getMobilePlatform('Mozilla/5.0 (Linux; Android 14) Chrome/130', 'Linux armv8l', 5), 'android');
});
test('recognizes iPhones and desktop-mode iPads', () => {
  assert.equal(getMobilePlatform('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)', 'iPhone', 5), 'ios');
  assert.equal(getMobilePlatform('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)', 'MacIntel', 5), 'ios');
});
test('does not prompt ordinary desktop browsers', () => {
  assert.equal(getMobilePlatform('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)', 'MacIntel', 0), null);
  assert.equal(getMobilePlatform('Mozilla/5.0 (Windows NT 10.0)', 'Win32', 0), null);
});
test('recognizes embedded browsers that need external-browser instructions', () => {
  assert.equal(isInAppBrowser('Mozilla Android 14; wv) Version/4.0 Chrome/130'), true);
  assert.equal(isInAppBrowser('Mozilla iPhone Instagram 350'), true);
  assert.equal(isInAppBrowser('Mozilla Android Chrome/130 Mobile Safari/537.36'), false);
});
