# Changelog

All notable changes to the AI Coding Command Center are documented here.
Format loosely follows [Keep a Changelog](https://keepachangelog.com/).

## [0.0.19]

### Added
- **Skill name & tool context in the trace view** — session trace rows now show a
  subdued `Skill | <name>` (or tool-argument) segment next to the span label,
  mirroring the native Dynatrace distributed-tracing style. Skill spans surface the
  invoked skill; other tool rows surface their most identifying argument (command,
  file, URL, query, or pattern) without needing to open each span.
