// middleware/role.middleware.js

/**
 * 角色權限檢查中間件
 * @param {Array<string>|string} allowedRoles - 允許的角色 (例如 'admin', ['admin', 'manager'])
 */
exports.requireRole = (allowedRoles) => {
    return (req, res, next) => {
        // 1. 確保使用者已登入 (req.user 存在)
        if (!req.user) {
            return res.status(401).json({ success: false, message: '未經授權：使用者未登入' });
        }

        // 2. 統一轉為陣列處理
        const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

        // 3. 檢查權限
        // 假設 req.user.role 來自 decoded JWT payload
        const userRole = req.user.role || 'sales'; // 預設降級為 sales

        if (roles.includes(userRole)) {
            next(); // 通行
        } else {
            console.warn(`⛔ [Access Denied] User: ${req.user.username}, Role: ${userRole}, Required: ${roles.join(',')}`);
            return res.status(403).json({ success: false, message: '權限不足：您無法存取此資源' });
        }
    };
};