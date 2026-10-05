(() => {
  const types = new Set(['video/mp4', 'video/webm', 'video/ogg']);
  const maxBytes = 50_000_000;
  function normalize(videos) {
    return (Array.isArray(videos) ? videos : []).flatMap(video => {
      if (typeof video === 'string') return [video];
      if (!video || !/^[a-zA-Z0-9-]+$/.test(video.id || '') || !types.has(video.contentType)) return [];
      return [{ id: video.id, name: typeof video.name === 'string' ? video.name : 'Uploaded video', contentType: video.contentType }];
    });
  }
  function fileType(file) {
    return file.type || ({ mp4: 'video/mp4', webm: 'video/webm', ogg: 'video/ogg', ogv: 'video/ogg' })[file.name.split('.').pop().toLowerCase()] || '';
  }
  function validate(file) {
    if (!file) return 'Choose a video to upload.';
    if (!types.has(fileType(file))) return 'Choose an MP4, WebM, or Ogg video.';
    if (!file.size) return 'The video file is empty.';
    if (file.size > maxBytes) return 'Video is too large (50 MB maximum).';
    return '';
  }
  function assetUrl(base, id) {
    if (!base || !/^[a-zA-Z0-9-]+$/.test(id)) return '';
    try {
      const url = new URL(base);
      if (!['http:', 'https:'].includes(url.protocol)) return '';
      return `${base.replace(/\/$/, '')}/attire-videos/${id}`;
    } catch { return ''; }
  }
  globalThis.AttireVideos = { normalize, fileType, validate, assetUrl };
})();
