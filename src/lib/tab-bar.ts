/** Pages with their own bottom action bar or a focused flow don't show the tab bar. */
export function showsTabBar(pathname: string) {
  return !/^\/(shop\/[^/]+|checkout|admin|auth)(\/|$)/.test(pathname);
}
