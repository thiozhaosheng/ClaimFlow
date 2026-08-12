// Nothing a person reads should mention the API, a hostname, or a status
// code. These tests pin that: every branch of humanMessage() is checked for
// jargon as well as for saying the right thing.
import { humanMessage, isReadableMessage } from "./apierrors.js";

const JARGON = /\b(API|HTTP|fetch|unreachable|null|undefined|ECONN|status code|\d{3}\b)/i;

describe("humanMessage", () => {
  it("says you are offline when the browser knows you are", () => {
    const spy = jest.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    expect(humanMessage({ status: 0, path: "/api/claims" })).toMatch(/offline/i);
    spy.mockRestore();
  });

  it("does not blame the user's connection when they are online", () => {
    const spy = jest.spyOn(navigator, "onLine", "get").mockReturnValue(true);
    const msg = humanMessage({ status: 0, path: "/api/claims" });
    expect(msg).toMatch(/can't reach ClaimFlow/i);
    expect(msg).not.toMatch(/offline/i);
    spy.mockRestore();
  });

  it("treats a failed sign-in as wrong credentials, not an expired session", () => {
    expect(humanMessage({ status: 401, path: "/api/auth/login" })).toMatch(
      /email or password/i,
    );
    expect(humanMessage({ status: 401, path: "/api/claims/my" })).toMatch(
      /session has ended/i,
    );
  });

  it("never repeats a server fault verbatim", () => {
    const leak = { message: "Error: connect ECONNREFUSED 10.0.0.4:5432" };
    const msg = humanMessage({ status: 500, payload: leak, path: "/api/claims" });
    expect(msg).toMatch(/our side/i);
    expect(msg).not.toMatch(/ECONNREFUSED/);
  });

  it("keeps the backend's own copy when it is written for a person", () => {
    const policy = {
      message:
        "Client entertainment claims must name the client company and contacts present.",
    };
    expect(humanMessage({ status: 422, payload: policy, path: "/api/claims" })).toBe(
      policy.message,
    );
  });

  it("drops bare status words in favour of a real sentence", () => {
    const msg = humanMessage({
      status: 403,
      payload: { message: "Forbidden" },
      path: "/api/claims",
    });
    expect(msg).toMatch(/don't have access/i);
  });

  it.each([0, 400, 401, 403, 404, 409, 413, 415, 429, 500, 502, 503])(
    "status %s produces no jargon",
    (status) => {
      const msg = humanMessage({ status, path: "/api/claims" });
      expect(msg).not.toMatch(JARGON);
      expect(msg.length).toBeGreaterThan(10);
    },
  );
});

describe("isReadableMessage", () => {
  it("accepts a written sentence", () => {
    expect(isReadableMessage("A receipt image is required for claims above S$50.")).toBe(true);
  });

  it("rejects an infrastructure refusal that happens to read like a sentence", () => {
    // This exact string reached the sign-in box before the filter caught it.
    expect(
      isReadableMessage('CORS: origin "http://localhost:5199" not in allowlist'),
    ).toBe(false);
    expect(
      humanMessage({
        status: 500,
        payload: { message: 'CORS: origin "http://x" not in allowlist' },
        path: "/api/auth/login",
      }),
    ).toMatch(/our side/i);
  });

  it.each([
    "Forbidden",
    'CORS: origin "http://localhost:5199" not in allowlist',
    "Access-Control-Allow-Origin missing on the preflight response",
    "ERR_BAD_REQUEST",
    "",
    "Cannot read properties of undefined (reading 'id')",
    "PrismaClientKnownRequestError: Invalid `prisma.claim.create()`",
  ])("rejects %s", (text) => {
    expect(isReadableMessage(text)).toBe(false);
  });
});
