# 安全修复：删除 Release 中的数据库文件

## 问题说明

v1.0.0 release 的 source code zip 文件中可能包含了 `data/database.sqlite` 数据库文件，这是一个严重的安全问题。

## 解决步骤

### 1. 删除旧的 Release

在 GitHub 上执行以下操作：

1. 访问仓库的 Releases 页面：`https://github.com/qinxuedong/gods-bookmark/releases`
2. 找到 v1.0.0 release
3. 点击 "Edit release" 或 "Delete release"
4. **删除整个 release**（包括 source code zip）

### 2. 确保数据库文件已从 Git 跟踪中移除

在本地执行：

```bash
# 从 Git 索引中移除数据库文件（保留本地文件）
git rm --cached data/database.sqlite

# 提交更改
git commit -m "Remove database.sqlite from Git tracking"

# 推送到 GitHub
git push
```

### 3. 验证 .gitignore 规则

确认 `.gitignore` 文件包含：

```
data/database.sqlite
data/database.sqlite-journal
data/*.db
data/*.db-journal
```

### 4. 重新创建干净的 Release

在确保数据库文件已从仓库中移除后：

1. 创建新的 tag：
   ```bash
   git tag -d v1.0.0  # 删除本地 tag（如果存在）
   git tag v1.0.0
   git push origin :refs/tags/v1.0.0  # 删除远程 tag
   git push origin v1.0.0  # 推送新 tag
   ```

2. 在 GitHub 上创建新的 release：
   - 访问 Releases 页面
   - 点击 "Draft a new release"
   - 选择 tag v1.0.0
   - 填写 release notes
   - **重要**：在发布前，下载 source code zip 并验证其中不包含 `data/database.sqlite`

### 5. 如果数据库包含敏感信息

如果数据库中包含真实的用户数据或敏感信息：

1. **立即更改所有密码**（包括管理员密码）
2. **通知用户**（如果有其他用户）
3. **检查数据库内容**，评估泄露程度
4. **考虑重置数据库**（如果可能）

## 预防措施

### 创建 .gitattributes 文件（可选）

创建 `.gitattributes` 文件，明确标记数据库文件：

```
# 数据库文件不应被 Git 跟踪
data/*.sqlite -export-ignore
data/*.sqlite-journal -export-ignore
data/*.db -export-ignore
data/*.db-journal -export-ignore
```

### 使用 GitHub Actions 自动检查（推荐）

创建 `.github/workflows/release-check.yml`：

```yaml
name: Release Check

on:
  release:
    types: [created]

jobs:
  check-release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Check for database files
        run: |
          if find . -name "*.sqlite" -o -name "*.db" | grep -v node_modules; then
            echo "❌ ERROR: Database files found in release!"
            exit 1
          else
            echo "✅ No database files found"
          fi
```

## 验证清单

- [ ] 已删除包含数据库的旧 release
- [ ] 数据库文件已从 Git 跟踪中移除
- [ ] .gitignore 规则正确配置
- [ ] 新 release 的 source code zip 已验证不包含数据库
- [ ] 如果包含敏感信息，已采取相应安全措施

## 参考

- [GitHub: Removing sensitive data from a repository](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)
- [Git: git-rm documentation](https://git-scm.com/docs/git-rm)
