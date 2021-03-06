var http = require('http');
var fs = require('fs');
var srt2vtt = require('srt2vtt');
var internalIp = require('internal-ip');
var logger = require('../utils/logger');
var got = require('got');
var port = 4101;

var srtToVtt = function(source, cb) {
  var handler = fs.existsSync(source) ? fs.readFile : got;
  handler(source, function(err, content) {
    if (err) return cb(err);
    if (!isSrt(source)) return cb(null, content);
    srt2vtt(content, function(err, data) {
      if (err) return cb(err);
      logger.print('[subtitles] converted srt to vtt', source);
      cb(null, data);
    });
  });
};

var isSrt = function(path) {
  return path.substr(-4).toLowerCase() === '.srt';
};

var attachSubtitles = function(ctx) {
  if (!ctx.options.playlist[0].media) {
    ctx.options.playlist[0].media = {};
  }
  ctx.options.playlist[0].media.tracks = [{
    trackId: 1,
    type: 'TEXT',
    trackContentId: ctx.options.subtitles,
    trackContentType: 'text/vtt',
    name: 'English',
    language: 'en-US',
    subtype: 'SUBTITLES'
  }];
  ctx.options.playlist[0].activeTrackIds = [1];
};

/*
** Handles subtitles, the process is the following:
**  - Is there subtitles in the command line ?
**  - Is there a media defined ?
**  - Are those subtitles stored locally (.srt) or on a distant server (.vtt) ?
**  - If they are stored locally we need to convert and serve them via http.
*/
var subtitles = function(ctx, next) {
  if (!ctx.options.subtitles) return next();
  if (ctx.options.playlist.length > 1) return next();

  srtToVtt(ctx.options.subtitles, function(err, data) {
    if (err) return next();
    logger.print('[subtitles] loading subtitles', ctx.options.subtitles);
    if (err) return next();
    var ip = ctx.options.myip || internalIp();
    var addr = 'http://' + ip + ':' + port;
    http.createServer(function(req, res) {
      logger.print('[subtitles] incoming request');
      res.writeHead(200, {
        'Access-Control-Allow-Origin': '*',
        'Content-Length': data.length,
        'Content-type': 'text/vtt;charset=utf-8'
      });
      res.end(data);
    }).listen(port);
    logger.print('[subtitles] started webserver on address', ip, 'using port', port);
    ctx.options.subtitles = addr;
    attachSubtitles(ctx);
    next();
  });
};

module.exports = subtitles;
