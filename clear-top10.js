/**
 * 清除所有用户的Top10数据脚本
 * 使用方法: node clear-top10.js
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'data', 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('无法连接数据库:', err);
        process.exit(1);
    }
    
    console.log('已连接到数据库');
    console.log('开始清除所有用户的Top10数据...\n');
    
    // 删除所有用户的click_stats数据
    db.run("DELETE FROM user_data WHERE key = 'click_stats'", function(err) {
        if (err) {
            if (err.message && err.message.includes('no such table')) {
                console.log('⚠ user_data表不存在，跳过');
            } else {
                console.error('删除user_data表中的click_stats失败:', err);
                db.close();
                process.exit(1);
                return;
            }
        } else {
            console.log(`✓ 已清除user_data表中 ${this.changes} 条click_stats数据`);
        }
        
        // 同时清除旧数据（app_data表中的click_stats，向后兼容）
        db.run("DELETE FROM app_data WHERE key = 'click_stats'", function(err) {
            if (err) {
                if (err.message && err.message.includes('no such table')) {
                    console.log('⚠ app_data表不存在，跳过');
                } else {
                    console.error('删除app_data表中的click_stats失败:', err);
                }
            } else {
                console.log(`✓ 已清除app_data表中 ${this.changes} 条click_stats数据`);
            }
            
            console.log('\n✅ 所有用户的Top10数据已清除完成！');
            db.close((err) => {
                if (err) {
                    console.error('关闭数据库连接失败:', err);
                } else {
                    console.log('数据库连接已关闭');
                }
                process.exit(0);
            });
        });
    });
});
