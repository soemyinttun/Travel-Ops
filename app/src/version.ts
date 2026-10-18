/** Build details for support ("which version is my phone running?"). */
export const appVersion: { sha: string; builtAt: string } =
  typeof __APP_VERSION__ === 'undefined' ? { sha: 'dev', builtAt: '' } : __APP_VERSION__

export const versionLabel = () =>
  appVersion.builtAt ? `${appVersion.sha} · built ${appVersion.builtAt.slice(0, 16).replace('T', ' ')} UTC` : appVersion.sha
