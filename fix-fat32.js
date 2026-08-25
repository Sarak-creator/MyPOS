// Patch fs.readlink / fs.readlinkSync to handle FAT32 drives on Windows
const fs = require('fs');

const origReadlink = fs.readlink;
fs.readlink = function (path, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  return origReadlink.call(fs, path, options, (err, linkString) => {
    if (err && (err.code === 'EISDIR' || err.code === 'EINVAL')) {
      const customErr = new Error(`EINVAL: invalid argument, readlink '${path}'`);
      customErr.code = 'EINVAL';
      customErr.errno = -4071;
      customErr.syscall = 'readlink';
      customErr.path = path;
      return callback(customErr);
    }
    return callback(err, linkString);
  });
};

const origReadlinkSync = fs.readlinkSync;
fs.readlinkSync = function (path, options) {
  try {
    return origReadlinkSync.call(fs, path, options);
  } catch (err) {
    if (err && (err.code === 'EISDIR' || err.code === 'EINVAL')) {
      const customErr = new Error(`EINVAL: invalid argument, readlink '${path}'`);
      customErr.code = 'EINVAL';
      customErr.errno = -4071;
      customErr.syscall = 'readlink';
      customErr.path = path;
      throw customErr;
    }
    throw err;
  }
};

if (fs.promises && fs.promises.readlink) {
  const origPromisesReadlink = fs.promises.readlink;
  fs.promises.readlink = async function (path, options) {
    try {
      return await origPromisesReadlink.call(fs.promises, path, options);
    } catch (err) {
      if (err && (err.code === 'EISDIR' || err.code === 'EINVAL')) {
        const customErr = new Error(`EINVAL: invalid argument, readlink '${path}'`);
        customErr.code = 'EINVAL';
        customErr.errno = -4071;
        customErr.syscall = 'readlink';
        customErr.path = path;
        throw customErr;
      }
      throw err;
    }
  };
}
