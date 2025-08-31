/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, {
/******/ 				configurable: false,
/******/ 				enumerable: true,
/******/ 				get: getter
/******/ 			});
/******/ 		}
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/* global NAF */

var EasyRtcAdapter = function () {
  function EasyRtcAdapter(easyrtc) {
    _classCallCheck(this, EasyRtcAdapter);

    this.easyrtc = easyrtc || window.easyrtc;
    this.app = "default";
    this.room = "default";

    this.audioStreams = {};
    this.pendingAudioRequest = {};

    this.serverTimeRequests = 0;
    this.timeOffsets = [];
    this.avgTimeOffset = 0;
  }

  _createClass(EasyRtcAdapter, [{
    key: "setServerUrl",
    value: function setServerUrl(url) {
      this.easyrtc.setSocketUrl(url);
    }
  }, {
    key: "setApp",
    value: function setApp(appName) {
      this.app = appName;
    }
  }, {
    key: "setRoom",
    value: function setRoom(roomName) {
      this.room = roomName;
      this.easyrtc.joinRoom(roomName, null);
    }

    // options: { datachannel: bool, audio: bool }

  }, {
    key: "setWebRtcOptions",
    value: function setWebRtcOptions(options) {
      // this.easyrtc.enableDebug(true);
      this.easyrtc.enableDataChannels(options.datachannel);

      this.easyrtc.enableVideo(false);
      this.easyrtc.enableAudio(options.audio);

      this.easyrtc.enableVideoReceive(false);
      this.easyrtc.enableAudioReceive(true);
    }
  }, {
    key: "setServerConnectListeners",
    value: function setServerConnectListeners(successListener, failureListener) {
      this.connectSuccess = successListener;
      this.connectFailure = failureListener;
    }
  }, {
    key: "setRoomOccupantListener",
    value: function setRoomOccupantListener(occupantListener) {
      this.easyrtc.setRoomOccupantListener(function (roomName, occupants, primary) {
        occupantListener(occupants);
      });
    }
  }, {
    key: "setDataChannelListeners",
    value: function setDataChannelListeners(openListener, closedListener, messageListener) {
      this.easyrtc.setDataChannelOpenListener(openListener);
      this.easyrtc.setDataChannelCloseListener(closedListener);
      this.easyrtc.setPeerListener(messageListener);
    }
  }, {
    key: "updateTimeOffset",
    value: function updateTimeOffset() {
      var _this = this;

      var clientSentTime = Date.now() + this.avgTimeOffset;

      return fetch(document.location.href, { method: "HEAD", cache: "no-cache" }).then(function (res) {
        var precision = 1000;
        var serverReceivedTime = new Date(res.headers.get("Date")).getTime() + precision / 2;
        var clientReceivedTime = Date.now();
        var serverTime = serverReceivedTime + (clientReceivedTime - clientSentTime) / 2;
        var timeOffset = serverTime - clientReceivedTime;

        _this.serverTimeRequests++;

        if (_this.serverTimeRequests <= 10) {
          _this.timeOffsets.push(timeOffset);
        } else {
          _this.timeOffsets[_this.serverTimeRequests % 10] = timeOffset;
        }

        _this.avgTimeOffset = _this.timeOffsets.reduce(function (acc, offset) {
          return acc += offset;
        }, 0) / _this.timeOffsets.length;

        if (_this.serverTimeRequests > 10) {
          setTimeout(function () {
            return _this.updateTimeOffset();
          }, 5 * 60 * 1000); // Sync clock every 5 minutes.
        } else {
          _this.updateTimeOffset();
        }
      });
    }
  }, {
    key: "connect",
    value: function connect() {
      var _this2 = this;

      Promise.all([this.updateTimeOffset(), new Promise(function (resolve, reject) {
        _this2._connect(_this2.easyrtc.audioEnabled, resolve, reject);
      })]).then(function (_ref) {
        var _ref2 = _slicedToArray(_ref, 2),
            _ = _ref2[0],
            clientId = _ref2[1];

        _this2._storeAudioStream(_this2.easyrtc.myEasyrtcid, _this2.easyrtc.getLocalStream());

        _this2._myRoomJoinTime = _this2._getRoomJoinTime(clientId);
        _this2.connectSuccess(clientId);
      }).catch(this.connectFailure);
    }
  }, {
    key: "shouldStartConnectionTo",
    value: function shouldStartConnectionTo(client) {
      return this._myRoomJoinTime <= client.roomJoinTime;
    }
  }, {
    key: "startStreamConnection",
    value: function startStreamConnection(clientId) {
      this.easyrtc.call(clientId, function (caller, media) {
        if (media === "datachannel") {
          NAF.log.write("Successfully started datachannel to ", caller);
        }
      }, function (errorCode, errorText) {
        NAF.log.error(errorCode, errorText);
      }, function (wasAccepted) {
        // console.log("was accepted=" + wasAccepted);
      });
    }
  }, {
    key: "closeStreamConnection",
    value: function closeStreamConnection(clientId) {
      // Handled by easyrtc
    }
  }, {
    key: "sendData",
    value: function sendData(clientId, dataType, data) {
      // send via webrtc otherwise fallback to websockets
      this.easyrtc.sendData(clientId, dataType, data);
    }
  }, {
    key: "sendDataGuaranteed",
    value: function sendDataGuaranteed(clientId, dataType, data) {
      this.easyrtc.sendDataWS(clientId, dataType, data);
    }
  }, {
    key: "broadcastData",
    value: function broadcastData(dataType, data) {
      var roomOccupants = this.easyrtc.getRoomOccupantsAsMap(this.room);

      // Iterate over the keys of the easyrtc room occupants map.
      // getRoomOccupantsAsArray uses Object.keys which allocates memory.
      for (var roomOccupant in roomOccupants) {
        if (roomOccupants[roomOccupant] && roomOccupant !== this.easyrtc.myEasyrtcid) {
          // send via webrtc otherwise fallback to websockets
          this.easyrtc.sendData(roomOccupant, dataType, data);
        }
      }
    }
  }, {
    key: "broadcastDataGuaranteed",
    value: function broadcastDataGuaranteed(dataType, data) {
      var destination = { targetRoom: this.room };
      this.easyrtc.sendDataWS(destination, dataType, data);
    }
  }, {
    key: "getConnectStatus",
    value: function getConnectStatus(clientId) {
      var status = this.easyrtc.getConnectStatus(clientId);

      if (status == this.easyrtc.IS_CONNECTED) {
        return NAF.adapters.IS_CONNECTED;
      } else if (status == this.easyrtc.NOT_CONNECTED) {
        return NAF.adapters.NOT_CONNECTED;
      } else {
        return NAF.adapters.CONNECTING;
      }
    }
  }, {
    key: "getMediaStream",
    value: function getMediaStream(clientId) {
      var that = this;
      if (this.audioStreams[clientId]) {
        NAF.log.write("Already had audio for " + clientId);
        return Promise.resolve(this.audioStreams[clientId]);
      } else {
        NAF.log.write("Waiting on audio for " + clientId);
        return new Promise(function (resolve) {
          that.pendingAudioRequest[clientId] = resolve;
        });
      }
    }
  }, {
    key: "disconnect",
    value: function disconnect() {
      this.easyrtc.disconnect();
    }

    /**
     * Privates
     */

  }, {
    key: "_storeAudioStream",
    value: function _storeAudioStream(easyrtcid, stream) {
      this.audioStreams[easyrtcid] = stream;
      if (this.pendingAudioRequest[easyrtcid]) {
        NAF.log.write("got pending audio for " + easyrtcid);
        this.pendingAudioRequest[easyrtcid](stream);
        delete this.pendingAudioRequest[easyrtcid](stream);
      }
    }
  }, {
    key: "_connect",
    value: function _connect(audioEnabled, connectSuccess, connectFailure) {
      var that = this;

      this.easyrtc.setStreamAcceptor(this._storeAudioStream.bind(this));

      this.easyrtc.setOnStreamClosed(function (easyrtcid) {
        delete that.audioStreams[easyrtcid];
      });

      if (audioEnabled) {
        this.easyrtc.initMediaSource(function () {
          that.easyrtc.connect(that.app, connectSuccess, connectFailure);
        }, function (errorCode, errmesg) {
          NAF.log.error(errorCode, errmesg);
        });
      } else {
        that.easyrtc.connect(that.app, connectSuccess, connectFailure);
      }
    }
  }, {
    key: "_getRoomJoinTime",
    value: function _getRoomJoinTime(clientId) {
      var myRoomId = NAF.room;
      var joinTime = this.easyrtc.getRoomOccupantsAsMap(myRoomId)[clientId].roomJoinTime;
      return joinTime;
    }
  }, {
    key: "getServerTime",
    value: function getServerTime() {
      return Date.now() + this.avgTimeOffset;
    }
  }]);

  return EasyRtcAdapter;
}();

NAF.adapters.register("easyrtc", EasyRtcAdapter);

module.exports = EasyRtcAdapter;

/***/ })
/******/ ]);
