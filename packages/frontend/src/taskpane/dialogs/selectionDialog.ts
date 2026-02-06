/* global Office */

function safeParseMessage(raw: unknown): any | null {
  if (typeof raw !== "string") return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function setPreview(text: string) {
  const el = document.getElementById("preview");
  if (!el) return;
  el.textContent = text || "No selection.";
}

function setDisabled(disabled: boolean) {
  for (const id of ["ask", "translate", "autoComment", "saveClause"]) {
    const btn = document.getElementById(id) as HTMLButtonElement | null;
    if (btn) btn.disabled = disabled;
  }
}

function send(action: string) {
  Office.context.ui.messageParent(JSON.stringify({ action }));
}

Office.onReady(() => {
  // Receive selection text from the parent.
  Office.context.ui.addHandlerAsync(Office.EventType.DialogParentMessageReceived, (arg: any) => {
    const msg = safeParseMessage(arg?.message);
    if (msg?.type === "selection") {
      const text = String(msg.text || "");
      setPreview(text);
      setDisabled(!text.trim());
    }
  }, () => {
    // Handshake: tell parent we're ready *after* handler is registered.
    send("ready");

    // Extra nudge to avoid rare timing misses.
    window.setTimeout(() => send("ready"), 200);
  });

  setDisabled(true);

  (document.getElementById("ask") as HTMLButtonElement | null)?.addEventListener("click", () => send("ask"));
  (document.getElementById("translate") as HTMLButtonElement | null)?.addEventListener("click", () => send("translate"));
  (document.getElementById("autoComment") as HTMLButtonElement | null)?.addEventListener("click", () => send("autoComment"));
  (document.getElementById("saveClause") as HTMLButtonElement | null)?.addEventListener("click", () => send("saveClause"));
  (document.getElementById("refresh") as HTMLButtonElement | null)?.addEventListener("click", () => send("requestSelection"));
  (document.getElementById("close") as HTMLButtonElement | null)?.addEventListener("click", () => send("close"));
});


