import { createGoogleSheetsClient, parseValuesInput } from "./client";
import type {
  AppendValuesInput,
  AppendValuesOutput,
  ReadValuesInput,
  ReadValuesOutput,
  ServiceAccountSecrets,
  WriteValuesInput,
  WriteValuesOutput,
} from "./schemas";
import type { GoogleSheetsUpdateResponse, GoogleSheetsValues } from "./types";

export async function readValues(
  input: ReadValuesInput & ServiceAccountSecrets,
): Promise<ReadValuesOutput> {
  const client = createGoogleSheetsClient(input.serviceAccountJson);
  const response = await client.getValues({
    spreadsheetId: input.spreadsheetId,
    range: input.range,
    majorDimension: input.majorDimension,
    valueRenderOption: input.valueRenderOption,
    dateTimeRenderOption: input.dateTimeRenderOption,
  });
  const values = response.values ?? [];

  const output: ReadValuesOutput = {
    success: true,
    values,
    rowCount: values.length,
    columnCount: getColumnCount(values),
  };

  if (response.range !== undefined) {
    output.range = response.range;
  }
  if (response.majorDimension !== undefined) {
    output.majorDimension = response.majorDimension;
  }

  return output;
}

export async function writeValues(
  input: WriteValuesInput & ServiceAccountSecrets,
): Promise<WriteValuesOutput> {
  const client = createGoogleSheetsClient(input.serviceAccountJson);
  const response = await client.updateValues({
    spreadsheetId: input.spreadsheetId,
    range: input.range,
    values: parseValuesInput(input.values),
    majorDimension: input.majorDimension,
    valueInputOption: input.valueInputOption,
  });

  return formatUpdateOutput(response);
}

export async function appendValues(
  input: AppendValuesInput & ServiceAccountSecrets,
): Promise<AppendValuesOutput> {
  const client = createGoogleSheetsClient(input.serviceAccountJson);
  const response = await client.appendValues({
    spreadsheetId: input.spreadsheetId,
    range: input.range,
    values: parseValuesInput(input.values),
    majorDimension: input.majorDimension,
    valueInputOption: input.valueInputOption,
    insertDataOption: input.insertDataOption,
  });

  const output: AppendValuesOutput = {
    success: true,
  };

  if (response.spreadsheetId !== undefined) {
    output.spreadsheetId = response.spreadsheetId;
  }
  if (response.tableRange !== undefined) {
    output.tableRange = response.tableRange;
  }
  copyUpdateFields(output, response.updates);

  return output;
}

function formatUpdateOutput(response: GoogleSheetsUpdateResponse): WriteValuesOutput {
  const output: WriteValuesOutput = {
    success: true,
  };
  copyUpdateFields(output, response);
  return output;
}

function copyUpdateFields(
  output: WriteValuesOutput | AppendValuesOutput,
  response: GoogleSheetsUpdateResponse | undefined,
): void {
  if (!response) {
    return;
  }
  if (response.spreadsheetId !== undefined) {
    output.spreadsheetId = response.spreadsheetId;
  }
  if (response.updatedRange !== undefined) {
    output.updatedRange = response.updatedRange;
  }
  if (response.updatedRows !== undefined) {
    output.updatedRows = response.updatedRows;
  }
  if (response.updatedColumns !== undefined) {
    output.updatedColumns = response.updatedColumns;
  }
  if (response.updatedCells !== undefined) {
    output.updatedCells = response.updatedCells;
  }
}

function getColumnCount(values: GoogleSheetsValues): number {
  return values.reduce((max, row) => Math.max(max, row.length), 0);
}
