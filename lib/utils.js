const _ = exports;

_.noop = (...args) => {};

_.try = (fn, cb = _.noop) => {
  try {
    const result = fn();
    if (result instanceof Promise || (result && typeof result.then === 'function')) {
      return result.then(result => cb(null, result), cb);
    } else {
      return cb(null, result);
    }
  } catch (error) {
    cb(error);
  }
};

_.define = (target, key, descriptor) => Object.defineProperty(target, key, { configurable: true, writable: true, ...descriptor });

_.iClass = class { constructor(i) { Object.assign(this, i) } }
