/**
 * routes/internal-ops.routes.js
 * 內部運營與進度追蹤 Routes
 * @version 1.0.0
 * @date 2026-04-20
 */

const express = require('express');
const router = express.Router();
const InternalOpsController = require('../controllers/internal-ops.controller');

// 團隊成員負荷
router.get('/team-workload', InternalOpsController.getTeamWorkloads);
router.post('/team-workload', InternalOpsController.createTeamWorkload);
router.put('/team-workload/:workId', InternalOpsController.updateTeamWorkload);
router.delete('/team-workload/:workId', InternalOpsController.deleteTeamWorkload);

// 開發案件追蹤
router.get('/dev-projects', InternalOpsController.getDevProjects);
router.post('/dev-projects', InternalOpsController.createDevProject);
router.put('/dev-projects/:devId', InternalOpsController.updateDevProject);
router.delete('/dev-projects/:devId', InternalOpsController.deleteDevProject);

// 訂閱制管理
router.get('/subscription-ops', InternalOpsController.getSubscriptions);
router.post('/subscription-ops', InternalOpsController.createSubscription);
router.put('/subscription-ops/:subId', InternalOpsController.updateSubscription);
router.delete('/subscription-ops/:subId', InternalOpsController.deleteSubscription);

module.exports = router;