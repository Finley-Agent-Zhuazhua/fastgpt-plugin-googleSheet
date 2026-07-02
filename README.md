# Google Sheets 工具集

Google Sheets 工具集用于在 FastGPT 工作流中调用 Google Sheets API，支持读取、写入和追加单元格数据。

## 准备工作

1. 在 Google Cloud 项目中启用 Google Sheets API。
2. 创建 Service Account，并下载 JSON key。
3. 将目标 Google Sheets 表格共享给 Service Account JSON 中的 `client_email`。
4. 在 FastGPT 工具密钥配置中填写完整的 `serviceAccountJson`。

Google Sheets API 文档参考：https://developers.google.com/sheets/api/guides/concepts

## 子工具

### 读取单元格 readValues

调用 `GET /v4/spreadsheets/{spreadsheetId}/values/{range}` 读取 A1 notation 范围的数据。

输入参数：

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| spreadsheetId | string | 是 | Google Sheets 表格 ID，可从 URL 的 `/d/{spreadsheetId}/` 获取 |
| range | string | 是 | A1 notation 范围，例如 `Sheet1!A1:D10` |
| majorDimension | string | 否 | `ROWS` 或 `COLUMNS`，默认由 Google Sheets API 决定 |
| valueRenderOption | string | 否 | `FORMATTED_VALUE`、`UNFORMATTED_VALUE` 或 `FORMULA` |
| dateTimeRenderOption | string | 否 | `SERIAL_NUMBER` 或 `FORMATTED_STRING` |

输出：

```json
{
  "range": "Sheet1!A1:B2",
  "majorDimension": "ROWS",
  "values": [
    ["Name", "Score"],
    ["Ada", 98]
  ],
  "success": true
}
```

### 写入单元格 writeValues

调用 `PUT /v4/spreadsheets/{spreadsheetId}/values/{range}` 写入指定范围。

输入参数：

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| spreadsheetId | string | 是 | Google Sheets 表格 ID |
| range | string | 是 | A1 notation 范围，例如 `Sheet1!A1:B2` |
| values | array/string | 是 | 二维数组或 JSON 字符串，例如 `[[\"Name\",\"Score\"],[\"Ada\",98]]` |
| majorDimension | string | 否 | `ROWS` 或 `COLUMNS`，默认 `ROWS` |
| valueInputOption | string | 否 | `USER_ENTERED` 或 `RAW`，默认 `USER_ENTERED` |

输出：

```json
{
  "spreadsheetId": "1abc...",
  "updatedRange": "Sheet1!A1:B2",
  "updatedRows": 2,
  "updatedColumns": 2,
  "updatedCells": 4,
  "success": true
}
```

### 追加单元格 appendValues

调用 `POST /v4/spreadsheets/{spreadsheetId}/values/{range}:append` 向表格追加行或列。

输入参数：

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| spreadsheetId | string | 是 | Google Sheets 表格 ID |
| range | string | 是 | 用于定位表格区域的 A1 notation 范围，例如 `Sheet1!A:D` |
| values | array/string | 是 | 二维数组或 JSON 字符串 |
| majorDimension | string | 否 | `ROWS` 或 `COLUMNS`，默认 `ROWS` |
| valueInputOption | string | 否 | `USER_ENTERED` 或 `RAW`，默认 `USER_ENTERED` |
| insertDataOption | string | 否 | `INSERT_ROWS` 或 `OVERWRITE`，默认 `INSERT_ROWS` |

输出：

```json
{
  "spreadsheetId": "1abc...",
  "tableRange": "Sheet1!A1:B10",
  "updatedRange": "Sheet1!A11:B11",
  "updatedRows": 1,
  "updatedColumns": 2,
  "updatedCells": 2,
  "success": true
}
```

## 说明

- `values` 必须是二维数组，单元格值支持 string、number、boolean 和 null。
- `USER_ENTERED` 会让 Google Sheets 按用户输入解析公式、日期和数字；`RAW` 按原始值写入。
- 服务账号只能访问已共享给 `client_email` 的表格。
- 当前版本聚焦单元格 values API，不包含新建表格、格式设置和工作表管理。
