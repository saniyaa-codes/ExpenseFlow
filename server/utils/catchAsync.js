/**
 * Asynchronous Controller Wrapper
 * Eliminates repetitive try-catch blocks in Express route controllers.
 *
 * @param {Function} fn - Async controller function
 * @returns {Function} Express middleware handler
 */
const catchAsync = (fn) => {
  return (req, res, next) => {
    return fn(req, res, next).catch(next);
  };
};

export default catchAsync;
