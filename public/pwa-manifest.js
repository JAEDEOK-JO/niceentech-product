(function () {
  var path = location.pathname
  var href = '/manifest.webmanifest'
  if (path === '/cnc-only') href = '/manifest-cnc-only.webmanifest'
  else if (path === '/worker' || path.indexOf('/worker/') === 0) href = '/manifest-worker.webmanifest'

  var link = document.createElement('link')
  link.rel = 'manifest'
  link.href = href
  document.head.appendChild(link)

  new MutationObserver(function () {
    document.querySelectorAll('link[rel="manifest"]').forEach(function (node) {
      if (node !== link) node.remove()
    })
  }).observe(document.documentElement, { childList: true, subtree: true })
})()
