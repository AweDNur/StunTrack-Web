const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    const token = req.headers['authorization'] || (typeof req.query.token === 'string' ? `Bearer ${req.query.token}` : null);
    if (!token) return res.status(403).json({ message: 'Token tidak disediakan' });

    try {
        const decoded = jwt.verify(token.split(" ")[1], process.env.JWT_SECRET);
        req.user = decoded; 
        next();
    } catch (err) {
        return res.status(401).json({ message: 'Token tidak valid' });
    }
};

const checkRole = (roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ message: 'Akses ditolak. Role tidak sesuai.' });
        }
        next();
    };
};

module.exports = { verifyToken, checkRole };
