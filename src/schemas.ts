import type {
  InputSchemaMetaType,
  OutputSchemaMetaType,
  SecretSchemaMetaType,
} from "@fastgpt-plugin/sdk-factory";
import z from "zod";

export const googleSheetsCellValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
]);

export const googleSheetsValuesSchema = z
  .array(z.array(googleSheetsCellValueSchema).min(1))
  .min(1);

export const serviceAccountSecretSchema = z.object({
  serviceAccountJson: z.string().min(1).meta({
    title: "Service Account JSON",
    description:
      "Google Cloud 服务账号 JSON。需启用 Google Sheets API，并将目标表格共享给 service account 的 client_email。",
    isSecret: true,
  } satisfies SecretSchemaMetaType),
});

const spreadsheetIdSchema = z.string().min(1).meta({
  title: "Spreadsheet ID",
  description: "Google Sheets 表格 ID，可从表格 URL 的 /d/{spreadsheetId}/ 中获取。",
  toolDescription:
    "Google Sheets spreadsheet ID from the /d/{spreadsheetId}/ segment in the spreadsheet URL.",
} satisfies InputSchemaMetaType);

const rangeSchema = z.string().min(1).meta({
  title: "A1 范围",
  description: "A1 notation 范围，例如 Sheet1!A1:D10。",
  toolDescription:
    "A1 notation range, for example Sheet1!A1:D10. Include the sheet name when needed.",
} satisfies InputSchemaMetaType);

const majorDimensionSchema = z.enum(["ROWS", "COLUMNS"]).optional().nullable().meta({
  title: "主维度",
  description: "按行或按列组织数据。默认 ROWS。",
  toolDescription: "How values are organized. Use ROWS by default or COLUMNS.",
} satisfies InputSchemaMetaType);

const valueInputOptionSchema = z
  .enum(["RAW", "USER_ENTERED"])
  .optional()
  .nullable()
  .meta({
    title: "写入模式",
    description:
      "RAW 按原始值写入；USER_ENTERED 按用户输入解析公式、日期和数字。默认 USER_ENTERED。",
    toolDescription:
      "RAW writes literal values. USER_ENTERED lets Google Sheets parse formulas, dates, and numbers. Default is USER_ENTERED.",
  } satisfies InputSchemaMetaType);

const valuesInputSchema = z
  .union([googleSheetsValuesSchema, z.string().min(2)])
  .meta({
    title: "单元格数据",
    description: "二维数组或 JSON 字符串，例如 [[\"Name\",\"Score\"],[\"Ada\",98]]。",
    toolDescription:
      'Two-dimensional cell values array or JSON string, for example [["Name","Score"],["Ada",98]]. Cell values can be string, number, boolean, or null.',
  } satisfies InputSchemaMetaType);

const updateCountSchema = z.number().int().nonnegative();

export const readValuesInputSchema = z.object({
  spreadsheetId: spreadsheetIdSchema,
  range: rangeSchema,
  majorDimension: majorDimensionSchema,
  valueRenderOption: z
    .enum(["FORMATTED_VALUE", "UNFORMATTED_VALUE", "FORMULA"])
    .optional()
    .nullable()
    .meta({
      title: "值渲染方式",
      description:
        "FORMATTED_VALUE 返回格式化值；UNFORMATTED_VALUE 返回原始值；FORMULA 返回公式。",
      toolDescription:
        "How values should be rendered. FORMATTED_VALUE returns formatted values, UNFORMATTED_VALUE returns raw values, FORMULA returns formulas.",
    } satisfies InputSchemaMetaType),
  dateTimeRenderOption: z
    .enum(["SERIAL_NUMBER", "FORMATTED_STRING"])
    .optional()
    .nullable()
    .meta({
      title: "日期时间渲染方式",
      description: "SERIAL_NUMBER 返回序列号；FORMATTED_STRING 返回格式化字符串。",
      toolDescription:
        "How dates and times should be rendered: SERIAL_NUMBER or FORMATTED_STRING.",
    } satisfies InputSchemaMetaType),
});

export const readValuesOutputSchema = z.object({
  success: z.literal(true).meta({
    title: "是否成功",
  } satisfies OutputSchemaMetaType),
  range: z.string().optional().meta({
    title: "返回范围",
  } satisfies OutputSchemaMetaType),
  majorDimension: z.enum(["ROWS", "COLUMNS"]).optional().meta({
    title: "主维度",
  } satisfies OutputSchemaMetaType),
  values: z.array(z.array(googleSheetsCellValueSchema)).meta({
    title: "单元格数据",
  } satisfies OutputSchemaMetaType),
  rowCount: updateCountSchema.meta({
    title: "行数",
  } satisfies OutputSchemaMetaType),
  columnCount: updateCountSchema.meta({
    title: "列数",
  } satisfies OutputSchemaMetaType),
});

export const writeValuesInputSchema = z.object({
  spreadsheetId: spreadsheetIdSchema,
  range: rangeSchema,
  values: valuesInputSchema,
  majorDimension: majorDimensionSchema,
  valueInputOption: valueInputOptionSchema,
});

export const writeValuesOutputSchema = z.object({
  success: z.literal(true).meta({
    title: "是否成功",
  } satisfies OutputSchemaMetaType),
  spreadsheetId: z.string().optional().meta({
    title: "Spreadsheet ID",
  } satisfies OutputSchemaMetaType),
  updatedRange: z.string().optional().meta({
    title: "写入范围",
  } satisfies OutputSchemaMetaType),
  updatedRows: updateCountSchema.optional().meta({
    title: "写入行数",
  } satisfies OutputSchemaMetaType),
  updatedColumns: updateCountSchema.optional().meta({
    title: "写入列数",
  } satisfies OutputSchemaMetaType),
  updatedCells: updateCountSchema.optional().meta({
    title: "写入单元格数",
  } satisfies OutputSchemaMetaType),
});

export const appendValuesInputSchema = z.object({
  spreadsheetId: spreadsheetIdSchema,
  range: rangeSchema,
  values: valuesInputSchema,
  majorDimension: majorDimensionSchema,
  valueInputOption: valueInputOptionSchema,
  insertDataOption: z.enum(["INSERT_ROWS", "OVERWRITE"]).optional().nullable().meta({
    title: "追加方式",
    description: "INSERT_ROWS 插入新行；OVERWRITE 覆盖可写入区域。默认 INSERT_ROWS。",
    toolDescription:
      "How appended data is inserted. INSERT_ROWS inserts new rows, OVERWRITE writes into the available area. Default is INSERT_ROWS.",
  } satisfies InputSchemaMetaType),
});

export const appendValuesOutputSchema = z.object({
  success: z.literal(true).meta({
    title: "是否成功",
  } satisfies OutputSchemaMetaType),
  spreadsheetId: z.string().optional().meta({
    title: "Spreadsheet ID",
  } satisfies OutputSchemaMetaType),
  tableRange: z.string().optional().meta({
    title: "追加前表格范围",
  } satisfies OutputSchemaMetaType),
  updatedRange: z.string().optional().meta({
    title: "追加写入范围",
  } satisfies OutputSchemaMetaType),
  updatedRows: updateCountSchema.optional().meta({
    title: "追加行数",
  } satisfies OutputSchemaMetaType),
  updatedColumns: updateCountSchema.optional().meta({
    title: "追加列数",
  } satisfies OutputSchemaMetaType),
  updatedCells: updateCountSchema.optional().meta({
    title: "追加单元格数",
  } satisfies OutputSchemaMetaType),
});

export type ServiceAccountSecrets = z.output<typeof serviceAccountSecretSchema>;
export type ReadValuesInput = z.output<typeof readValuesInputSchema>;
export type ReadValuesOutput = z.output<typeof readValuesOutputSchema>;
export type WriteValuesInput = z.output<typeof writeValuesInputSchema>;
export type WriteValuesOutput = z.output<typeof writeValuesOutputSchema>;
export type AppendValuesInput = z.output<typeof appendValuesInputSchema>;
export type AppendValuesOutput = z.output<typeof appendValuesOutputSchema>;
