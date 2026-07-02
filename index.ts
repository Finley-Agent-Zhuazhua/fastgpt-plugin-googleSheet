import { createToolHandler, defineToolSet } from "@fastgpt-plugin/sdk-factory";
import z from "zod";
import {
  InputType as appendValuesInputType,
  OutputType as appendValuesOutputType,
  tool as appendValuesTool,
} from "./children/appendValues";
import {
  InputType as readValuesInputType,
  OutputType as readValuesOutputType,
  tool as readValuesTool,
} from "./children/readValues";
import {
  InputType as writeValuesInputType,
  OutputType as writeValuesOutputType,
  tool as writeValuesTool,
} from "./children/writeValues";

const secretSchema = z.object({
  serviceAccountJson: z.string().meta({
    title: "Service Account JSON",
    description:
      "Google Cloud 服务账号 JSON。需启用 Google Sheets API，并将目标表格共享给 service account 的 client_email。",
    toolDescription:
      "Google Cloud service account JSON. Enable Google Sheets API and share the target spreadsheet with the service account client_email.",
    isSecret: true,
  }),
});

const googleSheetInputSchema = {
  spreadsheetId: z.string().meta({
    title: "Spreadsheet ID",
    description: "Google Sheets 表格 ID，可从表格 URL 的 /d/{spreadsheetId}/ 中获取。",
    toolDescription:
      "Google Sheets spreadsheet ID from the /d/{spreadsheetId}/ segment in the spreadsheet URL.",
  }),
  range: z.string().meta({
    title: "A1 范围",
    description: "A1 notation 范围，例如 Sheet1!A1:D10。",
    toolDescription:
      "A1 notation range, for example Sheet1!A1:D10. Include the sheet name when needed.",
  }),
};

const valuesInputSchema = z
  .union([
    z.array(z.array(z.union([z.string(), z.number(), z.boolean(), z.null()]))),
    z.string(),
  ])
  .meta({
    title: "单元格数据",
    description: "二维数组或 JSON 字符串，例如 [[\"Name\",\"Score\"],[\"Ada\",98]]。",
    toolDescription:
      'Two-dimensional cell values array or JSON string, for example [["Name","Score"],["Ada",98]]. Cell values can be string, number, boolean, or null.',
  });

const majorDimensionSchema = z.enum(["ROWS", "COLUMNS"]).optional().nullable().meta({
  title: "主维度",
  description: "按行或按列组织数据，默认 ROWS。",
  toolDescription: "How values are organized. Use ROWS by default or COLUMNS.",
});

const valueInputOptionSchema = z
  .enum(["RAW", "USER_ENTERED"])
  .optional()
  .nullable()
  .meta({
    title: "写入模式",
    description:
      "RAW 按原始值写入；USER_ENTERED 按用户输入解析公式、日期和数字，默认 USER_ENTERED。",
    toolDescription:
      "RAW writes literal values. USER_ENTERED lets Google Sheets parse formulas, dates, and numbers. Default is USER_ENTERED.",
  });

const readValuesHandler = createToolHandler({
  inputSchema: z.object({
    ...googleSheetInputSchema,
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
      }),
    dateTimeRenderOption: z
      .enum(["SERIAL_NUMBER", "FORMATTED_STRING"])
      .optional()
      .nullable()
      .meta({
        title: "日期时间渲染方式",
        description: "SERIAL_NUMBER 返回序列号；FORMATTED_STRING 返回格式化字符串。",
        toolDescription:
          "How dates and times should be rendered: SERIAL_NUMBER or FORMATTED_STRING.",
      }),
  }),
  outputSchema: readValuesOutputType,
  secretSchema: z.object({}),
  handler: async (input, ctx) => {
    const parsedInput = await readValuesInputType.parseAsync({
      ...input,
      ...ctx.secrets,
    });
    const output = await readValuesTool(parsedInput);
    return readValuesOutputType.parseAsync(output);
  },
});

const writeValuesHandler = createToolHandler({
  inputSchema: z.object({
    ...googleSheetInputSchema,
    values: valuesInputSchema,
    majorDimension: majorDimensionSchema,
    valueInputOption: valueInputOptionSchema,
  }),
  outputSchema: writeValuesOutputType,
  secretSchema: z.object({}),
  handler: async (input, ctx) => {
    const parsedInput = await writeValuesInputType.parseAsync({
      ...input,
      ...ctx.secrets,
    });
    const output = await writeValuesTool(parsedInput);
    return writeValuesOutputType.parseAsync(output);
  },
});

const appendValuesHandler = createToolHandler({
  inputSchema: z.object({
    ...googleSheetInputSchema,
    values: valuesInputSchema,
    majorDimension: majorDimensionSchema,
    valueInputOption: valueInputOptionSchema,
    insertDataOption: z.enum(["INSERT_ROWS", "OVERWRITE"]).optional().nullable().meta({
      title: "追加方式",
      description: "INSERT_ROWS 插入新行；OVERWRITE 覆盖可写入区域，默认 INSERT_ROWS。",
      toolDescription:
        "How appended data is inserted. INSERT_ROWS inserts new rows, OVERWRITE writes into the available area. Default is INSERT_ROWS.",
    }),
  }),
  outputSchema: appendValuesOutputType,
  secretSchema: z.object({}),
  handler: async (input, ctx) => {
    const parsedInput = await appendValuesInputType.parseAsync({
      ...input,
      ...ctx.secrets,
    });
    const output = await appendValuesTool(parsedInput);
    return appendValuesOutputType.parseAsync(output);
  },
});

const toolSet = defineToolSet({
  manifest: {
    pluginId: "googleSheets",
    name: {
      en: "Google Sheets",
      "zh-CN": "Google Sheets 表格",
    },
    description: {
      en: "Read and write Google Sheets values with a service account",
      "zh-CN": "通过服务账号读取和写入 Google Sheets 单元格数据",
    },
    version: "0.1.0",
    versionDescription: {
      en: "Initial version with range read, range write, and append values operations.",
      "zh-CN": "初始版本，支持范围读取、范围写入和追加数据。",
    },
    toolDescription:
      "A Google Sheets toolset for reading, updating, and appending cell values through the Google Sheets API using a Google Cloud service account.",
    tutorialUrl: "https://developers.google.com/sheets/api/guides/concepts",
    tags: ["productivity"],
  },
  secretSchema,
  children: [
    {
      id: "readValues",
      name: {
        en: "Read Values",
        "zh-CN": "读取单元格",
      },
      description: {
        en: "Read values from a Google Sheets range",
        "zh-CN": "读取 Google Sheets 指定范围的单元格数据",
      },
      toolDescription:
        "Read cell values from a Google Sheets spreadsheet by spreadsheet ID and A1 notation range.",
      handler: readValuesHandler,
    },
    {
      id: "writeValues",
      name: {
        en: "Write Values",
        "zh-CN": "写入单元格",
      },
      description: {
        en: "Write values to a Google Sheets range",
        "zh-CN": "向 Google Sheets 指定范围写入单元格数据",
      },
      toolDescription:
        "Update a Google Sheets range with a two-dimensional values array. Use USER_ENTERED for formulas and parsed values, or RAW for literal values.",
      handler: writeValuesHandler,
    },
    {
      id: "appendValues",
      name: {
        en: "Append Values",
        "zh-CN": "追加单元格",
      },
      description: {
        en: "Append rows or columns to a Google Sheets range",
        "zh-CN": "向 Google Sheets 指定范围追加行或列数据",
      },
      toolDescription:
        "Append rows or columns to a Google Sheets range with a two-dimensional values array.",
      handler: appendValuesHandler,
    },
  ],
});

export default toolSet;
