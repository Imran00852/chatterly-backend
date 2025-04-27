export const errorMiddleware = (err, req, res, next) => {
  err.message = err.message || "Internal Server Error!";
  err.statusCode = err.statusCode || 500;

  if (err.code === 11000) {
    err.message = `Duplicate ${Object.keys(err.keyValue)} entered!`;
    err.statusCode = 400;
  }

  if (err.name === "CastError") {
    err.message = `Invalid ${err.path}`;
    err.statusCode = 400;
  }

  return res.status(err.statusCode).json({
    success: false,
    message: err.message,
  });
};

export const TryCatch = (passFnc) => async (req, res, next) => {
  try {
    await passFnc(req, res, next);
  } catch (error) {
    next(error);
  }
};
