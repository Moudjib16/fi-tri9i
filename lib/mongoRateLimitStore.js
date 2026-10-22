const mongoose = require('mongoose');
const { logger } = require('./logger');

class MongoRateLimitStore {
  constructor({ prefix = 'rate-limit', collectionName = 'rate_limits', log = logger } = {}) {
    this.prefix = prefix;
    this.collectionName = collectionName;
    this.windowMs = 15 * 60 * 1000;
    this.log = log;
    this.indexPromise = null;
  }

  init(options) {
    this.windowMs = options.windowMs;
  }

  collection() {
    return mongoose.connection.collection(this.collectionName);
  }

  ensureIndex() {
    if (!this.indexPromise) {
      this.indexPromise = this.collection()
        .createIndex({ resetTime: 1 }, { expireAfterSeconds: 0 })
        .catch((err) => {
          this.indexPromise = null;
          this.log.warn('rate_limit_index_failed', { err });
        });
    }
    return this.indexPromise;
  }

  key(key) {
    return `${this.prefix}:${key}`;
  }

  async increment(key) {
    this.ensureIndex();
    try {
      return await this.incrementOnce(key);
    } catch (err) {
      // Concurrent upserts can race on the unique _id and lose the race.
      if (err && err.code === 11000) {
        return this.incrementOnce(key);
      }
      throw err;
    }
  }

  async incrementOnce(key) {
    const now = new Date();
    const resetTime = new Date(now.getTime() + this.windowMs);
    const result = await this.collection().findOneAndUpdate(
      { _id: this.key(key) },
      [
        {
          $set: {
            totalHits: {
              $cond: [
                { $gt: ['$resetTime', now] },
                { $add: [{ $ifNull: ['$totalHits', 0] }, 1] },
                1,
              ],
            },
            resetTime: {
              $cond: [{ $gt: ['$resetTime', now] }, '$resetTime', resetTime],
            },
          },
        },
      ],
      { upsert: true, returnDocument: 'after' }
    );

    const document = result && result.value !== undefined ? result.value : result;
    return {
      totalHits: document.totalHits,
      resetTime: document.resetTime,
    };
  }

  async decrement(key) {
    await this.collection().updateOne(
      { _id: this.key(key) },
      { $inc: { totalHits: -1 } }
    );
  }

  async resetKey(key) {
    await this.collection().deleteOne({ _id: this.key(key) });
  }
}

module.exports = MongoRateLimitStore;
