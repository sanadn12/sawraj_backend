import rateLimit from 'express-rate-limit';

// Global rate limiter
export const globalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // max 100 requests per IP per minute
  standardHeaders: true, // return rate limit info in headers
  legacyHeaders: false, // disable X-RateLimit-* headers
  message: {
    status: 429,
    message: "Too many requests from this IP, please try again after a minute"
  }
});

