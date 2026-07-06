import { generateKeyPairSync } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  GoogleSheetsClient,
  clearGoogleSheetsTokenCacheForTests,
  parseServiceAccountCredentials,
  parseValuesInput,
} from "./client";

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

afterEach(() => {
  vi.restoreAllMocks();
  clearGoogleSheetsTokenCacheForTests();
});

describe("Google Sheets client helpers", () => {
  it("parses service account JSON and normalizes escaped private keys", () => {
    const credentials = parseServiceAccountCredentials(
      JSON.stringify({
        client_email: "bot@example.iam.gserviceaccount.com",
        private_key: "line1\\nline2",
      }),
    );

    expect(credentials.client_email).toBe("bot@example.iam.gserviceaccount.com");
    expect(credentials.private_key).toBe("line1\nline2");
  });

  it("validates two-dimensional values input", () => {
    expect(parseValuesInput('[["Name","Score"],["Ada",98,true,null]]')).toEqual([
      ["Name", "Score"],
      ["Ada", 98, true, null],
    ]);
    expect(() => parseValuesInput("[]")).toThrow(/non-empty two-dimensional array/);
    expect(() => parseValuesInput('[[{"bad":true}]]')).toThrow(/cell values/);
  });

  it("exchanges a service account JWT and calls the values read API", async () => {
    const fetchMock = vi.fn<typeof fetch>();
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ access_token: "test-token", expires_in: 3600 }))
      .mockResolvedValueOnce(
        jsonResponse({
          range: "Sheet1!A1:B2",
          majorDimension: "ROWS",
          values: [
            ["Name", "Score"],
            ["Ada", 98],
          ],
        }),
      );

    const client = new GoogleSheetsClient(createServiceAccountJson(), {
      fetchFn: fetchMock,
    });
    const result = await client.getValues({
      spreadsheetId: "spreadsheet-1",
      range: "Sheet1!A1:B2",
      valueRenderOption: "UNFORMATTED_VALUE",
    });

    expect(result.values).toEqual([
      ["Name", "Score"],
      ["Ada", 98],
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe("https://oauth2.googleapis.com/token");
    expect(fetchMock.mock.calls[0]?.[1]?.method).toBe("POST");
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain(
      "https://sheets.googleapis.com/v4/spreadsheets/spreadsheet-1/values/Sheet1!A1%3AB2",
    );
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain("valueRenderOption=UNFORMATTED_VALUE");
    expect((fetchMock.mock.calls[1]?.[1]?.headers as Record<string, string>).Authorization).toBe(
      "Bearer test-token",
    );
  });

  it("ignores custom token_uri from service account JSON", async () => {
    const fetchMock = vi.fn<typeof fetch>();
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ access_token: "test-token", expires_in: 3600 }))
      .mockResolvedValueOnce(jsonResponse({ values: [["ok"]] }));

    const serviceAccountJson = JSON.stringify({
      ...JSON.parse(createServiceAccountJson()),
      token_uri: "https://attacker.example/token",
    });

    const client = new GoogleSheetsClient(serviceAccountJson, {
      fetchFn: fetchMock,
    });
    await client.getValues({
      spreadsheetId: "spreadsheet-1",
      range: "Sheet1!A1:A1",
    });

    expect(String(fetchMock.mock.calls[0]?.[0])).toBe("https://oauth2.googleapis.com/token");
    expect(String(fetchMock.mock.calls[0]?.[0])).not.toContain("attacker.example");
  });
});
