export type LearnerStateFlushResult = {
  status: "idle" | "pending" | "persisted" | "failed";
  error?: string;
};

export type WindowShutdownFailureStage = "flush" | "destroy";

export interface WindowCloseRequestEvent {
  preventDefault(): void;
}

export interface LearnerStateShutdownDependencies {
  flush(): Promise<LearnerStateFlushResult>;
  destroy(): Promise<void>;
  reportFailure(stage: WindowShutdownFailureStage, error: Error): void;
}

function asError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

/** Consumes every close request while one bounded learner-state shutdown is in flight. */
export function createLearnerStateCloseHandler(dependencies: LearnerStateShutdownDependencies) {
  let shutdown: Promise<void> | undefined;

  return (event: WindowCloseRequestEvent): Promise<void> => {
    event.preventDefault();
    if (shutdown) return shutdown;

    const report = (stage: WindowShutdownFailureStage, error: unknown) => {
      try {
        dependencies.reportFailure(stage, asError(error));
      } catch {
        // Diagnostics must not prevent the close lifecycle from reaching destroy.
      }
    };

    const attempt = (async () => {
      try {
        const flushed = await dependencies.flush();
        if (flushed.status === "pending" || flushed.status === "failed") {
          report("flush", new Error(flushed.error ?? "Learner state was not durably saved before shutdown."));
        }
      } catch (error) {
        report("flush", error);
      }

      try {
        await dependencies.destroy();
      } catch (error) {
        report("destroy", error);
      }
    })();

    shutdown = attempt.finally(() => {
      shutdown = undefined;
    });
    return shutdown;
  };
}
