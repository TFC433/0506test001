/* [v7.9.4 Phase 7: Announcement Full SQL] */
/**
 * services/announcement-service.js
 * 布告欄業務邏輯層
 * * @version 7.9.4 (Phase 7: Announcement Full SQL)
 * * @date 2026-02-05
 * * @description 
 * - Full SQL Migration (Read & Write).
 * - Removed Google Sheet Fallback & Dependencies.
 * - Removed rowIndex guard logic (ID-based operations only).
 * - Enforces ID generation contract (ANC + Timestamp).
 */

class AnnouncementService {
    /**
     * @param {Object} dependencies
     * @param {AnnouncementSqlReader} dependencies.announcementSqlReader
     * @param {AnnouncementSqlWriter} dependencies.announcementSqlWriter
     */
    constructor({ announcementSqlReader, announcementSqlWriter }) {
        this.announcementSqlReader = announcementSqlReader;
        this.announcementSqlWriter = announcementSqlWriter;
    }

    // ============================================================
    //  Public Methods
    // ============================================================

    /**
     * 取得所有已發布公告 (含置頂排序)
     * @returns {Promise<Array>}
     */
    async getAnnouncements() {
        try {
            // [SQL Only] 直接讀取 DB
            let data = await this.announcementSqlReader.getAnnouncements();
            
            // 2. 業務過濾：僅顯示已發布
            data = data.filter(item => item.status === '已發布');

            // 3. 業務排序：置頂優先 > 最後更新時間
            data.sort((a, b) => {
                // 置頂判斷
                if (a.isPinned && !b.isPinned) return -1;
                if (!a.isPinned && b.isPinned) return 1;
                
                // 時間排序 (Desc)
                const dateA = new Date(a.lastUpdateTime || 0);
                const dateB = new Date(b.lastUpdateTime || 0);
                return dateB - dateA;
            });

            return data;
        } catch (error) {
            console.error('[AnnouncementService] getAnnouncements Error:', error);
            throw error;
        }
    }

    /**
     * 建立新公告
     * @param {Object} data - 公告資料
     * @param {Object} user - 建立者使用者物件
     */
    async createAnnouncement(data, user) {
        try {
            const creatorName = user.displayName || user.username || user.name || 'System';
            
            // 業務驗證
            if (!data.title) {
                throw new Error('公告標題為必填');
            }

            // [ID Contract] Service Layer generates ID strictly as ANC + Timestamp
            const newId = `ANC${Date.now()}`;
            
            const payload = {
                ...data,
                id: newId
            };

            // [SQL Write]
            const result = await this.announcementSqlWriter.createAnnouncement(payload, creatorName);
            return result;
        } catch (error) {
            console.error('[AnnouncementService] createAnnouncement Error:', error);
            throw error;
        }
    }

    /**
     * 更新公告
     * @param {string} id - 公告 ID
     * @param {Object} data - 更新資料
     * @param {Object} user - 操作者
     */
    async updateAnnouncement(id, data, user) {
        try {
            const modifierName = user.displayName || user.username || user.name || 'System';

            if (!id) throw new Error('公告 ID 為必填');

            // [SQL Write] Direct Update by ID
            const result = await this.announcementSqlWriter.updateAnnouncement(id, data, modifierName);
            return result;
        } catch (error) {
            console.error('[AnnouncementService] updateAnnouncement Error:', error);
            throw error;
        }
    }

    /**
     * 刪除公告
     * @param {string} id - 公告 ID
     */
    async deleteAnnouncement(id) {
        try {
            if (!id) throw new Error('公告 ID 為必填');

            // [SQL Write] Direct Delete by ID
            const result = await this.announcementSqlWriter.deleteAnnouncement(id);
            return result;
        } catch (error) {
            console.error('[AnnouncementService] deleteAnnouncement Error:', error);
            throw error;
        }
    }
}

module.exports = AnnouncementService;