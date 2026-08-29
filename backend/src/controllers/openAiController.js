const openAiDecodeService = require("../services/openAiDecodeService");

async function decodePending(req, res, next) {
  try {
    const result = await openAiDecodeService.decodePending({
      limit: req.query.limit || req.body?.limit,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function decodeOne(req, res, next) {
  try {
    const result = await openAiDecodeService.decodeOne(req.params.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function resetFailedDecodes(req, res, next) {
  try {
    const result = await openAiDecodeService.resetFailedDecodes();
    res.json(result);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  decodeOne,
  decodePending,
  resetFailedDecodes,
};
