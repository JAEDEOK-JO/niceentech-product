export const DESKTOP_INSTALL_PASSWORD = '8462'
export const DESKTOP_INSTALL_BUCKET_URL = 'https://joxfohziazjhscewifjj.supabase.co/storage/v1/object/public/update'

export const buildDesktopInstallerFileName = (version) => {
  return `NICEENTECH Setup ${version}.exe`
}

export const buildDesktopInstallerUrl = (version) => {
  return `${DESKTOP_INSTALL_BUCKET_URL}/${encodeURIComponent(buildDesktopInstallerFileName(version))}`
}
