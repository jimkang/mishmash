var queue = require('d3-queue').queue;
var shuffleBuffer = require('./shuffle-buffer');
var copyBufferToBuffer = require('../tasks/copy-buffer-to-buffer');

function shuffleMultipleBuffers(
  {
    audioContext,
    decodedBuffers,
    tempo,
    fadeInLengthAsSegmentPct,
    fadeOutLengthAsSegmentPct,
  },
  done
) {
  var q = queue(1);

  for (var i = 0; i < decodedBuffers.length; ++i) {
    let decodedBuffer = decodedBuffers[i];
    if (!(decodedBuffer instanceof AudioBuffer)) {
      done(
        new Error(
          `Buffer ${i} passed to shuffleMultipleBuffers was not decoded.`
        )
      );
      return;
    }

    let segmentLengthInSeconds = 60.0 / tempo;
    q.defer(shuffleBuffer, {
      audioContext,
      decodedBuffer,
      segmentLengthInSeconds,
      fadeInLengthAsSegmentPct,
      fadeOutLengthAsSegmentPct,
    });
  }

  q.awaitAll(combineBuffers);

  function combineBuffers(error, shuffledBuffers) {
    if (error) {
      done(error);
    } else {
      let combinedBufferLength = shuffledBuffers
        .map((b) => b.length)
        .reduce((s, l) => s + l);
      let combinedBuffer = audioContext.createBuffer(
        2,
        combinedBufferLength,
        shuffledBuffers[0].sampleRate
      );
      let index = 0;
      for (let i = 0; i < shuffledBuffers.length; ++i) {
        copyBufferToBuffer({
          srcBuffer: shuffledBuffers[i],
          destBuffer: combinedBuffer,
          srcOffset: 0,
          destOffset: index,
        });
        index += shuffledBuffers[i].length;
      }
      done(null, combinedBuffer);
    }
  }
}

module.exports = shuffleMultipleBuffers;
