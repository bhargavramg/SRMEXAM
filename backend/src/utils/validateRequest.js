const validateRequest = (schema) => (req, res, next) => {
  try {
    const validatedData = schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    
    // Replace request data with validated data (strips unknown fields)
    req.body = validatedData.body;
    req.query = validatedData.query;
    req.params = validatedData.params;
    
    next();
  } catch (error) {
    next(error); // Handled by errorHandler.js which formats Zod errors
  }
};

module.exports = validateRequest;
