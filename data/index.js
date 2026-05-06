// data/index.js

// 讀取器 (Readers)
const OpportunityReader = require('./opportunity-reader');
const ContactReader = require('./contact-reader');
const CompanyReader = require('./company-reader');
const InteractionReader = require('./interaction-reader');
const EventLogReader = require('./event-log-reader');
const SystemReader = require('./system-reader');
const WeeklyBusinessReader = require('./weekly-business-reader');
const AnnouncementReader = require('./announcement-reader');

// 寫入器 (Writers)
const CompanyWriter = require('./company-writer');
const ContactWriter = require('./contact-writer');
const OpportunityWriter = require('./opportunity-writer');
const InteractionWriter = require('./interaction-writer');
const EventLogWriter = require('./event-log-writer');
const WeeklyBusinessWriter = require('./weekly-business-writer');
const AnnouncementWriter = require('./announcement-writer');

// ★★★ 1. 新增這行引入 ★★★
const SystemWriter = require('./system-writer'); 

module.exports = {
    OpportunityReader,
    ContactReader,
    CompanyReader,
    InteractionReader,
    EventLogReader,
    SystemReader,
    WeeklyBusinessReader,
    AnnouncementReader,
    
    CompanyWriter,
    ContactWriter,
    OpportunityWriter,
    InteractionWriter,
    EventLogWriter,
    WeeklyBusinessWriter,
    AnnouncementWriter,

    // ★★★ 2. 記得加到這裡匯出 ★★★
    SystemWriter 
};