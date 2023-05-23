var probable = require('probable');
var range = require('d3-array').range;
var ease = require('d3-ease');

function shuffleBuffer(
  {
    audioContext,
    decodedBuffer,
    segmentLengthInSeconds = 30 / 64,
    fadeInLengthAsSegmentPct,
    fadeOutLengthAsSegmentPct,
  },
  done
) {
  if (decodedBuffer.numberOfChannels !== 2) {
    done(new Error('Need to handle buffers that do not have two channels.'));
    return;
  }

  var leftPCMArray = decodedBuffer.getChannelData(0);
  var rightPCMArray = decodedBuffer.getChannelData(1);
  var shuffledArrays = chopUpPCMArrays(
    leftPCMArray,
    rightPCMArray,
    decodedBuffer.sampleRate,
    segmentLengthInSeconds,
    fadeInLengthAsSegmentPct,
    fadeOutLengthAsSegmentPct
  );

  var shuffledBuffer = audioContext.createBuffer(
    2,
    shuffledArrays[0].length,
    decodedBuffer.sampleRate
  );

  if (typeof shuffledBuffer.copyToChannel === 'function') {
    shuffledBuffer.copyToChannel(shuffledArrays[0], 0, 0);
    shuffledBuffer.copyToChannel(shuffledArrays[1], 1, 0);
  } else {
    // TODO: Should chopUpPCMArrays just use the channel data arrays directly?
    let leftShuffledChannel = shuffledBuffer.getChannelData(0);
    let rightShuffledChannel = shuffledBuffer.getChannelData(1);
    for (let i = 0; i < shuffledArrays[0].length; ++i) {
      leftShuffledChannel[i] = shuffledArrays[0][i];
      rightShuffledChannel[i] = shuffledArrays[1][i];
    }
  }
  done(null, shuffledBuffer);
  // playBuffer(audioContext, shuffledBuffer);
}

function chopUpPCMArrays(
  leftPCMArray,
  rightPCMArray,
  sampleRate,
  segmentLengthInSeconds,
  fadeInLengthAsSegmentPct,
  fadeOutLengthAsSegmentPct
) {
  var totalFrames = leftPCMArray.length;
  var clipSizeInFrames = ~~(segmentLengthInSeconds * sampleRate);
  var fadeInFrameCount = ~~(
    (clipSizeInFrames * fadeInLengthAsSegmentPct) /
    100
  );
  var fadeOutFrameCount = ~~(
    (clipSizeInFrames * fadeOutLengthAsSegmentPct) /
    100
  );
  var numberOfSegments = ~~(totalFrames / clipSizeInFrames);
  var newLeftArray = new Float32Array(totalFrames);
  var newRightArray = new Float32Array(totalFrames);
  var sourceOffsets = probable.shuffle(range(numberOfSegments));
  sourceOffsets.forEach(copyIntoNewArrays);

  function copyIntoNewArrays(sourceIndex, destIndex) {
    var sourceOffset = sourceIndex * clipSizeInFrames;
    var destOffset = destIndex * clipSizeInFrames;
    var sourceEndPosition = sourceOffset + clipSizeInFrames;
    var leftClip = leftPCMArray.subarray(sourceOffset, sourceEndPosition);
    var rightClip = rightPCMArray.subarray(sourceOffset, sourceEndPosition);
    if (fadeInFrameCount > 0) {
      fadeIn(fadeInFrameCount, leftClip, rightClip);
    }
    if (fadeOutFrameCount > 0) {
      fadeOut(fadeOutFrameCount, leftClip, rightClip);
    }

    console.log('leftClip size:', leftClip.length);
    console.log(
      'Copying',
      clipSizeInFrames,
      'from',
      sourceOffset,
      'to',
      destOffset
    );
    newLeftArray.set(leftClip, destOffset);
    newRightArray.set(rightClip, destOffset);
  }

  return [newLeftArray, newRightArray];
}

function fadeIn(length, array0, array1) {
  for (let i = 0; i < length; ++i) {
    let proportion = ease.easeCubicInOut(i / length);
    array0[i] = array0[i] * proportion;
    array1[i] = array1[i] * proportion;
  }
}

function fadeOut(length, array0, array1) {
  for (let j = 0; j < length; ++j) {
    let index = array0.length - 1 - j;
    let proportion = ease.easeCubicInOut(j / length);
    array0[index] = array0[index] * proportion;
    array1[index] = array1[index] * proportion;
  }
}

module.exports = shuffleBuffer;
