import * as vscode from "vscode";

const CHANNEL_NAME = "ADB Toolkit";

let channel: vscode.OutputChannel | undefined;

export function getOutputChannel(): vscode.OutputChannel {
  if (!channel) {
    channel = vscode.window.createOutputChannel(CHANNEL_NAME);
  }
  return channel;
}

export function log(message: string): void {
  const ch = getOutputChannel();
  const line = `[${new Date().toISOString()}] ${message}`;
  ch.appendLine(line);
}

export function logCommand(detail: string): void {
  log(`> ${detail}`);
}

export function showOutput(): void {
  getOutputChannel().show(true);
}
