# Electron Extension Installer

[![npm Version](https://img.shields.io/npm/v/electron-extension-installer.svg)](https://www.npmjs.com/package/electron-extension-installer) [![License](https://img.shields.io/npm/l/electron-extension-installer.svg)](https://www.npmjs.com/package/electron-extension-installer)

# Introduction

This library is a modernized version of `electron-devtools-installer` for Electron 36 and newer.

# Getting Started

```
yarn add electron-extension-installer
```

or

```
npm i --save electron-extension-installer
```

# Usage

```typescript
import { installExtension, REACT_DEVELOPER_TOOLS } from "electron-extension-installer";

app.on("ready", async () => {
  await installExtension(REACT_DEVELOPER_TOOLS, {
    loadExtensionOptions: {
      allowFileAccess: true,
    },
  });
});
```
