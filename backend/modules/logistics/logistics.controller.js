const { sendSuccess } = require('../../app/http/response');

function getLogisticsPlaceholder(req, res) {
  return sendSuccess(res, {
    status: 'placeholder',
    message: 'Logistics module is reserved for a future release.'
  });
}

module.exports = {
  getLogisticsPlaceholder
};
