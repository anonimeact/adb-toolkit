import * as vscode from "vscode";
import {
  connectChoiceItem,
  connectSuggestionItems,
  connectTabTarget,
  findConnectSuggestion,
  resolveConnectChoice,
  shouldReplaceFieldWithHint,
  valueForConnectSuggestion,
  type ConnectSuggestion,
} from "./connectAddress";
import { isValidHostPort, isValidPackageName, isValidPort } from "./validators";

export async function confirmDestructive(
  message: string,
  detail?: string,
): Promise<boolean> {
  const choice = await vscode.window.showWarningMessage(
    message,
    { modal: true, detail },
    "Confirm",
  );
  return choice === "Confirm";
}

const CONNECT_ADDRESS_CONTEXT = "adbToolkit.connectAddressOpen";

let onConnectAddressTab: (() => void) | undefined;

export function acceptConnectAddressTab(): void {
  onConnectAddressTab?.();
}

/** Address field with recent endpoints and IP-only rows. Typed host:port is accepted directly. */
export function pickConnectAddress(
  history: string[],
): Promise<string | undefined> {
  const pick = vscode.window.createQuickPick<ConnectSuggestion>();
  pick.title = "Connect to device";
  pick.placeholder = "Type ip:port, for example 192.168.1.10:5555";
  pick.prompt =
    "Tab or Enter inserts the highlighted row. Enter again connects when the address is complete.";
  pick.value = "";
  pick.items = connectSuggestionItems(history);

  return new Promise((resolve) => {
    let settled = false;
    let suppressValueHandler = false;
    let ignoreActive = false;
    let valueFromList = false;
    /** True while the user is typing or clearing the field; list highlight does not overwrite. */
    let manualEdit = true;
    let focusedItem: ConnectSuggestion | undefined;
    const setFullItems = (
      focus?: Pick<ConnectSuggestion, "entry" | "label">,
    ) => {
      pick.items = connectSuggestionItems(history);
      const match = findConnectSuggestion(pick.items, focus ?? focusedItem);
      if (match) {
        pick.activeItems = [match];
        focusedItem = match;
      }
    };
    const finish = (value: string | undefined) => {
      if (settled) {
        return;
      }
      settled = true;
      onConnectAddressTab = undefined;
      void vscode.commands.executeCommand(
        "setContext",
        CONNECT_ADDRESS_CONTEXT,
        false,
      );
      pick.hide();
      resolve(value);
    };

    const writeListValue = (item: ConnectSuggestion) => {
      suppressValueHandler = true;
      ignoreActive = true;
      setFullItems(item);
      const match = findConnectSuggestion(pick.items, item);
      if (match) {
        pick.activeItems = [match];
        focusedItem = match;
      }
      pick.value = valueForConnectSuggestion(item);
      suppressValueHandler = false;
      valueFromList = true;
      manualEdit = false;
      queueMicrotask(() => {
        ignoreActive = false;
      });
    };

    onConnectAddressTab = () => {
      const target = connectTabTarget(
        pick.items,
        pick.activeItems[0] ?? focusedItem,
        manualEdit,
      );
      if (!target) {
        return;
      }
      const match = findConnectSuggestion(pick.items, target);
      if (!match) {
        return;
      }
      writeListValue(match);
    };

    pick.onDidChangeActive((items) => {
      focusedItem = items[0];
    });

    pick.onDidChangeSelection((items) => {
      if (items[0]) {
        focusedItem = items[0];
      }
    });

    pick.onDidChangeValue((value) => {
      if (suppressValueHandler) {
        return;
      }
      manualEdit = true;
      valueFromList = false;
      ignoreActive = true;
      pick.items = connectSuggestionItems(history, value);
      queueMicrotask(() => {
        ignoreActive = false;
      });
    });

    const handleAccept = (
      hinted: ConnectSuggestion | undefined,
      allItems: readonly ConnectSuggestion[],
    ) => {
      if (settled) {
        return;
      }
      const typed = pick.value.trim();
      if (manualEdit && isValidHostPort(typed)) {
        finish(typed);
        return;
      }
      const resolvedHint = findConnectSuggestion(allItems, hinted) ?? hinted;
      if (
        shouldReplaceFieldWithHint(pick.value, resolvedHint, manualEdit) &&
        resolvedHint
      ) {
        writeListValue(resolvedHint);
        return;
      }
      const chosen = connectChoiceItem(allItems, pick.value, resolvedHint);
      const choice = resolveConnectChoice(pick.value, chosen, valueFromList);
      if (choice.type === "connect") {
        finish(choice.address);
        return;
      }
      if (choice.type === "edit" && chosen) {
        writeListValue(chosen);
        return;
      }
      if (choice.type === "edit") {
        suppressValueHandler = true;
        pick.value = choice.value;
        suppressValueHandler = false;
        return;
      }
      if (isValidHostPort(typed)) {
        finish(typed);
      }
    };

    pick.onDidAccept(() => {
      const hinted =
        pick.selectedItems[0] ?? pick.activeItems[0] ?? focusedItem;
      const allItems = pick.items;
      handleAccept(hinted, allItems);
    });

    pick.onDidHide(() => finish(undefined));
    void vscode.commands
      .executeCommand("setContext", CONNECT_ADDRESS_CONTEXT, true)
      .then(() => {
        if (!settled) {
          pick.show();
        }
      });
  });
}

export async function inputHostPort(
  prompt: string,
  value?: string,
): Promise<string | undefined> {
  return vscode.window.showInputBox({
    prompt,
    value,
    validateInput: (v) =>
      isValidHostPort(v)
        ? undefined
        : "Enter host:port (e.g. 192.168.1.10:5555)",
  });
}

export interface PackageListFilterOption {
  label: string;
  description: string;
  flag: "" | "-3" | "-s";
}

const PACKAGE_LIST_FILTERS: PackageListFilterOption[] = [
  {
    label: "User-installed apps",
    description: "Apps you installed (store, APK, sideload)",
    flag: "-3",
  },
  {
    label: "System apps",
    description: "Pre-installed with the device or ROM",
    flag: "-s",
  },
  {
    label: "All apps",
    description: "Every package on the device",
    flag: "",
  },
];

export async function pickPackageListFilter(): Promise<
  PackageListFilterOption | undefined
> {
  return vscode.window.showQuickPick(PACKAGE_LIST_FILTERS, {
    placeHolder: "Which apps to list?",
  });
}

export async function pickPackageFromList(
  packages: string[],
  options?: { manualEntryOnEmpty?: boolean },
): Promise<string | undefined> {
  const manualFallback = options?.manualEntryOnEmpty ?? true;
  if (packages.length === 0) {
    return manualFallback ? inputPackageName() : undefined;
  }

  const picked = await vscode.window.showQuickPick(packages, {
    placeHolder: "Search package name (type to filter)",
  });
  if (picked) {
    return picked;
  }
  return manualFallback ? inputPackageName() : undefined;
}

export async function inputPackageName(
  prompt = "Package name (com.example.app)",
): Promise<string | undefined> {
  return vscode.window.showInputBox({
    prompt,
    validateInput: (v) =>
      isValidPackageName(v) ? undefined : "Invalid package name",
  });
}

export async function inputPort(prompt: string): Promise<string | undefined> {
  return vscode.window.showInputBox({
    prompt,
    validateInput: (v) =>
      isValidPort(v) ? undefined : "Enter a port number (1–65535)",
  });
}

export async function inputRemotePath(
  prompt = "Remote path on device",
  value = "/sdcard/",
): Promise<string | undefined> {
  const v = await vscode.window.showInputBox({ prompt, value });
  return v?.trim() || undefined;
}
