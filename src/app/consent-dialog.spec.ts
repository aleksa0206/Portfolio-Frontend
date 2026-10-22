import { shouldShow } from './consent-dialog';
import { isMalicious } from './idle-prank';

describe('shouldShow (consent popup)', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  it('follows the admin repeat setting', () => {
    expect(shouldShow('visit')).toBe(true);
    expect(shouldShow('off')).toBe(false);

    localStorage.setItem('consent-closed-at', String(Date.now() - 2 * 24 * 60 * 60 * 1000));
    expect(shouldShow('once')).toBe(false);
    expect(shouldShow('day')).toBe(true);
    expect(shouldShow('week')).toBe(false);

    sessionStorage.setItem('consent-seen', '1'); // already closed in this tab: never on refresh
    expect(shouldShow('visit')).toBe(false);
    expect(shouldShow('day')).toBe(false);
  });
});

describe('isMalicious (terminal easter egg)', () => {
  it('flags commands that would wreck a real machine', () => {
    for (const c of ['rm -rf /', 'sudo ls', '/bin/rm x', 'mkfs.ext4 /dev/sda', ':(){ :|:& };:']) {
      expect(isMalicious(c), c).toBe(true);
    }
    for (const c of ['ls -la', 'cat rm.txt', 'help', '']) {
      expect(isMalicious(c), c).toBe(false);
    }
  });
});
