---
name: Expo DevTools environment warning
description: Distinguishing an optional desktop debugger failure from an Expo application startup failure.
---

Expo's desktop React Native DevTools installer may report a missing
`libglib-2.0.so.0` in this container even while Metro opens its port and serves
bundles normally.

**Why:** The desktop debugger executable needs system GUI libraries that are
not part of the current container. The observed failure did not stop Metro.

**How to apply:** Check the workflow's listening state and bundle/error logs
before treating this warning as an app crash. Do not repeatedly restart or
change application code solely to resolve the optional debugger warning.
