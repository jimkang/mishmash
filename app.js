import RouteState from 'route-state';
import handleError from 'handle-error-web';
import { version } from './package.json';
import ep from 'errorback-promise';
import { renderSources } from './renderers/render-sources';
import { renderResultAudio } from './renderers/render-result-audio';
import ContextKeeper from 'audio-context-singleton';
import { decodeArrayBuffer } from './tasks/decode-array-buffer';
import { queue } from 'd3-queue';
import shuffleMultipleBuffers from './updaters/shuffle-multiple-buffers';

var routeState;
var { getCurrentContext } = ContextKeeper();

(async function go() {
  window.onerror = reportTopLevelError;
  renderVersion();

  routeState = RouteState({
    followRoute,
    windowObject: window,
    propsToCoerceToBool: ['preserveTempo'],
  });
  routeState.routeFromHash();
})();

async function followRoute() {
  var { error, values } = await ep(getCurrentContext);
  if (error) {
    handleError(error);
    return;
  }

  var ctx = values[0];

  renderSources({ onBuffers });

  async function onBuffers(buffers) {
    // if (buffers.length < 2) {
    // return;
    // }

    var q = queue();
    buffers.forEach((buffer) => q.defer(decodeArrayBuffer, buffer));
    q.awaitAll(useAudioBuffers);
  }

  async function useAudioBuffers(decodeError, audioBuffers) {
    if (decodeError) {
      handleError(decodeError);
      return;
    }

    renderResultAudio({
      audioBuffer: audioBuffers[0],
      containerSelector: '.file1-audio',
    });
    if (audioBuffers.length > 0) {
      renderResultAudio({
        audioBuffer: audioBuffers[1],
        containerSelector: '.file2-audio',
      });
    }

    // var combinedBuffer = mishmashBuffers({
    //   ctx,
    //   audioBuffers,
    //   preserveTempo,
    //   samplesPerChunk: +samplesPerChunk,
    // });
    // console.log('Combined buffer', combinedBuffer);

    let { error, values } = await ep(shuffleMultipleBuffers, {
      audioContext: ctx,
      decodedBuffers: audioBuffers,
      tempo: 120,
      fadeInLengthAsSegmentPct: 5,
      fadeOutLengthAsSegmentPct: 5,
    });
    if (error) {
      handleError(error);
      return;
    }
    let shuffledBuffer = values[0];
    renderResultAudio({
      audioBuffer: shuffledBuffer,
      containerSelector: '.result-audio',
    });
  }
}

function reportTopLevelError(msg, url, lineNo, columnNo, error) {
  handleError(error);
}

function renderVersion() {
  var versionInfo = document.getElementById('version-info');
  versionInfo.textContent = version;
}
