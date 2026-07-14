export function siteUrl(path = "") {
  const cleanPath = path && path !== "/" ? `/${path.replace(/^\/+/, "")}` : ""
  const isCongressDomain = window.location.hostname.toLowerCase().startsWith("tetelestai.")
  return isCongressDomain ? (cleanPath || "/") : `/site${cleanPath}`
}
