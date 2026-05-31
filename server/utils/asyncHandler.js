'use strict';

/**
 * Wraps an async Express route handler to forward unhandled rejections to next().
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
