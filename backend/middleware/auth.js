const jwt = require("jsonwebtoken");

/**
 * Verifies the Bearer JWT from the Authorization header and attaches
 * the authenticated user payload ({ id, name, email }) to req.user.
 */
function authenticateToken(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
            message: "Authentication required. Missing Bearer token."
        });
    }

    const token = authHeader.slice(7).trim();
    if (!token) {
        return res.status(401).json({
            message: "Authentication required. Empty token."
        });
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
        console.error("JWT_SECRET is not configured in environment variables.");
        return res.status(500).json({
            message: "Server authentication configuration error"
        });
    }

    try {
        const decoded = jwt.verify(token, jwtSecret);
        req.user = {
            id: decoded.id,
            name: decoded.name,
            email: decoded.email
        };
        return next();
    } catch (error) {
        if (error.name === "TokenExpiredError") {
            return res.status(401).json({
                message: "Token expired. Please login again."
            });
        }
        return res.status(401).json({
            message: "Invalid token. Please login again."
        });
    }
}

module.exports = authenticateToken;
