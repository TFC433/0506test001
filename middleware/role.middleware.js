// middleware/role.middleware.js

/**
 * 角色權限檢查中間件
 * @param {Array<string>|string} allowedRoles - 允許的角色 (例如 'admin', ['admin', 'manager'])
 */
function normalizeRole(role, fallbackRole = '') {
    return String(role || fallbackRole).trim().toLowerCase();
}

function getEffectiveRoles(role) {
    const normalizedRole = normalizeRole(role, 'sales');

    if (normalizedRole === 'super_admin' || normalizedRole === 'system_manager') {
        return [normalizedRole, 'admin'];
    }

    return [normalizedRole];
}

function normalizeAllowedRoles(allowedRoles) {
    if (allowedRoles instanceof Set) return Array.from(allowedRoles).map(role => normalizeRole(role));
    return (Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles]).map(role => normalizeRole(role));
}

function roleAllows(allowedRoles, userRole) {
    const roles = normalizeAllowedRoles(allowedRoles);
    const effectiveRoles = getEffectiveRoles(userRole);
    return roles.some(role => effectiveRoles.includes(role));
}

function isAdminEquivalentRole(role) {
    return roleAllows('admin', role);
}

const requireRole = (allowedRoles) => {
    return (req, res, next) => {
        // 1. 確保使用者已登入 (req.user 存在)
        if (!req.user) {
            return res.status(401).json({ success: false, message: '未經授權：使用者未登入' });
        }

        // 2. 統一轉為陣列處理
        const roles = normalizeAllowedRoles(allowedRoles);

        // 3. 檢查權限
        // 假設 req.user.role 來自 decoded JWT payload
        const userRole = normalizeRole(req.user.role, 'sales'); // 預設降級為 sales

        if (roleAllows(roles, userRole)) {
            next(); // 通行
        } else {
            console.warn(`⛔ [Access Denied] User: ${req.user.username}, Role: ${userRole}, Required: ${roles.join(',')}`);
            return res.status(403).json({ success: false, message: '權限不足：您無法存取此資源' });
        }
    };
};

module.exports = {
    requireRole,
    normalizeRole,
    getEffectiveRoles,
    roleAllows,
    isAdminEquivalentRole
};
