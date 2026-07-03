# Google Sheets 工具集

Google Sheets 工具集用于在 FastGPT 工作流中调用 Google Sheets API，支持读取、写入和追加单元格数据。

## 功能

这是一个 `tool-suite`，包含三个子工具：

| 子工具 ID | 说明 |
| --- | --- |
| `readValues` | 读取指定 A1 notation 范围内的单元格数据 |
| `writeValues` | 写入/覆盖指定 A1 notation 范围内的单元格数据 |
| `appendValues` | 向指定 A1 notation 范围追加行或列数据 |

## 准备工作

1. 在 Google Cloud 项目中启用 Google Sheets API。
2. 创建 Service Account，并下载 JSON key。
3. 将目标 Google Sheets 表格共享给 Service Account JSON 中的 `client_email`。
4. 在 FastGPT 插件密钥配置中填写完整的 `serviceAccountJson`。

> 不要把 `serviceAccountJson` 写入源码、README、测试样例或 Git。调试时请使用本地忽略文件，例如 `.secrets.local.json`。

Google Sheets API 文档参考：https://developers.google.com/sheets/api/guides/concepts

## 密钥配置

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `serviceAccountJson` | string | 是 | Google Cloud Service Account JSON 字符串，包含 `client_email` 和 `private_key` |

## 子工具

### 读取单元格 `readValues`

调用 `GET /v4/spreadsheets/{spreadsheetId}/values/{range}` 读取 A1 notation 范围的数据。

输入参数：

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `spreadsheetId` | string | 是 | Google Sheets 表格 ID，可从 URL 的 `/d/{spreadsheetId}/` 获取 |
| `range` | string | 是 | A1 notation 范围，例如 `Sheet1!A1:D10` |
| `majorDimension` | `ROWS`/`COLUMNS` | 否 | 按行或按列返回 |
| `valueRenderOption` | `FORMATTED_VALUE`/`UNFORMATTED_VALUE`/`FORMULA` | 否 | 值渲染方式 |
| `dateTimeRenderOption` | `SERIAL_NUMBER`/`FORMATTED_STRING` | 否 | 日期时间渲染方式 |

输出示例：

```json
{
  "success": true,
  "range": "Sheet1!A1:B2",
  "majorDimension": "ROWS",
  "values": [
    ["Name", "Score"],
    ["Ada", 98]
  ],
  "rowCount": 2,
  "columnCount": 2
}
```

### 写入单元格 `writeValues`

调用 `PUT /v4/spreadsheets/{spreadsheetId}/values/{range}` 写入指定范围。

输入参数：

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `spreadsheetId` | string | 是 | Google Sheets 表格 ID |
| `range` | string | 是 | A1 notation 范围，例如 `Sheet1!A1:B2` |
| `values` | array/string | 是 | 非空二维数组或 JSON 字符串，例如 `[["Name","Score"],["Ada",98]]` |
| `majorDimension` | `ROWS`/`COLUMNS` | 否 | 默认 `ROWS` |
| `valueInputOption` | `USER_ENTERED`/`RAW` | 否 | 默认 `USER_ENTERED` |

输出示例：

```json
{
  "success": true,
  "spreadsheetId": "1abc...",
  "updatedRange": "Sheet1!A1:B2",
  "updatedRows": 2,
  "updatedColumns": 2,
  "updatedCells": 4
}
```

### 追加单元格 `appendValues`

调用 `POST /v4/spreadsheets/{spreadsheetId}/values/{range}:append` 向表格追加行或列。

输入参数：

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `spreadsheetId` | string | 是 | Google Sheets 表格 ID |
| `range` | string | 是 | 用于定位表格区域的 A1 notation 范围，例如 `Sheet1!A:D` |
| `values` | array/string | 是 | 非空二维数组或 JSON 字符串 |
| `majorDimension` | `ROWS`/`COLUMNS` | 否 | 默认 `ROWS` |
| `valueInputOption` | `USER_ENTERED`/`RAW` | 否 | 默认 `USER_ENTERED` |
| `insertDataOption` | `INSERT_ROWS`/`OVERWRITE` | 否 | 默认 `INSERT_ROWS` |

输出示例：

```json
{
  "success": true,
  "spreadsheetId": "1abc...",
  "tableRange": "Sheet1!A1:B10",
  "updatedRange": "Sheet1!A11:B11",
  "updatedRows": 1,
  "updatedColumns": 2,
  "updatedCells": 2
}
```

## 本地开发

```bash
pnpm install --ignore-workspace
pnpm test
pnpm run type-check
pnpm build
pnpm check
pnpm pack
```

说明：

- 本仓库作为社区插件 registry 使用，插件目录需要能独立安装和构建。
- 本工具只操作 Google Sheets values API，不包含新建表格、格式设置、工作表管理等能力。
- API 调用失败时会抛出包含 Google API 状态码和错误摘要的异常，但不会输出 service account 私钥。
