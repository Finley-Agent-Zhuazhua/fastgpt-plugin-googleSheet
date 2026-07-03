export type GoogleSheetsCellValue = string | number | boolean | null;

export type GoogleSheetsValues = GoogleSheetsCellValue[][];

export type GoogleSheetsMajorDimension = "ROWS" | "COLUMNS";

export type GoogleSheetsValueRenderOption =
  | "FORMATTED_VALUE"
  | "UNFORMATTED_VALUE"
  | "FORMULA";

export type GoogleSheetsDateTimeRenderOption =
  | "SERIAL_NUMBER"
  | "FORMATTED_STRING";

export type GoogleSheetsValueInputOption = "RAW" | "USER_ENTERED";

export type GoogleSheetsInsertDataOption = "INSERT_ROWS" | "OVERWRITE";

export interface GoogleServiceAccountCredentials {
  client_email: string;
  private_key: string;
  token_uri?: string;
}

export interface GoogleTokenResponse {
  access_token?: string;
  expires_in?: number;
  token_type?: string;
  error?: string;
  error_description?: string;
}

export interface GoogleSheetsValuesResponse {
  range?: string;
  majorDimension?: GoogleSheetsMajorDimension;
  values?: GoogleSheetsValues;
}

export interface GoogleSheetsUpdateResponse {
  spreadsheetId?: string;
  updatedRange?: string;
  updatedRows?: number;
  updatedColumns?: number;
  updatedCells?: number;
}

export interface GoogleSheetsAppendResponse {
  spreadsheetId?: string;
  tableRange?: string;
  updates?: GoogleSheetsUpdateResponse;
}
