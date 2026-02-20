const { streamTapePdf } = require('./ptouch.service');

function generateTapePdf(req, res, next) {
  try {
    const payload = req.body || {};
    streamTapePdf(res, payload);
  } catch (error) {
    if (!res.headersSent) {
      next(error);
    }
  }
}

module.exports = {
  generateTapePdf
};
