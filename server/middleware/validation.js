const { z } = require('zod');

// Auth validation schemas
const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  full_name: z.string().min(2, 'Full name must be at least 2 characters'),
  phone: z.string().optional(),
  university: z.string().optional(),
  student_id: z.string().optional(),
  department: z.string().optional(),
  faculty: z.string().optional(),
  year_of_study: z.string().optional(),
  momo_number: z.string().optional(),
  momo_provider: z.string().optional()
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
});

// Asset validation schemas
const assetSchema = z.object({
  type: z.string().min(1, 'Asset type is required'),
  description: z.string().optional(),
  serial_number: z.string().optional(),
  estimated_value: z.string().or(z.number()).transform(val => parseFloat(val)).refine(val => val > 0, 'Estimated value must be greater than 0'),
  brand: z.string().optional(),
  model: z.string().optional(),
  condition: z.enum(['excellent', 'good', 'fair', 'poor']).optional(),
  images: z.array(z.string()).optional()
});

// Loan validation schemas
const loanSchema = z.object({
  amount: z.string().or(z.number()).transform(val => parseFloat(val)).refine(val => val >= 50, 'Minimum loan amount is GHS 50'),
  purpose: z.string().min(5, 'Purpose must be at least 5 characters'),
  asset_id: z.number().optional(),
  duration_days: z.number().int().min(1).max(365).optional()
});

// User update validation schemas
const userUpdateSchema = z.object({
  full_name: z.string().min(2).optional(),
  phone: z.string().optional(),
  university: z.string().optional(),
  department: z.string().optional(),
  faculty: z.string().optional(),
  year_of_study: z.string().optional(),
  date_of_birth: z.string().optional(),
  address: z.string().optional(),
  ghana_card_number: z.string().optional(),
  momo_number: z.string().optional(),
  momo_provider: z.string().optional(),
  bank_name: z.string().optional(),
  bank_code: z.string().optional(),
  account_number: z.string().optional(),
  account_name: z.string().optional()
});

// Guarantor validation schemas
const guarantorSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().min(10, 'Phone number must be at least 10 characters'),
  email: z.string().email('Invalid email address').optional(),
  relationship: z.string().optional()
});

// Notification validation schemas
const broadcastSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  message: z.string().min(1, 'Message is required'),
  type: z.enum(['info', 'success', 'warning', 'error']).optional(),
  university: z.string().optional()
});

// Validation middleware factory
function validate(schema) {
  return (req, res, next) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        });
      }
      return res.status(400).json({ error: 'Validation failed' });
    }
  };
}

module.exports = {
  validate,
  registerSchema,
  loginSchema,
  assetSchema,
  loanSchema,
  userUpdateSchema,
  guarantorSchema,
  broadcastSchema
};
