export type GoogleSheetsCellValue = string | number | boolean | null;

export type GoogleSheetsValues = GoogleSheetsCellValue[][];

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
  majorDimension?: "ROWS" | "COLUMNS";
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
