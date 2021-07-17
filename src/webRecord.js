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
// interceptXHR(requestInfo=>_res) // will not send
// interceptXHR(requestInfo=> responseInfo=>_res) // will send
function interceptXHR(handler) {
  var __XMLHttpRequest = window.XMLHttpRequest
  var __prototype = __XMLHttpRequest.prototype
  var __open = __prototype.open
  var __setRequestHeader = __prototype.setRequestHeader
  var __send = __prototype.send
  var requestInfoKey = '_requestInfo:'+Math.random().toString(36).slice(2)

  __prototype.open = function (method, url) {
    this[requestInfoKey] = {
      xhr,
      method,
      url,
      headers: {},
    }

    return __open.apply(this, arguments)
  }

  __prototype.setRequestHeader = function (k, v) {
    var requestInfo = this[requestInfoKey] || {}

    requestInfo.headers[k] = v

    return __setRequestHeader.apply(this, arguments)
  }

  __prototype.send = function(data) {
    var requestInfo = this[requestInfoKey] || {}
    var xhr = this

    requestInfo.data = data
    var callback = handler(requestInfo)

    // interceptXHR(requestInfo=> responseInfo=>_res)
    if (typeof callback == 'function') {
      var onreadystatechange_ = xhr.onreadystatechange
      xhr.onreadystatechange = function(e) {

        if (xhr.readyState == 4) {
          var _res = callback({
            headers: xhr.getAllResponseHeaders(),
            response: (function() {
              try {
                return xhr.response
              } catch (_) {}
              return xhr.responseText
            })(),
          })

          if (_res) {
            Object.defineProperty(xhr, 'responseText', {value:_res, configurable: true})
            Object.defineProperty(xhr, 'response', {value:_res, configurable: true})
          }
        }

        if (onreadystatechange_) {
          return onreadystatechange_.apply(xhr, arguments)
        }
      }
    }

    // interceptXHR(requestInfo=>_res)
    if (callback !== undefined && typeof callback != 'function') {
      var _res = callback
      Object.defineProperty(xhr, 'readyState', {value:4, configurable: true})
      Object.defineProperty(xhr, 'responseText', {value:_res, configurable: true})
      Object.defineProperty(xhr, 'response', {value:_res, configurable: true})

      xhr.dispatchEvent(new Event('readystatechange'))
      xhr.dispatchEvent(new Event('load'))
      xhr.dispatchEvent(new Event('loadend'))
      return
    }

    return __send.apply(this, [requestInfo.data])
  }

}

// fetch
function interceptFetch(requestCb) {
  var __fetch = window.fetch
  if (!__fetch || /XMLHttpRequest/.test(__fetch)) return

  window.fetch = function(url, requestInit) {
    requestInit = requestInit || {}
    var requestInfo = {
      method: requestInit.method || 'get',
      url,
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
  // interceptFetch(requestCb)
}

interceptAjax(function(info) {
  console.log(1, info)

  info.data = 222
  
  // return 'one'
})
interceptAjax(function (info) {
  console.log(2, info)
  return 'two'
})
interceptAjax(function (info) {
  console.log(3, info)
  // return 'three'
  return function () {
    return 'Three'
  }
})
