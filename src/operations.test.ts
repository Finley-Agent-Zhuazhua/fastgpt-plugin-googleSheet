import { generateKeyPairSync } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import toolSet from "../index";
import { clearGoogleSheetsTokenCacheForTests } from "./client";
import { appendValues, readValues, writeValues } from "./operations";

function createServiceAccountJson(email = `bot-${crypto.randomUUID()}@example.iam.gserviceaccount.com`): string {
  const { privateKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
  });

  return JSON.stringify({
    client_email: email,
    private_key: privateKey.export({ type: "pkcs8", format: "pem" }),
    token_uri: "https://oauth2.googleapis.com/token",
  });
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

function mockGoogleFetch(apiResponse: unknown): ReturnType<typeof vi.fn<typeof fetch>> {
  const fetchMock = vi.fn<typeof fetch>();
  fetchMock
    .mockResolvedValueOnce(jsonResponse({ access_token: "test-token", expires_in: 3600 }))
    .mockResolvedValueOnce(jsonResponse(apiResponse));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  clearGoogleSheetsTokenCacheForTests();
});

describe("Google Sheets operations", () => {
  it("formats readValues output with row and column counts", async () => {
    mockGoogleFetch({
      range: "Sheet1!A1:C2",
      majorDimension: "ROWS",
      values: [
        ["Name", "Score"],
        ["Ada", 98, true],
      ],
    });

    await expect(
      readValues({
        serviceAccountJson: createServiceAccountJson(),
        spreadsheetId: "spreadsheet-1",
        range: "Sheet1!A1:C2",
      }),
    ).resolves.toEqual({
      success: true,
      range: "Sheet1!A1:C2",
      majorDimension: "ROWS",
      values: [
        ["Name", "Score"],
        ["Ada", 98, true],
      ],
      rowCount: 2,
      columnCount: 3,
    });
  });

  it("writes values with RAW mode", async () => {
    const fetchMock = mockGoogleFetch({
      spreadsheetId: "spreadsheet-1",
      updatedRange: "Sheet1!A1:B2",
      updatedRows: 2,
      updatedColumns: 2,
      updatedCells: 4,
    });

    const result = await writeValues({
      serviceAccountJson: createServiceAccountJson(),
      spreadsheetId: "spreadsheet-1",
      range: "Sheet1!A1:B2",
      values: '[["Name","Score"],["Ada",98]]',
      valueInputOption: "RAW",
    });

    expect(result).toEqual({
      success: true,
      spreadsheetId: "spreadsheet-1",
      updatedRange: "Sheet1!A1:B2",
      updatedRows: 2,
      updatedColumns: 2,
      updatedCells: 4,
    });
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain("valueInputOption=RAW");
    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).toEqual({
      majorDimension: "ROWS",
      values: [
        ["Name", "Score"],
        ["Ada", 98],
      ],
    });
  });

  it("appends values and flattens update metadata", async () => {
    const fetchMock = mockGoogleFetch({
      spreadsheetId: "spreadsheet-1",
      tableRange: "Sheet1!A1:B10",
      updates: {
        updatedRange: "Sheet1!A11:B11",
        updatedRows: 1,
        updatedColumns: 2,
        updatedCells: 2,
      },
    });

    const result = await appendValues({
      serviceAccountJson: createServiceAccountJson(),
      spreadsheetId: "spreadsheet-1",
      range: "Sheet1!A:B",
      values: [["Grace", 100]],
      insertDataOption: "INSERT_ROWS",
    });

    expect(result).toEqual({
      success: true,
      spreadsheetId: "spreadsheet-1",
      tableRange: "Sheet1!A1:B10",
      updatedRange: "Sheet1!A11:B11",
      updatedRows: 1,
      updatedColumns: 2,
      updatedCells: 2,
    });
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain(":append");
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain("insertDataOption=INSERT_ROWS");
  });
});

describe("FastGPT toolset manifest", () => {
  it("registers the expected child tools", () => {
    expect(toolSet.getUserToolManifest().pluginId).toBe("googleSheets");
    expect(toolSet.getChildManifests().map((child) => child.id)).toEqual([
      "readValues",
      "writeValues",
      "appendValues",
    ]);
    expect(toolSet.getToolHandler("readValues")).toBeDefined();
    expect(toolSet.getToolHandler("writeValues")).toBeDefined();
    expect(toolSet.getToolHandler("appendValues")).toBeDefined();
  });
});
