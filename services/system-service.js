// tfc433/0223test1/0223test1-414989b3734fe392e53bab71f508b8df0df17bf6/services/system-service.js
/**
 * services/system-service.js
 * 系統服務模組
 * @version 2.1.1
 * @date 2026-04-20
 * @description 接管所有業務邏輯 (Defaults/Filter/Sort) 與 User 操作流程控制。
 * * Changelog:
 * - [V2.1.0] Appended exact '展會設定' keys to DEFAULT_SETTINGS to support safe fallback configuration.
 * - [Fix] Implemented case-insensitive, value-or-note matching for config merge to prevent duplicate pre-seeded defaults (e.g., Event Types).
 * - [V2.1.1] Fixed missing `style` mapping for newly created System Config items (ensures column F color is applied to all config groups, not only default-seeded ones)
 * - [Cleanup] Removed temporary forensic debug logging for System Config raw inspection
 */

class SystemService {
    /**
     * @param {SystemReader} systemReader 
     * @param {SystemWriter} systemWriter 
     */
    constructor(systemReader, systemWriter) {
        this.systemReader = systemReader;
        this.systemWriter = systemWriter;

        // 定義預設設定 (Moved from Reader)
        this.DEFAULT_SETTINGS = {
            '事件類型': [
                { value: 'general', note: '一般', order: 1, color: '#6c757d' },
                { value: 'iot', note: 'IOT', order: 2, color: '#007bff' },
                { value: 'dt', note: 'DT', order: 3, color: '#28a745' },
                { value: 'dx', note: 'DX', order: 4, color: '#ffc107' },
                { value: 'legacy', note: '舊事件', order: 5, color: '#dc3545' }
            ],
            '日曆篩選規則': [],
            // [Fallback Auto-Tag] Default Exhibition Config Injection (Strict key structure)
            '展會設定': [
                { value: 'exhibition_enabled', note: 'false', order: 1, category: '設定' },
                { value: 'exhibition_name', note: '預設展會', order: 2, category: '設定' },
                { value: 'exhibition_start_date', note: '1970-01-01', order: 3, category: '設定' },
                { value: 'exhibition_end_date', note: '1970-01-01', order: 4, category: '設定' }
            ]
        };
    }

    /**
     * 取得系統全域設定
     * 包含: Raw Data 讀取 -> 預設值注入 -> Filter -> Merge -> Sort
     */
    async getSystemConfig() {
        // 1. 取得原始資料
        const rows = await this.systemReader.getSystemConfigRaw();
        const settings = JSON.parse(JSON.stringify(this.DEFAULT_SETTINGS)); // Deep copy
        
        const normalize = (str) => (str || '').toString().trim().toLowerCase();
        
        // 2. 處理資料 (Business Logic)
        if (rows.length > 1) {
            rows.slice(1).forEach(row => {
                const [type, item, order, enabled, note, color, value2, value3, category] = row;
                
                if (type && item) {
                    const normalizedItem = normalize(item);
                    const matchFn = (i) => normalize(i.value) === normalizedItem || normalize(i.note) === normalizedItem;

                    if (enabled === 'TRUE') {
                        if (!settings[type]) settings[type] = [];
                        
                        const exists = settings[type].find(matchFn);
                        if (exists) {
                            exists.note = note || item;
                            exists.order = parseInt(order) || 99;
                        } else {
                            settings[type].push({
                                value: item,
                                note: note || item,
                                order: parseInt(order) || 99,
                                color: color || null,
                                style: color || null,
                                value2: value2 || null, 
                                value3: value3 || null, 
                                category: category || '其他' 
                            });
                        }
                    } else {
                        // 當 enabled !== 'TRUE' 時，若該項目已存在於預設值中，將其移除
                        if (settings[type]) {
                            const index = settings[type].findIndex(matchFn);
                            if (index !== -1) {
                                settings[type].splice(index, 1);
                            }
                        }
                    }
                }
            });
        }
        
        // 3. 排序 (Sorting Logic)
        Object.keys(settings).forEach(type => {
            if (Array.isArray(settings[type])) {
                settings[type].sort((a, b) => a.order - b.order);
            }
        });
        
        return settings;
    }

    /**
     * 清除後端快取
     */
    async invalidateCache() {
        this.systemReader.invalidateCache(null);
        return { success: true, message: '後端所有快取已清除' };
    }

    /**
     * 取得系統最後寫入狀態
     */
    async getSystemStatus() {
        const lastWrite = this.systemReader.getLastWriteTimestamp();
        return { success: true, lastWriteTimestamp: lastWrite };
    }

    /**
     * 更新系統偏好 (含 Cache Clear)
     */
    async updateSystemPref(item, note, modifier) {
        await this.systemWriter.updateSystemPref(item, note, modifier);
        this.systemReader.invalidateCache('systemConfigRaw');
        return { success: true };
    }

    /**
     * 建立使用者 (含 Cache Clear)
     */
    async createUser(userData) {
        await this.systemWriter.createUser(userData);
        this.systemReader.invalidateCache('users');
        return { success: true };
    }

    /**
     * 更新使用者密碼
     * Flow: Lookup(Reader) -> Write(Writer) -> Invalidate
     */
    async updateUserPassword(username, newPasswordHash) {
        // 1. Lookup
        const users = await this.systemReader.getUsers();
        const user = users.find(u => u.username === username);
        
        if (!user) throw new Error('找不到該使用者');
        
        // 2. Write by Row Index
        await this.systemWriter.updateUserPasswordByRow(user.rowIndex, newPasswordHash);

        // 3. Invalidate
        this.systemReader.invalidateCache('users');
        return { success: true };
    }

    /**
     * 刪除使用者
     * Flow: Lookup(Reader) -> Get SheetId(Reader) -> Write(Writer) -> Invalidate
     */
    async deleteUser(username) {
        // 1. Lookup User
        const users = await this.systemReader.getUsers();
        const user = users.find(u => u.username === username);
        if (!user) throw new Error('找不到該使用者');

        // 2. Get Sheet ID (Integer)
        const sheetId = await this.systemReader.getTabId('使用者名冊');
        if (sheetId === null) throw new Error('無法取得使用者名冊的 Sheet ID');

        // 3. Write (Delete Row)
        await this.systemWriter.deleteUserByRow(sheetId, user.rowIndex);

        // 4. Invalidate
        this.systemReader.invalidateCache('users');
        return { success: true };
    }
}

module.exports = SystemService;