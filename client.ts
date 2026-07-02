import { createSign } from "node:crypto";
import type {
  GoogleServiceAccountCredentials,
  GoogleSheetsAppendResponse,
  GoogleSheetsUpdateResponse,
  GoogleSheetsValues,
  GoogleSheetsValuesResponse,
  GoogleTokenResponse,
} from "./types";

const GOOGLE_TOKEN_URI = "https://oauth2.googleapis.com/token";
const GOOGLE_SHEETS_API_BASE = "https://sheets.googleapis.com/v4";
const GOOGLE_SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";

const tokenCache = new Map<string, { token: string; expiresAt: number }>();

export interface GoogleSheetsRequestOptions {
  method?: "GET" | "POST" | "PUT";
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
}

export class GoogleSheetsClient {
  constructor(private readonly serviceAccountJson: string) {}

  async getValues(input: {
    spreadsheetId: string;
    range: string;
    majorDimension?: "ROWS" | "COLUMNS" | null | undefined;
    valueRenderOption?:
      | "FORMATTED_VALUE"
      | "UNFORMATTED_VALUE"
      | "FORMULA"
      | null
      | undefined;
    dateTimeRenderOption?:
      | "SERIAL_NUMBER"
      | "FORMATTED_STRING"
      | null
      | undefined;
  }): Promise<GoogleSheetsValuesResponse> {
    return this.request<GoogleSheetsValuesResponse>(
      `/spreadsheets/${encodeURIComponent(input.spreadsheetId)}/values/${encodeURIComponent(input.range)}`,
      {
        query: {
          majorDimension: input.majorDimension || undefined,
          valueRenderOption: input.valueRenderOption || undefined,
          dateTimeRenderOption: input.dateTimeRenderOption || undefined,
        },
      },
    );
  }

  async updateValues(input: {
    spreadsheetId: string;
    range: string;
    values: GoogleSheetsValues;
    majorDimension?: "ROWS" | "COLUMNS" | null | undefined;
    valueInputOption?: "RAW" | "USER_ENTERED" | null | undefined;
  }): Promise<GoogleSheetsUpdateResponse> {
    return this.request<GoogleSheetsUpdateResponse>(
      `/spreadsheets/${encodeURIComponent(input.spreadsheetId)}/values/${encodeURIComponent(input.range)}`,
      {
        method: "PUT",
        query: {
          valueInputOption: input.valueInputOption || "USER_ENTERED",
        },
        body: {
          majorDimension: input.majorDimension || "ROWS",
          values: input.values,
        },
      },
    );
  }

  async appendValues(input: {
    spreadsheetId: string;
    range: string;
    values: GoogleSheetsValues;
    majorDimension?: "ROWS" | "COLUMNS" | null | undefined;
    valueInputOption?: "RAW" | "USER_ENTERED" | null | undefined;
    insertDataOption?: "INSERT_ROWS" | "OVERWRITE" | null | undefined;
  }): Promise<GoogleSheetsAppendResponse> {
    return this.request<GoogleSheetsAppendResponse>(
      `/spreadsheets/${encodeURIComponent(input.spreadsheetId)}/values/${encodeURIComponent(input.range)}:append`,
      {
        method: "POST",
        query: {
          valueInputOption: input.valueInputOption || "USER_ENTERED",
          insertDataOption: input.insertDataOption || "INSERT_ROWS",
        },
        body: {
          majorDimension: input.majorDimension || "ROWS",
          values: input.values,
        },
      },
    );
  }

  private async request<T>(
    path: string,
    options: GoogleSheetsRequestOptions = {},
  ): Promise<T> {
    const accessToken = await getAccessToken(this.serviceAccountJson);
    const url = new URL(`${GOOGLE_SHEETS_API_BASE}${path}`);

    for (const [key, value] of Object.entries(options.query || {})) {
      if (value !== undefined && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }

    const requestInit: RequestInit = {
      method: options.method || "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    };

    if (options.body !== undefined) {
      requestInit.body = JSON.stringify(options.body);
    }

    const response = await fetch(url, requestInit);

    const text = await response.text();
    const data = parseJsonResponse(text);

    if (!response.ok) {
      throw new Error(formatGoogleApiError(response.status, data));
    }

    return data as T;
  }
}

export function createGoogleSheetsClient(
  serviceAccountJson: string,
): GoogleSheetsClient {
  return new GoogleSheetsClient(serviceAccountJson);
}

export function parseServiceAccountCredentials(
  serviceAccountJson: string,
): GoogleServiceAccountCredentials {
  if (!serviceAccountJson?.trim()) {
    throw new Error("Google service account JSON is required");
  }

  let credentials: unknown;
  try {
    credentials = JSON.parse(serviceAccountJson);
  } catch {
    throw new Error("Google service account JSON must be valid JSON");
  }

  if (!credentials || typeof credentials !== "object") {
    throw new Error("Google service account JSON must be an object");
  }

  const { client_email, private_key, token_uri } =
    credentials as Partial<GoogleServiceAccountCredentials>;

  if (!client_email?.trim()) {
    throw new Error("Google service account JSON missing client_email");
  }

  if (!private_key?.trim()) {
    throw new Error("Google service account JSON missing private_key");
  }

  const parsedCredentials: GoogleServiceAccountCredentials = {
    client_email,
    private_key: normalizePrivateKey(private_key),
  };

  if (token_uri) {
    parsedCredentials.token_uri = token_uri;
  }

  return parsedCredentials;
}

export function parseValuesInput(value: GoogleSheetsValues | string): GoogleSheetsValues {
  if (typeof value === "string") {
    let parsed: unknown;
    try {
      parsed = JSON.parse(value);
    } catch {
      throw new Error("values must be a valid JSON array");
    }

    return normalizeValues(parsed);
  }

  return normalizeValues(value);
}

export function normalizeValues(value: unknown): GoogleSheetsValues {
  if (!Array.isArray(value)) {
    throw new Error("values must be a two-dimensional array");
  }

  return value.map((row) => {
    if (!Array.isArray(row)) {
      throw new Error("values must be a two-dimensional array");
    }

    return row.map((cell) => {
      if (
        cell === null ||
        typeof cell === "string" ||
        typeof cell === "number" ||
        typeof cell === "boolean"
      ) {
        return cell;
      }

      throw new Error("cell values must be string, number, boolean, or null");
    });
  });
}

export function handleGoogleSheetsError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "Unknown error occurred while calling Google Sheets API";
}

async function getAccessToken(serviceAccountJson: string): Promise<string> {
  const credentials = parseServiceAccountCredentials(serviceAccountJson);
  const cacheKey = credentials.client_email;
  const cached = tokenCache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now() + 5 * 60 * 1000) {
    return cached.token;
  }

  const assertion = createJwtAssertion(credentials);
  const response = await fetch(credentials.token_uri || GOOGLE_TOKEN_URI, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  const text = await response.text();
  const data = parseJsonResponse(text) as GoogleTokenResponse;

  if (!response.ok || !data.access_token) {
    throw new Error(formatGoogleAuthError(response.status, data));
  }

  tokenCache.set(cacheKey, {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
  });

  return data.access_token;
}

function createJwtAssertion(credentials: GoogleServiceAccountCredentials): string {
  const now = Math.floor(Date.now() / 1000);
  const header = {
    alg: "RS256",
    typ: "JWT",
  };
  const payload = {
    iss: credentials.client_email,
    scope: GOOGLE_SHEETS_SCOPE,
    aud: credentials.token_uri || GOOGLE_TOKEN_URI,
    exp: now + 3600,
    iat: now,
  };
  const unsignedToken = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(
    JSON.stringify(payload),
  )}`;
  const signature = createSign("RSA-SHA256")
    .update(unsignedToken)
    .sign(credentials.private_key);

  return `${unsignedToken}.${base64UrlEncode(signature)}`;
}

function normalizePrivateKey(privateKey: string): string {
  return privateKey.replace(/\\n/g, "\n");
}

function base64UrlEncode(value: string | Buffer): string {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function parseJsonResponse(text: string): unknown {
  if (!text.trim()) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function formatGoogleApiError(status: number, data: unknown): string {
  const message = extractGoogleErrorMessage(data);
  return `Google Sheets API error (${status}): ${message}`;
}

function formatGoogleAuthError(status: number, data: GoogleTokenResponse): string {
  const message =
    data.error_description || data.error || extractGoogleErrorMessage(data);
  return `Google authentication failed (${status}): ${message}`;
}

function extractGoogleErrorMessage(data: unknown): string {
  if (!data || typeof data !== "object") {
    return "Unknown error";
  }

  const error = (data as { error?: unknown }).error;
  if (typeof error === "string") {
    return error;
  }

  if (error && typeof error === "object") {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") {
      return message;
    }
  }

  const message = (data as { message?: unknown }).message;
  if (typeof message === "string") {
    return message;
  }

  return JSON.stringify(data);
}
