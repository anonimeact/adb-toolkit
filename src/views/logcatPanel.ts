import type { ChildProcess } from "child_process";
import * as vscode from "vscode";
import {
  formatLogcatSessionTitle,
  resolveApplicationLabel,
} from "../core/appLabel";
import type { AdbRunner } from "../core/adbRunner";
import {
  buildLogcatArgs,
  type LogcatLevel,
  withLogcatTailFromNow,
} from "../core/logcatArgs";
import { resolvePackagePid } from "../core/logcatFilters";
import {
  fetchPackageNames,
  type PackageListFlag,
} from "../core/packageList";
import { isValidPackageName } from "../core/validators";

const MAX_LINES = 5000;
const POST_LINES_THROTTLE_MS = 120;

export interface LogcatPanelContext {
  title: string;
  adbLevel: LogcatLevel | "all";
  extraTokens: string[];
  packageName?: string;
  appLabel?: string;
  packageListFlag: PackageListFlag;
}

export class LogcatPanel {
  private static current: LogcatPanel | undefined;
  private panel: vscode.WebviewPanel | undefined;
  private proc: ChildProcess | undefined;
  private lines: string[] = [];
  private clientLevel: LogcatLevel | "all" = "all";
  private context: LogcatPanelContext;
  private logcatArgs: string[];
  private packageListFlag: PackageListFlag;
  private disposed = false;
  private postLinesTimer: ReturnType<typeof setTimeout> | undefined;
  private postLinesPending = false;
  private messageDisposable: vscode.Disposable | undefined;
  private streamPaused = false;

  private constructor(
    private readonly adb: AdbRunner,
    private serial: string,
    logcatArgs: string[],
    context: LogcatPanelContext,
  ) {
    this.logcatArgs = logcatArgs;
    this.context = context;
    this.packageListFlag = context.packageListFlag;
  }

  static show(
    adb: AdbRunner,
    serial: string,
    logcatArgs: string[],
    context: LogcatPanelContext,
  ): LogcatPanel {
    if (
      LogcatPanel.current &&
      LogcatPanel.current.serial === serial &&
      LogcatPanel.current.panel &&
      !LogcatPanel.current.disposed
    ) {
      LogcatPanel.current.logcatArgs = logcatArgs;
      LogcatPanel.current.context = context;
      LogcatPanel.current.packageListFlag = context.packageListFlag;
      LogcatPanel.current.syncPanelTitle();
      void LogcatPanel.current.refreshPackageList(context.packageListFlag);
      LogcatPanel.current.restartStreamWithCurrentArgs();
      LogcatPanel.current.panel.reveal();
      return LogcatPanel.current;
    }
    LogcatPanel.current?.dispose();
    const instance = new LogcatPanel(adb, serial, logcatArgs, context);
    LogcatPanel.current = instance;
    instance.createPanel();
    return instance;
  }

  static disposeAll(): void {
    LogcatPanel.current?.dispose();
    LogcatPanel.current = undefined;
  }

  private syncPanelTitle(): void {
    if (!this.panel) {
      return;
    }
    this.context.title = formatLogcatSessionTitle(
      this.serial,
      this.context.packageName,
      this.context.appLabel,
    );
    this.panel.title = this.context.title;
  }

  private createPanel(): void {
    this.panel = vscode.window.createWebviewPanel(
      "adbToolkit.logcat",
      this.context.title,
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [],
      },
    );

    const cspSource = this.panel.webview.cspSource;
    this.panel.webview.html = this.getHtml(cspSource);

    this.messageDisposable = this.panel.webview.onDidReceiveMessage((msg) => {
      if (!msg || typeof msg.type !== "string") {
        return;
      }
      if (msg.type === "clear") {
        this.lines = [];
        this.flushLinesToWebview();
        return;
      }
      if (msg.type === "toggleStream") {
        if (this.isStreamRunning()) {
          this.pauseStream();
        } else {
          this.resumeStream();
        }
        return;
      }
      if (msg.type === "copy") {
        const text = this.getVisibleLines().join("\n");
        void vscode.env.clipboard.writeText(text);
        void vscode.window.showInformationMessage(
          text
            ? "Filtered logcat copied to clipboard."
            : "Nothing to copy (log is empty).",
        );
        return;
      }
      if (msg.type === "level" && typeof msg.level === "string") {
        this.clientLevel = msg.level as LogcatLevel | "all";
        this.flushLinesToWebview();
        return;
      }
      if (msg.type === "requestPackages" && typeof msg.flag === "string") {
        const flag = msg.flag as PackageListFlag;
        if (flag === "" || flag === "-3" || flag === "-s") {
          void this.refreshPackageList(flag);
        }
        return;
      }
      if (msg.type === "setPackage") {
        const raw =
          typeof msg.package === "string" ? msg.package.trim() : "";
        if (!raw) {
          void this.applyPackageFilter(undefined);
          return;
        }
        if (!isValidPackageName(raw)) {
          void vscode.window.showErrorMessage(
            "Invalid package name. Use format com.example.app",
          );
          return;
        }
        void this.applyPackageFilter(raw);
      }
    });

    this.panel.onDidDispose(() => {
      if (!this.disposed) {
        this.dispose();
      }
    });

    this.startStream();
    this.postStreamState();
    void this.refreshPackageList(this.packageListFlag);
    this.postToWebview({
      type: "init",
      category: this.packageListFlag,
      package: this.context.packageName ?? "",
    });
  }

  private async refreshPackageList(flag: PackageListFlag): Promise<void> {
    this.packageListFlag = flag;
    try {
      const packages = await fetchPackageNames(this.adb, this.serial, flag);
      this.postToWebview({
        type: "packages",
        category: flag,
        packages,
        selected: this.context.packageName ?? "",
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      void vscode.window.showErrorMessage(`Package list: ${message}`);
      this.postToWebview({
        type: "packages",
        category: flag,
        packages: [],
        selected: this.context.packageName ?? "",
      });
    }
  }

  private async applyPackageFilter(packageName?: string): Promise<void> {
    this.context.packageName = packageName;
    this.context.appLabel = undefined;

    let pid: string | undefined;
    if (packageName) {
      pid = await resolvePackagePid(this.adb, this.serial, packageName);
      if (!pid) {
        void vscode.window.showWarningMessage(
          `No running process for ${packageName}. Showing device log until the app runs.`,
        );
      } else {
        this.context.appLabel = await resolveApplicationLabel(
          this.adb,
          this.serial,
          packageName,
        );
      }
    }

    this.logcatArgs = buildLogcatArgs({
      pid,
      level: this.context.adbLevel,
      extraTokens: this.context.extraTokens,
    });

    this.lines = [];
    this.flushLinesToWebview();
    this.syncPanelTitle();
    this.restartStreamWithCurrentArgs();
    this.postToWebview({
      type: "packageApplied",
      package: packageName ?? "",
      label: this.context.appLabel ?? "",
    });
  }

  private restartStreamWithCurrentArgs(): void {
    this.stopProcess();
    this.streamPaused = false;
    this.startStream();
    this.postStreamState();
  }

  private isStreamRunning(): boolean {
    return this.proc !== undefined;
  }

  private pauseStream(): void {
    this.stopProcess();
    this.streamPaused = true;
    this.postStreamState();
  }

  private resumeStream(): void {
    this.streamPaused = false;
    this.startStream();
    this.postStreamState();
  }

  private postStreamState(): void {
    this.postToWebview({
      type: "streamState",
      paused: this.streamPaused || !this.isStreamRunning(),
    });
  }

  private postToWebview(payload: unknown): void {
    if (!this.panel || this.disposed) {
      return;
    }
    void this.panel.webview.postMessage(payload);
  }

  private startStream(): void {
    const spawnArgs = withLogcatTailFromNow(this.logcatArgs);
    this.proc = this.adb.spawnWithStdout(spawnArgs, {
      serial: this.serial,
    });
    this.proc.stdout?.on("data", (chunk: Buffer) => {
      const text = chunk.toString("utf8");
      for (const line of text.split(/\r?\n/)) {
        if (!line) {
          continue;
        }
        this.lines.push(line);
        if (this.lines.length > MAX_LINES) {
          this.lines.shift();
        }
      }
      this.schedulePostLines();
    });
    this.proc.on("error", (err) => {
      void vscode.window.showErrorMessage(`Logcat: ${err.message}`);
    });
  }

  private stopProcess(): void {
    if (this.proc) {
      this.proc.kill();
      this.proc = undefined;
    }
  }

  private extractLogLevel(line: string): string | undefined {
    const threadtime = line.match(
      /\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\.\d+\s+\d+\s+\d+\s+([VDIWEF])\s/,
    );
    if (threadtime) {
      return threadtime[1];
    }
    const brief = line.match(/\s([VDIWEF])\s\w/);
    return brief?.[1];
  }

  private linePassesFilter(line: string): boolean {
    if (this.clientLevel === "all") {
      return true;
    }
    const lineLevel = this.extractLogLevel(line);
    if (!lineLevel) {
      return true;
    }
    const order = "VDIWEF";
    const minIdx = order.indexOf(this.clientLevel);
    const lineIdx = order.indexOf(lineLevel);
    if (minIdx < 0 || lineIdx < 0) {
      return true;
    }
    return lineIdx >= minIdx;
  }

  private getVisibleLines(): string[] {
    return this.lines.filter((l) => this.linePassesFilter(l));
  }

  private schedulePostLines(): void {
    this.postLinesPending = true;
    if (this.postLinesTimer) {
      return;
    }
    this.postLinesTimer = setTimeout(() => {
      this.postLinesTimer = undefined;
      if (this.postLinesPending) {
        this.postLinesPending = false;
        this.flushLinesToWebview();
      }
    }, POST_LINES_THROTTLE_MS);
  }

  private flushLinesToWebview(): void {
    this.postToWebview({
      type: "lines",
      lines: this.getVisibleLines(),
    });
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    if (this.postLinesTimer) {
      clearTimeout(this.postLinesTimer);
      this.postLinesTimer = undefined;
    }
    this.messageDisposable?.dispose();
    this.messageDisposable = undefined;
    this.stopProcess();
    const panel = this.panel;
    this.panel = undefined;
    if (panel) {
      panel.dispose();
    }
    if (LogcatPanel.current === this) {
      LogcatPanel.current = undefined;
    }
  }

  private getHtml(cspSource: string): string {
    const csp = [
      "default-src 'none'",
      `style-src ${cspSource} 'unsafe-inline'`,
      `script-src 'nonce-logcat' ${cspSource}`,
    ].join("; ");

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta http-equiv="Content-Security-Policy" content="${csp}" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<style>
  body { font-family: var(--vscode-font-family); background: var(--vscode-editor-background); color: var(--vscode-editor-foreground); margin: 0; padding: 8px; }
  .app-filters { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin-bottom: 8px; padding: 6px 8px; background: var(--vscode-editor-inactiveSelectionBackground); border-radius: 4px; }
  .app-filters label { display: flex; align-items: center; gap: 6px; font-size: 12px; }
  .app-filters select { min-width: 140px; max-width: 280px; }
  .package-row { display: flex; flex-direction: column; gap: 4px; flex: 1; min-width: 220px; max-width: 480px; }
  .package-row .package-controls { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
  #package-search { flex: 1; min-width: 160px; padding: 4px 8px; background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border, transparent); }
  #app-package { flex: 1; min-width: 160px; max-width: 100%; }
  #app-package.package-list-hidden { display: none; }
  #package-apply { flex-shrink: 0; }
  .toolbar { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 8px; align-items: center; }
  button, select { background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; padding: 4px 10px; cursor: pointer; }
  #log { font-family: var(--vscode-editor-font-family); font-size: 12px; white-space: pre-wrap; word-break: break-all; max-height: calc(100vh - 150px); overflow-y: auto; }
  .V { color: #888; } .D { color: #6a9fb5; } .I { color: #9cdcfe; } .W { color: #dcdcaa; } .E, .F { color: #f48771; }
</style>
</head>
<body>
  <div class="app-filters">
    <label>App list
      <select id="app-category">
        <option value="-3">User-installed apps</option>
        <option value="-s">System apps</option>
        <option value="">All apps</option>
      </select>
    </label>
    <div class="package-row">
      <span style="font-size:12px">Package</span>
      <div class="package-controls">
        <input type="search" id="package-search" placeholder="Search package name…" autocomplete="off" />
        <button type="button" id="package-apply">Apply</button>
      </div>
      <select id="app-package" class="package-list-hidden" size="6">
        <option value="">All packages (device log)</option>
      </select>
    </div>
  </div>
  <div class="toolbar">
    <label>Min level <select id="level">
      <option value="all">All</option>
      <option value="V">V</option>
      <option value="D">D</option>
      <option value="I">I</option>
      <option value="W">W</option>
      <option value="E">E</option>
      <option value="F">F</option>
    </select></label>
    <button type="button" id="clear">Clear</button>
    <button type="button" id="stream-toggle">Pause stream</button>
    <button type="button" id="copy">Copy</button>
  </div>
  <div id="log"></div>
  <script nonce="logcat">
    (function () {
      const api = acquireVsCodeApi();
      const logEl = document.getElementById('log');
      const levelEl = document.getElementById('level');
      const categoryEl = document.getElementById('app-category');
      const packageEl = document.getElementById('app-package');
      const packageSearchEl = document.getElementById('package-search');
      const packageApplyBtn = document.getElementById('package-apply');
      let loadingPackages = false;
      let allPackages = [];
      let selectedPackage = '';
      let hidePackageListTimer = null;

      function showPackageList() {
        if (hidePackageListTimer) {
          clearTimeout(hidePackageListTimer);
          hidePackageListTimer = null;
        }
        packageEl.classList.remove('package-list-hidden');
        refreshPackageListView();
      }

      function hidePackageListSoon() {
        if (hidePackageListTimer) {
          clearTimeout(hidePackageListTimer);
        }
        hidePackageListTimer = setTimeout(function () {
          if (document.activeElement !== packageSearchEl &&
              document.activeElement !== packageEl) {
            packageEl.classList.add('package-list-hidden');
          }
          hidePackageListTimer = null;
        }, 120);
      }

      function filterPackages(query) {
        const q = (query || '').trim().toLowerCase();
        if (!q) { return allPackages; }
        return allPackages.filter(function (p) {
          return p.toLowerCase().includes(q);
        });
      }

      function setPackageOptions(packages, selected) {
        packageEl.replaceChildren();
        const allOpt = document.createElement('option');
        allOpt.value = '';
        allOpt.textContent = 'All packages (device log)';
        packageEl.appendChild(allOpt);
        for (const pkg of packages) {
          const opt = document.createElement('option');
          opt.value = pkg;
          opt.textContent = pkg;
          packageEl.appendChild(opt);
        }
        if (selected && (selected === '' || packages.includes(selected))) {
          packageEl.value = selected;
        } else {
          packageEl.value = '';
        }
      }

      function refreshPackageListView() {
        const filtered = filterPackages(packageSearchEl.value);
        setPackageOptions(filtered, selectedPackage);
      }

      function applyPackageSelection() {
        const fromSelect = packageEl.value;
        const typed = (packageSearchEl.value || '').trim();
        let pkg = fromSelect;
        if (!pkg && typed) {
          const exact = allPackages.find(function (p) {
            return p === typed || p.toLowerCase() === typed.toLowerCase();
          });
          pkg = exact || typed;
        }
        api.postMessage({ type: 'setPackage', package: pkg });
      }

      categoryEl.addEventListener('change', function () {
        if (loadingPackages) { return; }
        loadingPackages = true;
        packageEl.disabled = true;
        packageSearchEl.disabled = true;
        packageApplyBtn.disabled = true;
        packageSearchEl.value = '';
        api.postMessage({ type: 'requestPackages', flag: categoryEl.value });
      });

      packageEl.addEventListener('change', function () {
        selectedPackage = packageEl.value;
        if (selectedPackage) {
          packageSearchEl.value = selectedPackage;
        }
        applyPackageSelection();
        packageEl.classList.add('package-list-hidden');
        packageSearchEl.blur();
      });

      packageSearchEl.addEventListener('focus', function () {
        showPackageList();
      });

      packageSearchEl.addEventListener('blur', function () {
        hidePackageListSoon();
      });

      packageEl.addEventListener('mousedown', function () {
        if (hidePackageListTimer) {
          clearTimeout(hidePackageListTimer);
          hidePackageListTimer = null;
        }
      });

      packageEl.addEventListener('blur', function () {
        hidePackageListSoon();
      });

      packageSearchEl.addEventListener('input', function () {
        showPackageList();
      });

      packageSearchEl.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          applyPackageSelection();
        }
      });

      packageApplyBtn.addEventListener('click', function () {
        applyPackageSelection();
        packageSearchEl.blur();
        hidePackageListSoon();
      });

      levelEl.addEventListener('change', function () {
        api.postMessage({ type: 'level', level: levelEl.value });
      });
      document.getElementById('clear').addEventListener('click', function () {
        api.postMessage({ type: 'clear' });
      });
      const streamBtn = document.getElementById('stream-toggle');
      function setStreamButton(paused) {
        streamBtn.textContent = paused ? 'Start stream' : 'Pause stream';
      }
      streamBtn.addEventListener('click', function () {
        api.postMessage({ type: 'toggleStream' });
      });
      document.getElementById('copy').addEventListener('click', function () {
        api.postMessage({ type: 'copy' });
      });

      function colorLine(line) {
        const m = line.match(/\\s([VDIWEF])\\s/);
        const cls = m ? m[1] : '';
        const span = document.createElement('div');
        if (cls) { span.className = cls; }
        span.textContent = line;
        return span;
      }

      window.addEventListener('message', function (event) {
        const msg = event.data;
        if (!msg || typeof msg.type !== 'string') { return; }
        if (msg.type === 'init') {
          categoryEl.value = msg.category || '-3';
          selectedPackage = msg.package || '';
          packageSearchEl.value = selectedPackage;
        }
        if (msg.type === 'packages' && Array.isArray(msg.packages)) {
          allPackages = msg.packages;
          selectedPackage = msg.selected || '';
          packageSearchEl.value = selectedPackage;
          refreshPackageListView();
          if (msg.category === categoryEl.value) {
            loadingPackages = false;
            packageEl.disabled = false;
            packageSearchEl.disabled = false;
            packageApplyBtn.disabled = false;
          }
        }
        if (msg.type === 'packageApplied') {
          selectedPackage = msg.package || '';
          packageEl.value = selectedPackage;
          if (selectedPackage) {
            packageSearchEl.value = selectedPackage;
          }
          packageEl.classList.add('package-list-hidden');
        }
        if (msg.type === 'streamState' && typeof msg.paused === 'boolean') {
          setStreamButton(msg.paused);
        }
        if (msg.type === 'lines' && Array.isArray(msg.lines)) {
          logEl.replaceChildren();
          for (const line of msg.lines) {
            logEl.appendChild(colorLine(String(line)));
          }
          logEl.scrollTop = logEl.scrollHeight;
        }
      });
    })();
  </script>
</body>
</html>`;
  }
}
