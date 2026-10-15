# Codex Goal Viewer

一个 Windows-first 的本地 Codex Goal 进度卡片。它只显示三项信息：

- Goal 完成百分比
- Token 消耗数
- 粗略预计剩余时间

卡片底部可点击收起/展开。收起后仍保留一行摘要，不显示步骤列表、命令日志、模型推理或“正在计算”信息。

## 当前边界

本项目读取 Codex App Server 风格的 Goal、Plan、Token 事件，并把它们转换为本地可读状态。它不生成或修改 Goal 计划，也不依赖 Codex 私有 DOM/CDP 注入。

公开 Codex 接口没有通用的“自动插入原生右侧栏”入口，因此 MVP 会打印一个 localhost URL。将这个 URL 在 Codex 的右侧 Browser 面板打开即可使用；如果后续公开接口提供自动打开能力，可以在启动适配层增加，而无需修改进度模型或面板。

## 安装与启动

需要 Node.js 22 或更高版本。

```powershell
git clone https://github.com/GuMu599/-codex-goal-viewer.git
cd -LiteralPath .\-codex-goal-viewer
node src\cli.js --thread <当前线程ID>
```

要让程序直接连接 Codex App Server 并接收同一连接上的实时通知，加上 `--app-server`：

```powershell
node src\cli.js --thread <当前线程ID> --app-server
```

这会启动 `codex app-server --stdio`，完成公开 JSON-RPC 初始化，并请求该 App Server 会话可见的线程 Goal；随后将收到的 Goal、Plan、Token 通知归并到本地面板。若使用自定义 Codex 可执行文件，可传 `--codex-bin <绝对路径>`。

重要限制：当前公开接口没有保证“独立启动的 App Server 自动共享 Codex Desktop 已打开对话”的能力。本项目在本机 Codex Desktop 0.160.0 上验证了 stdio 初始化，但独立进程无法自动读取 Desktop 内存中的当前 Goal。因此，若 `/api/state` 仍显示“未连接”，需要由宿主适配器将当前会话事件转发到 `/api/events`；这不是面板计算错误，也不能通过读取私有 DOM 或猜测文本来可靠修复。

也可以双击或在 PowerShell 中运行：

```powershell
.\scripts\start-goal-progress.cmd --thread <当前线程ID>
```

启动后复制终端打印的 `http://127.0.0.1:<port>/` 地址，在 Codex 右侧 Browser 面板中打开。

数据默认保存在 `%USERPROFILE%\.codex-goal-viewer\<threadId>`。可以用 `--data-dir` 指定其他本地目录，用 `--port` 指定端口；不指定端口时系统会选择可用端口。

## 事件适配器

MVP 的本地服务接收 App Server 风格事件：

```powershell
$base = 'http://127.0.0.1:<port>'

$goal = @{
  method = 'thread/goal/updated'
  params = @{
    threadId = 'thread-1'
    goal = @{
      status = 'active'
      tokensUsed = 126400
      timeUsedSeconds = 1080
      updatedAt = 1
    }
  }
} | ConvertTo-Json -Depth 8

$plan = @{
  method = 'turn/plan/updated'
  params = @{
    threadId = 'thread-1'
    turnId = 'turn-1'
    plan = @(
      @{ status = 'completed'; step = 'one' },
      @{ status = 'pending'; step = 'two' }
    )
  }
} | ConvertTo-Json -Depth 8

Invoke-RestMethod "$base/api/events" -Method Post -ContentType 'application/json' -Body $goal
Invoke-RestMethod "$base/api/events" -Method Post -ContentType 'application/json' -Body $plan
```

实际 App Server 连接适配器应将 `thread/goal/updated`、`turn/plan/updated`、`thread/tokenUsage/updated` 通知原样转发到 `/api/events`，并只转发当前线程。服务会忽略其他线程和过期的同类事件。

## 进度与 ETA

```text
完成率 = completed 步骤数 / 结构化步骤总数
预计剩余 ≈ 已用时间 × (1 - 完成率) / 完成率
```

展示的时间范围是中心估计的 75%–125%，仅用于方向性判断，不是承诺。

- 没有结构化 Plan 或完成率为 0%：显示“暂无估算”
- Goal 完成：显示“已完成”
- Goal 阻塞、用量受限或预算受限：显示“等待处理”
- Goal 的 `tokensUsed` 优先于线程总 Token；二者都没有时显示“暂无数据”

Token 只展示，不参与完成百分比或 ETA 计算。

## 本地验证

```powershell
npm test
npm run check
git diff --check
```

完整回放也可以直接运行：

```powershell
$job = Start-Process node -ArgumentList 'src/cli.js','--thread','smoke','--port','0','--data-dir',"$PWD\.tmp-smoke" -PassThru -RedirectStandardOutput .tmp-smoke.log
Start-Sleep -Milliseconds 400
$line = Get-Content .tmp-smoke.log | Select-Object -First 1
$base = ($line -replace '^.*(http://127\.0\.0\.1:[0-9]+).*$', '$1')
# 按上面的事件格式 POST Goal、Plan，再 GET $base/api/state；最后 Stop-Process $job.Id
```

运行时日志和状态不应包含凭据、访问令牌、消息正文或模型推理。

