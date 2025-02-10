/*
    Cache service to store data in memory for a certain duration.

    The default cache duration is 24 hours.

    It can be used to cache data as long as the server is alive, it won't persist data after the server is shut down.
*/
class CacheService {
  constructor(cacheDuration = 24 * 60 * 60 * 1000) {
    this.data = new Map();
    this.CACHE_DURATION = cacheDuration;
  }

  isValid(key) {
    const item = this.data.get(key);
    return item && Date.now() - item.timestamp <= this.CACHE_DURATION;
  }

  getData(key) {
    return this.data.get(key)?.data;
  }

  setData(key, data) {
    this.data.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  setPromise(key, promise) {
    this.data.set(key, {
      data: promise,
    });
    // Clear promise after completion
    promise.finally(() => this.data.delete(key));
  }

  clear() {
    this.data.clear();
  }
}

export default new CacheService();
