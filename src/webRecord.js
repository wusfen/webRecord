var records = []
var MAX_RECORDS = 100

// max
records.push = function(item) {
  var date = new Date()
  item.time = date.getTime()

  if (this.length>=MAX_RECORDS) {
    this.shift()
  }
  return Array.prototype.push.apply(this, arguments)
}

// init
records.push({
  type: 'init',
  url: location.href,
  ua: navigator.userAgent,
  width: window.innerWidth,
  height: window.innerHeight,
})

// DOMContentLoaded
document.addEventListener('DOMContentLoaded', function(e) {
  records.push({
    type: e.type,
  })
})

// load
addEventListener('load', function(e) {
  records.push({
    type: e.type,
  })
})

// error
addEventListener('error', function (e) {
  records.push({
    type: e.type,
  })
}, true)

// xhr
function interceptXHR(requestCb) {
  var __XMLHttpRequest = window.XMLHttpRequest
  var __open = __XMLHttpRequest.prototype.open
  var __setRequestHeader = __XMLHttpRequest.prototype.setRequestHeader
  var __send = __XMLHttpRequest.prototype.send
  window.XMLHttpRequest = function() {
    this.__xhr = new __XMLHttpRequest
  }

  XMLHttpRequest.prototype.open = function (method, url) {
    var __xhr = this.__xhr
    var xhr = this
    var requestInfo = {
      type: 'xhr:request',
      xhr,
      method,
      url,
      headers: {},
    }

    xhr.setRequestHeader = function (k, v) {
      requestInfo.headers[k] = v
      return __setRequestHeader.apply(__xhr, arguments)
    }

    xhr.send = function(e) {
      var onreadystatechange = xhr.onreadystatechange

      var responseCb = requestCb(requestInfo)

      if (typeof responseCb != 'function') {
        xhr.responseText = responseCb
        xhr.response = responseCb

        xhr.readyState = 4
        onreadystatechange.apply(xhr, new Event('readystatechange'))
        return
      }

      __xhr.onreadystatechange = function(e) {

        if (__xhr.readyState == 4) {
          var _res = responseCb({
            type: 'xhr:response',
            xhr,
            method,
            url,
            headers: __xhr.getAllResponseHeaders(),
            response: (function() {
              try {
                return __xhr.response
              } catch (_) {}
              return __xhr.responseText
            })(),
          })

          if (_res) {
            xhr.responseText = _res
            xhr.response = _res
          }
        }

        return onreadystatechange.apply(xhr, arguments)
      }

      return __send.apply(__xhr, arguments)
    }

    return __open.apply(__xhr, arguments)
  }
}

// fetch
function interceptFetch(requestCb) {
  var __fetch = window.fetch
  if (!__fetch || /XMLHttpRequest/.test(__fetch)) return

  window.fetch = function(url, requestInit) {
    requestInit = requestInit || {}
    var requestInfo = {
      url,
      type: 'fetch:request',
      method: requestInit.method || 'get',
      headers: requestInit.headers || {},
    }
    var responseCb = requestCb(requestInfo)

    if (typeof responseCb != 'function') {
      var promise = new Promise(function (rs) {
        rs({
          clone() {return promise},
          text() {return responseCb},
          json() {return responseCb},
          blob() {return responseCb},
        })
      })
      return promise
    }

    return new Promise(function(rs, rj) {
      var promise = __fetch.apply(this, arguments)

      var responseInfo = {
        type: 'fetch:response',
        method: requestInfo.method,
        url: requestInfo.url,
        headers: {},
      }

      promise.then(function(res) {
        res.clone().then(function (res) {

          responseInfo.headers = (function() {
            var keys = res.headers.keys()
            var next
            var obj = {}
            while (((next = keys.next()), !next.done)) {
              obj[next.value] = res.headers.get(next.value)
            }
            return obj
          })()

          res.then(function (res) {
            res.text().then(function (text) {
              responseInfo.response = text
              var _res = responseCb(responseInfo)
              if (_res) {
                rs(_res)
              }
            })
          })

        })
      }).catch(function (e) {
        var _res = responseCb(responseInfo)
        if (_res) {
          rs(_res)
        }
        rj(e)
      })

    })

  }
}

// xhr + fetch
function interceptAjax(requestCb) {
  interceptXHR(requestCb)
  interceptFetch(requestCb)
}

interceptAjax(function(info) {
  var id = Math.random()

  records.push({
    id,
    type: info.type,
    method: info.method,
    url: info.url,
    headers: info.headers,
  })

  return 'info.response'

  return function(info) {
    records.push({
      id,
      type: info.type,
      method: info.method,
      url: info.url,
      response: info.response,
    })

    return 'info.response'
  }
})

// TODO multi
// interceptAjax(function (info) {
//   console.table(info)
// })
