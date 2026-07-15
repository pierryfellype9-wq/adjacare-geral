export function siteUrl(path = "") {
  const cleanPath = path && path !== "/" ? `/${path.replace(/^\/+/, "")}` : ""
  const isCongressDomain = window.location.hostname.toLowerCase().startsWith("tetelestai.")
  const isPreview = window.location.pathname.toLowerCase().startsWith("/site-preview")
  return isCongressDomain ? (cleanPath || "/") : `${isPreview ? "/site-preview" : "/site"}${cleanPath}`
}
