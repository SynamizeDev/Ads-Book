const jwt = require("jsonwebtoken");

const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET;

/**
 * Middleware to verify Supabase JWT tokens.
 * If SUPABASE_JWT_SECRET is not set, auth is skipped (dev/transition mode).
 */
function requireAuth(req, res, next) {
    // If no JWT secret configured, skip auth (development/transition)
    if (!SUPABASE_JWT_SECRET) {
        return next();
    }

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Missing or invalid authorization header" });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, SUPABASE_JWT_SECRET);
        req.user = {
            id: decoded.sub,
            email: decoded.email,
            role: decoded.role,
        };
        next();
    } catch (err) {
        return res.status(401).json({ error: "Invalid or expired token" });
    }
}

module.exports = { requireAuth };
