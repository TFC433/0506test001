/**
 * data/internal-ops-reader.js
 * 內部運營與進度追蹤 Reader
 * @version 1.0.1
 * @date 2026-04-20
 * @changelog
 * - [1.0.1] Fixed constructor to use config.IDS.INTERNAL_OPS to align with repo pattern
 * - [1.0.1] Added field mapping constants for array indexing stability
 * @description 繼承 BaseReader，負責讀取內部運營資料並建立快取
 */

const BaseReader = require('./base-reader');
const config = require('../config');

const TEAM_WORKLOAD_FIELDS = {
    WORK_ID: 0, MEMBER_CODE: 1, MEMBER_NAME: 2, TEAM: 3, TASK_TITLE: 4,
    TASK_TYPE: 5, RELATED_OPP: 6, PRIORITY: 7, STATUS: 8, PROGRESS: 9,
    START_DATE: 10, DUE_DATE: 11, NOTES: 12, UPDATE_TIME: 13, IS_ACTIVE: 14, SORT_ORDER: 15
};

const DEV_PROJECTS_FIELDS = {
    DEV_ID: 0, PRODUCT_CODE: 1, PRODUCT_NAME: 2, PROJECT_NAME: 3, FEATURE_NAME: 4,
    ASSIGNEE_CODE: 5, ASSIGNEE_NAME: 6, COLLABORATORS: 7, DEV_STAGE: 8, STATUS: 9,
    PROGRESS: 10, PRIORITY: 11, START_DATE: 12, EST_COMPLETION_DATE: 13,
    ACTUAL_COMPLETION_DATE: 14, DEPENDENCIES: 15, NOTES: 16, UPDATE_TIME: 17,
    IS_ACTIVE: 18, SORT_ORDER: 19
};

const SUBSCRIPTION_OPS_FIELDS = {
    SUB_ID: 0, CUSTOMER_NAME: 1, COMPANY_NAME: 2, PRODUCT_NAME: 3, PLAN_NAME: 4,
    ASSIGNEE_CODE: 5, ASSIGNEE_NAME: 6, SUB_STATUS: 7, START_DATE: 8, RENEWAL_DATE: 9,
    NEXT_ACTION_DATE: 10, MSG_STAGE: 11, MSG_STATUS: 12, EMAIL_STATUS: 13,
    LAST_CONTACT_DATE: 14, NEXT_ACTION_NOTES: 15, INTERNAL_NOTES: 16, UPDATE_TIME: 17,
    IS_ACTIVE: 18, SORT_ORDER: 19
};

class InternalOpsReader extends BaseReader {
    constructor(sheets, spreadsheetId) {
        super(sheets, config.IDS.INTERNAL_OPS || spreadsheetId);
    }

    async getTeamWorkloads() {
        return this._fetchAndCache(
            'teamWorkload',
            `${this.config.SHEETS.TEAM_WORKLOAD}!A:P`,
            (row, index) => {
                return {
                    rowIndex: index + 2,
                    workId: row[TEAM_WORKLOAD_FIELDS.WORK_ID] || '',
                    memberCode: row[TEAM_WORKLOAD_FIELDS.MEMBER_CODE] || '',
                    memberName: row[TEAM_WORKLOAD_FIELDS.MEMBER_NAME] || '',
                    team: row[TEAM_WORKLOAD_FIELDS.TEAM] || '',
                    taskTitle: row[TEAM_WORKLOAD_FIELDS.TASK_TITLE] || '',
                    taskType: row[TEAM_WORKLOAD_FIELDS.TASK_TYPE] || '',
                    relatedOpp: row[TEAM_WORKLOAD_FIELDS.RELATED_OPP] || '',
                    priority: row[TEAM_WORKLOAD_FIELDS.PRIORITY] || '',
                    status: row[TEAM_WORKLOAD_FIELDS.STATUS] || '',
                    progress: row[TEAM_WORKLOAD_FIELDS.PROGRESS] || '',
                    startDate: row[TEAM_WORKLOAD_FIELDS.START_DATE] || '',
                    dueDate: row[TEAM_WORKLOAD_FIELDS.DUE_DATE] || '',
                    notes: row[TEAM_WORKLOAD_FIELDS.NOTES] || '',
                    updateTime: row[TEAM_WORKLOAD_FIELDS.UPDATE_TIME] || '',
                    isActive: (row[TEAM_WORKLOAD_FIELDS.IS_ACTIVE] || 'TRUE').toUpperCase() === 'TRUE',
                    sortOrder: parseInt(row[TEAM_WORKLOAD_FIELDS.SORT_ORDER], 10) || 999
                };
            }
        );
    }

    async getDevProjects() {
        return this._fetchAndCache(
            'devProjects',
            `${this.config.SHEETS.DEV_PROJECTS}!A:T`,
            (row, index) => {
                return {
                    rowIndex: index + 2,
                    devId: row[DEV_PROJECTS_FIELDS.DEV_ID] || '',
                    productCode: row[DEV_PROJECTS_FIELDS.PRODUCT_CODE] || '',
                    productName: row[DEV_PROJECTS_FIELDS.PRODUCT_NAME] || '',
                    projectName: row[DEV_PROJECTS_FIELDS.PROJECT_NAME] || '',
                    featureName: row[DEV_PROJECTS_FIELDS.FEATURE_NAME] || '',
                    assigneeCode: row[DEV_PROJECTS_FIELDS.ASSIGNEE_CODE] || '',
                    assigneeName: row[DEV_PROJECTS_FIELDS.ASSIGNEE_NAME] || '',
                    collaborators: row[DEV_PROJECTS_FIELDS.COLLABORATORS] || '',
                    devStage: row[DEV_PROJECTS_FIELDS.DEV_STAGE] || '',
                    status: row[DEV_PROJECTS_FIELDS.STATUS] || '',
                    progress: row[DEV_PROJECTS_FIELDS.PROGRESS] || '',
                    priority: row[DEV_PROJECTS_FIELDS.PRIORITY] || '',
                    startDate: row[DEV_PROJECTS_FIELDS.START_DATE] || '',
                    estCompletionDate: row[DEV_PROJECTS_FIELDS.EST_COMPLETION_DATE] || '',
                    actualCompletionDate: row[DEV_PROJECTS_FIELDS.ACTUAL_COMPLETION_DATE] || '',
                    dependencies: row[DEV_PROJECTS_FIELDS.DEPENDENCIES] || '',
                    notes: row[DEV_PROJECTS_FIELDS.NOTES] || '',
                    updateTime: row[DEV_PROJECTS_FIELDS.UPDATE_TIME] || '',
                    isActive: (row[DEV_PROJECTS_FIELDS.IS_ACTIVE] || 'TRUE').toUpperCase() === 'TRUE',
                    sortOrder: parseInt(row[DEV_PROJECTS_FIELDS.SORT_ORDER], 10) || 999
                };
            }
        );
    }

    async getSubscriptions() {
        return this._fetchAndCache(
            'subscriptionOps',
            `${this.config.SHEETS.SUBSCRIPTION_OPS}!A:T`,
            (row, index) => {
                return {
                    rowIndex: index + 2,
                    subId: row[SUBSCRIPTION_OPS_FIELDS.SUB_ID] || '',
                    customerName: row[SUBSCRIPTION_OPS_FIELDS.CUSTOMER_NAME] || '',
                    companyName: row[SUBSCRIPTION_OPS_FIELDS.COMPANY_NAME] || '',
                    productName: row[SUBSCRIPTION_OPS_FIELDS.PRODUCT_NAME] || '',
                    planName: row[SUBSCRIPTION_OPS_FIELDS.PLAN_NAME] || '',
                    assigneeCode: row[SUBSCRIPTION_OPS_FIELDS.ASSIGNEE_CODE] || '',
                    assigneeName: row[SUBSCRIPTION_OPS_FIELDS.ASSIGNEE_NAME] || '',
                    subStatus: row[SUBSCRIPTION_OPS_FIELDS.SUB_STATUS] || '',
                    startDate: row[SUBSCRIPTION_OPS_FIELDS.START_DATE] || '',
                    renewalDate: row[SUBSCRIPTION_OPS_FIELDS.RENEWAL_DATE] || '',
                    nextActionDate: row[SUBSCRIPTION_OPS_FIELDS.NEXT_ACTION_DATE] || '',
                    msgStage: row[SUBSCRIPTION_OPS_FIELDS.MSG_STAGE] || '',
                    msgStatus: row[SUBSCRIPTION_OPS_FIELDS.MSG_STATUS] || '',
                    emailStatus: row[SUBSCRIPTION_OPS_FIELDS.EMAIL_STATUS] || '',
                    lastContactDate: row[SUBSCRIPTION_OPS_FIELDS.LAST_CONTACT_DATE] || '',
                    nextActionNotes: row[SUBSCRIPTION_OPS_FIELDS.NEXT_ACTION_NOTES] || '',
                    internalNotes: row[SUBSCRIPTION_OPS_FIELDS.INTERNAL_NOTES] || '',
                    updateTime: row[SUBSCRIPTION_OPS_FIELDS.UPDATE_TIME] || '',
                    isActive: (row[SUBSCRIPTION_OPS_FIELDS.IS_ACTIVE] || 'TRUE').toUpperCase() === 'TRUE',
                    sortOrder: parseInt(row[SUBSCRIPTION_OPS_FIELDS.SORT_ORDER], 10) || 999
                };
            }
        );
    }
}

module.exports = InternalOpsReader;