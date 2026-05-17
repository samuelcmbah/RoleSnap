import {
	env,
	createExecutionContext,
	waitOnExecutionContext,
	SELF,
} from "cloudflare:test";
import { afterEach, describe, it, expect, vi } from "vitest";
import worker from "../src/index";
import {
	extractIncomingWhatsAppMessage,
	sendWhatsAppTextReply,
} from "../src/interfaces/http/routes/webhook.route";

// Test inventory:
// - GET / returns the RoleSnap health text through direct worker.fetch.
// - GET / returns the RoleSnap health text through Cloudflare SELF integration fetch.
// - GET /webhook returns Meta's challenge when the verify token matches.
// - GET /webhook rejects verification when the verify token is wrong.
// - extractIncomingWhatsAppMessage normalizes Meta's nested text payload.
// - sendWhatsAppTextReply calls the WhatsApp Cloud API with the expected request.
// - POST /webhook acknowledges unsupported media and replies with help text.

// For now, you'll need to do something like this to get a correctly-typed
// `Request` to pass to `worker.fetch()`.
const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

const testEnv = {
	...env,
	GROQ_API_KEY: "test-groq-key",
	TURSO_DATABASE_URL: "libsql://test.turso.io",
	TURSO_AUTH_TOKEN: "test-turso-token",
	SENTRY_DSN: "",
	WHATSAPP_VERIFY_TOKEN: "test-verify-token",
	WHATSAPP_PHONE_NUMBER_ID: "123456789",
	WHATSAPP_ACCESS_TOKEN: "test-whatsapp-token",
	DASHBOARD_URL: "https://rolesnap.xyz",
};

describe("Hello World worker", () => {
	it("responds with Hello World! (unit style)", async () => {
		const request = new IncomingRequest("http://example.com");
		// Create an empty context to pass to `worker.fetch()`.
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, testEnv, ctx);
		// Wait for all `Promise`s passed to `ctx.waitUntil()` to settle before running test assertions
		await waitOnExecutionContext(ctx);
		expect(await response.text()).toMatchInlineSnapshot(`"RoleSnap API is running!"`);
	});

	it("responds with Hello World! (integration style)", async () => {
		const response = await SELF.fetch("https://example.com");
		expect(await response.text()).toMatchInlineSnapshot(`"RoleSnap API is running!"`);
	});
});

describe("WhatsApp webhook", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("returns the Meta challenge when the verify token matches", async () => {
		const request = new IncomingRequest(
			"http://example.com/webhook?hub.mode=subscribe&hub.verify_token=test-verify-token&hub.challenge=HELLO_WORLD"
		);
		const ctx = createExecutionContext();

		const response = await worker.fetch(request, testEnv, ctx);

		expect(response.status).toBe(200);
		expect(await response.text()).toBe("HELLO_WORLD");
	});

	it("rejects Meta verification when the verify token is wrong", async () => {
		const request = new IncomingRequest(
			"http://example.com/webhook?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=HELLO_WORLD"
		);
		const ctx = createExecutionContext();

		const response = await worker.fetch(request, testEnv, ctx);
		const body = await response.json() as { error: { code: string } };

		expect(response.status).toBe(403);
		expect(body.error.code).toBe("WEBHOOK_VERIFICATION_FAILED");
	});

	it("extracts text messages from Meta webhook payloads", () => {
		const message = extractIncomingWhatsAppMessage({
			entry: [{
				changes: [{
					value: {
						messages: [{
							from: "2348012345678",
							type: "text",
							text: { body: " Hiring a React developer in Lagos " },
						}],
					},
				}],
			}],
		});

		expect(message).toEqual({
			from: "2348012345678",
			type: "text",
			text: "Hiring a React developer in Lagos",
		});
	});

	it("sends WhatsApp text replies through the Cloud API", async () => {
		const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
			new Response(JSON.stringify({ messages: [{ id: "wamid.test" }] }), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			})
		);

		await sendWhatsAppTextReply(
			{ ...testEnv, WHATSAPP_GRAPH_API_VERSION: "v18.0" },
			"2348012345678",
			"Job saved! https://rolesnap.xyz/job/123"
		);

		expect(fetchMock).toHaveBeenCalledWith(
			"https://graph.facebook.com/v18.0/123456789/messages",
			expect.objectContaining({
				method: "POST",
				headers: expect.objectContaining({
					Authorization: "Bearer test-whatsapp-token",
					"Content-Type": "application/json",
				}),
				body: JSON.stringify({
					messaging_product: "whatsapp",
					to: "2348012345678",
					type: "text",
					text: {
						preview_url: false,
						body: "Job saved! https://rolesnap.xyz/job/123",
					},
				}),
			})
		);
	});

	it("acknowledges unsupported WhatsApp messages and replies with help text", async () => {
		const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
			new Response(JSON.stringify({ messages: [{ id: "wamid.test" }] }), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			})
		);
		const request = new IncomingRequest("http://example.com/webhook", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				entry: [{
					changes: [{
						value: {
							messages: [{
								from: "2348012345678",
								type: "image",
							}],
						},
					}],
				}],
			}),
		});
		const ctx = createExecutionContext();

		const response = await worker.fetch(request, testEnv, ctx);
		await waitOnExecutionContext(ctx);

		expect(response.status).toBe(200);
		expect(fetchMock).toHaveBeenCalledOnce();
		expect(fetchMock.mock.calls[0][1]).toEqual(expect.objectContaining({
			body: expect.stringContaining("Please forward a text job post for now."),
		}));
	});
});
