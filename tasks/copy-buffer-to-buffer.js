function copyBufferToBuffer({ srcBuffer, destBuffer, srcOffset, destOffset }) {
  var totalFrames = srcBuffer.length;
  var array0 = new Float32Array(totalFrames);
  var array1 = new Float32Array(totalFrames);
  if (typeof srcBuffer.copyFromChannel === 'function') {
    srcBuffer.copyFromChannel(array0, 0, srcOffset);
    srcBuffer.copyFromChannel(array1, 1, srcOffset);
  } else {
    throw new Error('TODO: copyFromChannel polyfill');
  }

  if (typeof destBuffer.copyToChannel === 'function') {
    destBuffer.copyToChannel(array0, 0, destOffset);
    destBuffer.copyToChannel(array1, 1, destOffset);
  } else {
    throw new Error('TODO: copyToChannel polyfill');
  }
}

module.exports = copyBufferToBuffer;
