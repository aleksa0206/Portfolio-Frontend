import { shouldShow } from './consent-dialog';

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
