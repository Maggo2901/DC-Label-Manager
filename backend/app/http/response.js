function sendSuccess(res, data, status = 200) {
  return res.status(status).json({
    success: true,
    data: data || {}
  });
}

function sendError(res, status, code, message, details) {
  return res.status(status).json({
    success: false,
    error: {
      code,
      message,
      details: details || undefined
    }
  });
}

module.exports = {
  sendSuccess,
  sendError
};
