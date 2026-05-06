/**
 * controllers/internal-ops.controller.js
 * 內部運營與進度追蹤 Controller
 * @version 1.0.0
 * @date 2026-04-20
 * @description 處理內部運營與進度追蹤的 API 請求
 */

class InternalOpsController {
    
    // ==========================================
    // 團隊成員負荷
    // ==========================================
    static async getTeamWorkloads(req, res, next) {
        try {
            const { internalOpsService } = req.app.get('services');
            const data = await internalOpsService.getTeamWorkloads();
            res.status(200).json({ success: true, data });
        } catch (error) {
            next(error);
        }
    }

    static async createTeamWorkload(req, res, next) {
        try {
            const { internalOpsService } = req.app.get('services');
            const result = await internalOpsService.createTeamWorkload(req.body);
            res.status(201).json(result);
        } catch (error) {
            next(error);
        }
    }

    static async updateTeamWorkload(req, res, next) {
        try {
            const { internalOpsService } = req.app.get('services');
            const { workId } = req.params;
            const result = await internalOpsService.updateTeamWorkload(workId, req.body);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    }

    static async deleteTeamWorkload(req, res, next) {
        try {
            const { internalOpsService } = req.app.get('services');
            const { workId } = req.params;
            const result = await internalOpsService.deleteTeamWorkload(workId);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    }

    // ==========================================
    // 開發案件追蹤
    // ==========================================
    static async getDevProjects(req, res, next) {
        try {
            const { internalOpsService } = req.app.get('services');
            const data = await internalOpsService.getDevProjects();
            res.status(200).json({ success: true, data });
        } catch (error) {
            next(error);
        }
    }

    static async createDevProject(req, res, next) {
        try {
            const { internalOpsService } = req.app.get('services');
            const result = await internalOpsService.createDevProject(req.body);
            res.status(201).json(result);
        } catch (error) {
            next(error);
        }
    }

    static async updateDevProject(req, res, next) {
        try {
            const { internalOpsService } = req.app.get('services');
            const { devId } = req.params;
            const result = await internalOpsService.updateDevProject(devId, req.body);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    }

    static async deleteDevProject(req, res, next) {
        try {
            const { internalOpsService } = req.app.get('services');
            const { devId } = req.params;
            const result = await internalOpsService.deleteDevProject(devId);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    }

    // ==========================================
    // 訂閱制管理
    // ==========================================
    static async getSubscriptions(req, res, next) {
        try {
            const { internalOpsService } = req.app.get('services');
            const data = await internalOpsService.getSubscriptions();
            res.status(200).json({ success: true, data });
        } catch (error) {
            next(error);
        }
    }

    static async createSubscription(req, res, next) {
        try {
            const { internalOpsService } = req.app.get('services');
            const result = await internalOpsService.createSubscription(req.body);
            res.status(201).json(result);
        } catch (error) {
            next(error);
        }
    }

    static async updateSubscription(req, res, next) {
        try {
            const { internalOpsService } = req.app.get('services');
            const { subId } = req.params;
            const result = await internalOpsService.updateSubscription(subId, req.body);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    }

    static async deleteSubscription(req, res, next) {
        try {
            const { internalOpsService } = req.app.get('services');
            const { subId } = req.params;
            const result = await internalOpsService.deleteSubscription(subId);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    }
}

module.exports = InternalOpsController;