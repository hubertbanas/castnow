var http = require('http');
var internalIp = require('internal-ip');
var router = require('router');
var path = require('path');
var serveMp4 = require('../utils/serve-mp4');
var logger = require('../utils/logger');
var fs = require('fs');
var port = 4100;

var isFile = function(item) {
  return fs.existsSync(item.path) && fs.statSync(item.path).isFile();
};

var contains = function(arr, cb) {
  for (var i=0, len=arr.length; i<len; i++) {
    if (cb(arr[i], i)) return true;
  }
  return false;
};

var localfile = function(ctx, next) {
  if (ctx.mode !== 'launch') return next();
  if (!contains(ctx.options.playlist, isFile)) return next();

  var route = router();
  var list = ctx.options.playlist.slice(0);
  var ip = (ctx.options.myip || internalIp());

  ctx.options.playlist = list.map(function(item, idx) {
    if (!isFile(item)) return item;
    return {
      path: 'http://' + ip + ':' + port + '/' + idx,
      type: 'video/mp4',
      media: {
        metadata: {
          title: path.basename(item.path)
        }
      }
    };
  });

  route.all('/{idx}', function(req, res) {
    logger.print('[localfile] incoming request serving', list[req.params.idx].path);
    serveMp4(req, res, list[req.params.idx].path);
  });

  http.createServer(route).listen(port);
  logger.print('[localfile] started webserver on address', ip, 'using port', port);
  next();

};

module.exports = localfile;
