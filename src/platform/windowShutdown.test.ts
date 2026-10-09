import { describe, expect, it, vi } from "vitest";
import { createLearnerStateCloseHandler } from "./windowShutdown";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(resolvePromise => { resolve = resolvePromise; });
  return { promise, resolve };
}

describe("learner-state window shutdown", () => {
  it("prevents every repeated close request and runs one flush and destroy", async () => {
    const flushGate = deferred<{ status: "persisted" }>();
    const flush = vi.fn(() => flushGate.promise);
    const destroy = vi.fn(async () => undefined);
    const reportFailure = vi.fn();
    const close = createLearnerStateCloseHandler({ flush, destroy, reportFailure });
    const firstEvent = { preventDefault: vi.fn() };
    const secondEvent = { preventDefault: vi.fn() };

    const firstClose = close(firstEvent);
    const repeatedClose = close(secondEvent);

    expect(firstEvent.preventDefault).toHaveBeenCalledOnce();
    expect(secondEvent.preventDefault).toHaveBeenCalledOnce();
    expect(firstClose).toBe(repeatedClose);
    expect(flush).toHaveBeenCalledOnce();
    expect(destroy).not.toHaveBeenCalled();

    flushGate.resolve({ status: "persisted" });
    await Promise.all([firstClose, repeatedClose]);

    expect(destroy).toHaveBeenCalledOnce();
    expect(reportFailure).not.toHaveBeenCalled();
  });

  it.each(["pending", "failed"] as const)("reports a bounded %s flush and still destroys the window", async status => {
    const flush = vi.fn(async () => ({ status, error: "flush did not complete durably" }));
    const destroy = vi.fn(async () => undefined);
    const reportFailure = vi.fn();
    const close = createLearnerStateCloseHandler({ flush, destroy, reportFailure });

    await close({ preventDefault: vi.fn() });

    expect(reportFailure).toHaveBeenCalledWith("flush", expect.objectContaining({ message: "flush did not complete durably" }));
    expect(destroy).toHaveBeenCalledOnce();
  });
});
