// 调试脚本：检查数据库中的用户
const db = require('./database');

async function checkUsers() {
    try {
        console.log('=== 检查数据库用户 ===');
        
        // 检查 users 表是否存在
        const users = await db.all("SELECT id, username, role, created_at FROM users");
        
        if (users.length === 0) {
            console.log('❌ users 表为空，没有用户！');
            console.log('提示：系统应该在首次启动时自动创建 admin 用户');
        } else {
            console.log(`✅ 找到 ${users.length} 个用户：`);
            users.forEach(user => {
                console.log(`  - ID: ${user.id}, 用户名: ${user.username}, 角色: ${user.role}, 创建时间: ${user.created_at}`);
            });
        }
        
        // 检查 admin 用户
        const admin = await db.get("SELECT id, username, password_hash, role FROM users WHERE username = ?", ['admin']);
        if (admin) {
            console.log('\n✅ admin 用户存在');
            console.log(`  - ID: ${admin.id}`);
            console.log(`  - 用户名: ${admin.username}`);
            console.log(`  - 角色: ${admin.role}`);
            console.log(`  - 密码哈希: ${admin.password_hash.substring(0, 20)}...`);
        } else {
            console.log('\n❌ admin 用户不存在！');
        }
        
        process.exit(0);
    } catch (err) {
        console.error('❌ 错误:', err);
        process.exit(1);
    }
}

checkUsers();
