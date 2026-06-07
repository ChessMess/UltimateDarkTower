class HDRLoader {
  load(_url, onLoad, _onProgress, _onError) {
    if (onLoad) onLoad({ mapping: 0, dispose() {} });
  }
}

module.exports = { HDRLoader };
