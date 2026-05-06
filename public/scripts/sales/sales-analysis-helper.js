// public/scripts/sales/sales-analysis-helper.js
/**
 * @version 2.1.1
 * @date 2026-04-21
 * @changelog
 * - [2026-04-21] Phase 4 Fix: Restored legacy calculation methods strictly for safe fallback usage. These functions are dormant when backend SSOT is operating correctly.
 */

const SalesAnalysisHelper = {
    calculateOverview: function(deals) {
        let totalVal = 0, totalDays = 0, cycleCount = 0;
        deals.forEach(d => {
            totalVal += d.numericValue || 0;
            if (d.createdTime && d.wonDate) {
                const diff = Math.ceil(Math.abs(new Date(d.wonDate) - new Date(d.createdTime)) / 86400000);
                if (!isNaN(diff)) { totalDays += diff; cycleCount++; }
            }
        });
        return {
            totalWonValue: totalVal,
            totalWonDeals: deals.length,
            averageDealValue: deals.length ? totalVal / deals.length : 0,
            averageSalesCycleInDays: cycleCount ? Math.round(totalDays / cycleCount) : 0
        };
    },

    calculateKpis: function(deals) {
        const calcUnique = (keywords) => {
            const unique = new Set();
            deals.forEach(d => {
                const m = (d.salesModel || '').trim();
                if (keywords.some(kw => m.includes(kw)) && d.customerCompany) {
                    unique.add(d.customerCompany.trim());
                }
            });
            return unique.size;
        };
        return {
            direct: calcUnique(['直販', '直接販售']),
            si: calcUnique(['SI', '系統整合']),
            mtb: calcUnique(['MTB', '工具機'])
        };
    },

    calculateGroupStats: function(deals, fieldKey, valKey) {
        const stats = {};
        deals.forEach(deal => {
            const key = deal[fieldKey] || '未分類';
            if (!stats[key]) stats[key] = 0;
            stats[key] += deal.numericValue || 0;
        });
        return Object.entries(stats).map(([name, val]) => ({ name, y: val })).sort((a, b) => b.y - a.y);
    },

    calculateProductStats: function(deals) {
        const productCounts = {};
        deals.forEach(deal => {
            try {
                if (deal.potentialSpecification) {
                    const specs = JSON.parse(deal.potentialSpecification);
                    if (typeof specs === 'object') {
                        Object.entries(specs).forEach(([prodName, qty]) => {
                            const q = parseInt(qty) || 0;
                            if (q > 0) {
                                if (!productCounts[prodName]) productCounts[prodName] = 0;
                                productCounts[prodName] += q;
                            }
                        });
                    }
                }
            } catch (e) {
                if (typeof deal.potentialSpecification === 'string') {
                    const name = deal.potentialSpecification.trim();
                    if (name) {
                        productCounts[name] = (productCounts[name] || 0) + 1;
                    }
                }
            }
        });
        return Object.entries(productCounts).map(([name, count]) => ({ name, y: count })).sort((a, b) => b.y - a.y);
    },

    calculateChannelStats: function(deals) {
        const stats = {};
        deals.forEach(deal => {
            let channelName = deal.channelDetails || deal.salesChannel;
            if (!channelName || channelName === '無' || channelName === '-') {
                channelName = '直接販售'; 
            }
            if (!stats[channelName]) stats[channelName] = 0;
            stats[channelName] += deal.numericValue || 0;
        });
        return Object.entries(stats).map(([name, val]) => ({ name, y: val })).sort((a, b) => b.y - a.y);
    },

    generateCSV: function(deals) {
        if (!deals || !deals.length) return null;
        const headers = ['成交日期', '機會種類', '機會名稱', '終端客戶', '銷售模式', '主要通路', '目前階段', '價值', '負責業務'];
        const rows = deals.map(d => [
            d.wonDate ? new Date(d.wonDate).toLocaleDateString() : '-',
            d.opportunityType || '-', d.opportunityName || '(未命名)', d.customerCompany || '-', d.salesModel || '-',
            d.channelDetails || d.salesChannel || '-', d.currentStage || '-', d.numericValue || 0, d.assignee || '-'
        ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
        return '\ufeff' + headers.join(',') + '\n' + rows.join('\n');
    }
};