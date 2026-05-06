// controllers/announcement.controller.js
/**
 * AnnouncementController
 * * @version 6.0.0 (Phase 6 - Service Integration)
 * @date 2026-01-14
 * @description 公告模組控制器，修正為依賴 Service 層。
 */

const { handleApiError } = require('../middleware/error.middleware');

class AnnouncementController {
    /**
     * @param {AnnouncementService} announcementService 
     */
    constructor(announcementService) {
        this.announcementService = announcementService;
    }

    // GET /api/announcements
    getAnnouncements = async (req, res) => {
        try {
            const data = await this.announcementService.getAnnouncements();
            res.json({ success: true, data });
        } catch (error) {
            handleApiError(res, error, 'Get Announcements');
        }
    };

    // POST /api/announcements
    createAnnouncement = async (req, res) => {
        try {
            const result = await this.announcementService.createAnnouncement(req.body, req.user);
            res.json(result);
        } catch (error) {
            handleApiError(res, error, 'Create Announcement');
        }
    };

    // PUT /api/announcements/:id
    updateAnnouncement = async (req, res) => {
        try {
            const result = await this.announcementService.updateAnnouncement(req.params.id, req.body, req.user);
            res.json(result);
        } catch (error) {
            handleApiError(res, error, 'Update Announcement');
        }
    };

    // DELETE /api/announcements/:id
    deleteAnnouncement = async (req, res) => {
        try {
            const result = await this.announcementService.deleteAnnouncement(req.params.id);
            res.json(result);
        } catch (error) {
            handleApiError(res, error, 'Delete Announcement');
        }
    };
}

module.exports = AnnouncementController;