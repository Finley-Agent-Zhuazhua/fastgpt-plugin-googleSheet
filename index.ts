import { createToolHandler, defineToolSet } from "@fastgpt-plugin/sdk-factory";
import {
  appendValues,
  readValues,
  writeValues,
} from "./src/operations";
import {
  appendValuesInputSchema,
  appendValuesOutputSchema,
  readValuesInputSchema,
  readValuesOutputSchema,
  serviceAccountSecretSchema,
  writeValuesInputSchema,
  writeValuesOutputSchema,
  type ServiceAccountSecrets,
} from "./src/schemas";

function getServiceAccountJson(secrets: ServiceAccountSecrets | undefined): string {
  if (!secrets?.serviceAccountJson?.trim()) {
    throw new Error("Google Sheets serviceAccountJson secret is required");
  }

  return secrets.serviceAccountJson;
}

const readValuesHandler = createToolHandler({
  inputSchema: readValuesInputSchema,
  outputSchema: readValuesOutputSchema,
  secretSchema: serviceAccountSecretSchema,
  handler: async (input, ctx) => readValues({
    ...input,
    serviceAccountJson: getServiceAccountJson(ctx.secrets),
  }),
});

const writeValuesHandler = createToolHandler({
  inputSchema: writeValuesInputSchema,
  outputSchema: writeValuesOutputSchema,
  secretSchema: serviceAccountSecretSchema,
  handler: async (input, ctx) => writeValues({
    ...input,
    serviceAccountJson: getServiceAccountJson(ctx.secrets),
  }),
});

const appendValuesHandler = createToolHandler({
  inputSchema: appendValuesInputSchema,
  outputSchema: appendValuesOutputSchema,
  secretSchema: serviceAccountSecretSchema,
  handler: async (input, ctx) => appendValues({
    ...input,
    serviceAccountJson: getServiceAccountJson(ctx.secrets),
  }),
});

const toolSet = defineToolSet({
  manifest: {
    pluginId: "googleSheets",
    name: {
      en: "Google Sheets",
      "zh-CN": "Google Sheets 表格",
    },
    description: {
      en: "Read, write, and append Google Sheets cell values with a Google Cloud service account.",
      "zh-CN": "通过 Google Cloud 服务账号读取、写入和追加 Google Sheets 单元格数据。",
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
    permission: [],
  },
  secretSchema: serviceAccountSecretSchema,
  children: [
    {
      id: "readValues",
      name: {
        en: "Read Values",
        "zh-CN": "读取单元格",
      },
      description: {
        en: "Read values from a Google Sheets range.",
        "zh-CN": "读取 Google Sheets 指定范围的单元格数据。",
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
        en: "Write values to a Google Sheets range.",
        "zh-CN": "向 Google Sheets 指定范围写入单元格数据。",
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
        en: "Append rows or columns to a Google Sheets range.",
        "zh-CN": "向 Google Sheets 指定范围追加行或列数据。",
      },
      toolDescription:
        "Append rows or columns to a Google Sheets range with a two-dimensional values array.",
      handler: appendValuesHandler,
    },
  ],
});

export default toolSet;
