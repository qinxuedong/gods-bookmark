/**
 * 时间日期组件
 * 显示世界时间、日期（阴历）信息
 */

(function () {
    'use strict';

    // 阴历数据（简化版，实际应使用完整算法）
    const LUNAR_INFO = [
        0x04bd8, 0x04ae0, 0x0a570, 0x054d5, 0x0d260, 0x0d950, 0x16554, 0x056a0, 0x09ad0, 0x055d2,
        0x04ae0, 0x0a5b6, 0x0a4d0, 0x0d250, 0x1d255, 0x0b540, 0x0d6a0, 0x0ada2, 0x095b0, 0x14977,
        0x04970, 0x0a4b0, 0x0b4b5, 0x06a50, 0x06d40, 0x1ab54, 0x02b60, 0x09570, 0x052f2, 0x04970,
        0x06566, 0x0d4a0, 0x0ea50, 0x06e95, 0x05ad0, 0x02b60, 0x186e3, 0x092e0, 0x1c8d7, 0x0c950,
        0x0d4a0, 0x1d8a6, 0x0b550, 0x056a0, 0x1a5b4, 0x025d0, 0x092d0, 0x0d2b2, 0x0a950, 0x0b557
    ];

    const LUNAR_MONTH = ['正月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '冬月', '腊月'];
    const LUNAR_DAY = ['初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
        '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
        '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十'];
    const WEEKDAYS = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];

    let timeInterval = null;

    function init() {
        updateTime();
        timeInterval = setInterval(updateTime, 1000);
    }

    function updateTime() {
        const now = new Date();

        // 主时间
        const timeEl = document.getElementById('main-time');
        if (timeEl) {
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const seconds = String(now.getSeconds()).padStart(2, '0');
            timeEl.textContent = `${hours}:${minutes}:${seconds}`;
        }

        // 日期信息
        const dateEl = document.getElementById('date-info');
        if (dateEl) {
            const year = now.getFullYear();
            const month = now.getMonth() + 1;
            const day = now.getDate();
            const weekday = WEEKDAYS[now.getDay()];

            // 简化的阴历计算
            const lunar = getLunarDate(year, month, day);

            dateEl.textContent = `${year}年${month}月${day}日 ${weekday} | ${lunar.month}${lunar.day}`;
        }
    }

    // 简化的阴历计算（实际项目中应使用完整算法或库）
    function getLunarDate(year, month, day) {
        // 简化版本，返回近似值
        const baseDate = new Date(1900, 0, 31);
        const targetDate = new Date(year, month - 1, day);
        const offset = Math.floor((targetDate - baseDate) / 86400000);

        let lunarMonth = (month + 10) % 12;
        let lunarDay = ((day + 15) % 30);

        return {
            month: LUNAR_MONTH[lunarMonth],
            day: LUNAR_DAY[lunarDay]
        };
    }


    // DOM 加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
