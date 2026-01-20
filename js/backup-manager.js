/**
 * Backup Manager - 自动备份管理系统
 * 支持本地/NAS、阿里云OSS、百度云备份
 */
class BackupManager {
    constructor() {
        this.API_BASE = '';
    }

    // 获取备份配置
    async getBackupConfigs() {
        try {
            const response = await fetch(`${this.API_BASE}/api/backup/configs`, {
                credentials: 'include'
            });
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('[BackupManager] Get backup configs error:', error);
            return { success: false, error: error.message };
        }
    }

    // 保存备份配置
    async saveBackupConfig(config) {
        try {
            const response = await fetch(`${this.API_BASE}/api/backup/configs`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(config)
            });
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('[BackupManager] Save backup config error:', error);
            return { success: false, error: error.message };
        }
    }

    // 更新备份配置
    async updateBackupConfig(configId, config) {
        try {
            const response = await fetch(`${this.API_BASE}/api/backup/configs/${configId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(config)
            });
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('[BackupManager] Update backup config error:', error);
            return { success: false, error: error.message };
        }
    }

    // 删除备份配置
    async deleteBackupConfig(configId) {
        try {
            const response = await fetch(`${this.API_BASE}/api/backup/configs/${configId}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('[BackupManager] Delete backup config error:', error);
            return { success: false, error: error.message };
        }
    }

    // 执行手动备份
    async runBackup(configId) {
        try {
            const response = await fetch(`${this.API_BASE}/api/backup/run/${configId}`, {
                method: 'POST',
                credentials: 'include'
            });
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('[BackupManager] Run backup error:', error);
            return { success: false, error: error.message };
        }
    }

    // 获取备份历史
    async getBackupHistory(limit = 50) {
        try {
            const response = await fetch(`${this.API_BASE}/api/backup/history?limit=${limit}`, {
                credentials: 'include'
            });
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('[BackupManager] Get backup history error:', error);
            return { success: false, error: error.message };
        }
    }

    // 恢复备份
    async restoreBackup(backupId) {
        try {
            const response = await fetch(`${this.API_BASE}/api/backup/restore/${backupId}`, {
                method: 'POST',
                credentials: 'include'
            });
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('[BackupManager] Restore backup error:', error);
            return { success: false, error: error.message };
        }
    }
}

const backupManager = new BackupManager();
window.backupManager = backupManager;
