const { sendError } = require('./response');

function notFoundHandler(req, res) {
  return sendError(res, 404, 'NOT_FOUND', 'Route not found');
}

module.exports = {
  notFoundHandler
};
