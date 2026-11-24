(function () {
  var path = location.pathname
  var href = '/manifest.webmanifest'
  if (path === '/worker' || path.indexOf('/worker/') === 0) href = '/manifest-worker.webmanifest'

  window.__workerInstallEvent = null
  window.__workerInstallWantsNative = false
  window.addEventListener('beforeinstallprompt', function (event) {
    var current = location.pathname
    if (current !== '/worker' && current.indexOf('/worker/') !== 0) return
    window.__workerInstallEvent = event
    if (window.__workerInstallWantsNative) return
    event.preventDefault()
    window.dispatchEvent(new Event('workerinstallready'))
  })

  function applyManifest() {
    var link = document.querySelector('link[rel="manifest"]')
    if (!link) {
      link = document.createElement('link')
      link.rel = 'manifest'
      document.head.appendChild(link)
    }
    if (link.getAttribute('href') !== href) link.setAttribute('href', href)
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', applyManifest)
  else applyManifest()
})()
