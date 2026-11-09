# Convee product vision and engine architecture

## Product goal

Convee is an offline-first, local-first desktop conversion workspace. It aims to provide the breadth of Filee while making conversion setup, batch workflows, reliability, privacy, accessibility, and advanced file operations substantially better.

Convee must never advertise a conversion merely because an extension appears in a list. A route is available only when the installed engine reports that it can decode the input, encode the output, and the route has an execution adapter and passing fixture coverage.

## Product principles

1. **No manual dependency hunting.** Users should not need to find, install, configure, or update ImageMagick, FFmpeg, LibreOffice, Calibre, Pandoc, GDAL, Blender, 7-Zip, Ghostscript, or specialist tools themselves.
2. **Local by default.** File bytes remain on the user's machine. No account or cloud upload is required for conversion.
3. **Honest support.** Separate format recognition, decode support, encode support, route availability, automated fixture coverage, and verified platform coverage.
4. **Safe conversion.** Treat inputs as untrusted; isolate subprocesses, apply resource/time limits, validate outputs, prevent path traversal, and never execute scripts embedded in files.
5. **Predictable results.** Preserve metadata when possible, expose lossy operations, report what changed, and never silently overwrite originals.
6. **Accessible workflows.** Keyboard-first operation, screen-reader labels, high contrast, reduced motion, and localization.
7. **Extensible engines.** A new codec or converter is an adapter registered through a stable manifest and capability interface, not scattered conditionals.

## Filee parity baseline

Build and verify parity for the documented Filee workflows and categories:

- Cursor/drop-zone conversion workflow and relevant-format filtering
- Per-file-type toolbars/profiles and presets
- Crop workflow
- Multi-file batch conversion and multi-step route planning
- Watch folders
- Recent conversion history with open/reveal actions
- Home drop zone and queued file list
- Context menu, keyboard shortcut, drag/drop, and CLI entry points
- Light/dark themes, accent and opacity customization, localization
- Images, vector formats, PDF, office documents, spreadsheets, presentations, HWP/HWPX, text/markup, e-books, video, audio, subtitles, archives, CAD, fonts, structured data, 3D, and geospatial data
- Engine management, update notifications, settings, privacy controls, and offline behavior

Parity is a roadmap, not a claim that the current Convee branch already implements all these items. Each feature must have acceptance tests.

## Engine packaging strategy

A single installer containing every optional codec and specialist engine may become several gigabytes and may include licences or redistribution constraints that differ by platform. Therefore provide two supported installation modes:

### Full offline installer
- Includes all engines and language/model resources that can legally be redistributed.
- Works without internet after installation.
- Clearly reports any formats that cannot be bundled due to licence, patent, platform, or vendor restrictions.

### Compact installer with managed engine packs
- Includes core engines and a signed engine manager.
- Downloads a required engine pack automatically when the user first chooses a conversion that needs it, after clear consent and size disclosure.
- Downloads only from pinned official release URLs; verifies SHA-256/signature; stages and atomically activates the pack; supports rollback and updates.
- Never asks the user to search for a package or run a third-party installer.
- Offers a setting to pre-download all available packs for offline use.

Engine packs must be versioned, platform/architecture-specific, reproducible, and accompanied by third-party notices, source links, licence files, checksums, and build provenance. The engine manager must not execute arbitrary downloaded scripts.

## Engine architecture

### Core services
- Format registry: extension, MIME, sniffers, aliases, magic signatures, multi-file sidecars, animation/vector/page properties.
- Capability registry: decoder/encoder availability by engine build, platform, and version.
- Route planner: direct and multi-step routes, quality/loss policy, estimated size/time, required engine packs.
- Job scheduler: bounded parallelism, cancellation, pause/resume where supported, priorities, resource budgets.
- Conversion pipeline: inspect -> plan -> preview/options -> execute in isolated worker -> validate -> write atomically -> history.
- Metadata service: EXIF/IPTC/XMP, color profiles, orientation, timestamps, document properties.
- Preset/profile service: per-format profiles, named presets, remembered settings.
- Engine manager: install/update/remove/repair, pack verification, offline cache, licence notices.
- Diagnostics: actionable errors, logs with paths redacted by default, exportable support bundle.

### Adapter contract
Every engine adapter must declare:
- engine id, version, platforms, architectures, licence, source, redistribution status
- supported input decoders and output encoders, queried from the actual build where possible
- operation support (crop, resize, rotate, pages, animation, metadata, OCR, etc.)
- resource limits, known limitations, and security notes
- executable/library location supplied by the engine manager
- deterministic health probe and a real fixture test

Every conversion route must declare:
- source and destination formats
- engine and operation sequence
- lossless/lossy behavior and default quality
- metadata and animation behavior
- preconditions and output validator
- fixture files and expected properties

### Initial engine families
- Images: Sharp/libvips for common raster, ImageMagick for broad raster where delegates are enabled, plus specialist readers for RAW, HEIC/HEIF, SVG/vector, DICOM/FITS, PSD/PSB, OpenEXR and platform-specific formats.
- Video/audio/subtitles: FFmpeg build with an explicit codec/delegate manifest and legal redistribution review.
- Office/PDF: LibreOffice and dedicated PDF tooling; OCR and rendering packs separately licensed and tested.
- E-books: Calibre components only where redistribution terms permit.
- Archives: 7-Zip or compatible library with safe extraction rules; extraction-only formats clearly identified.
- CAD/3D: ODA/LibreCAD/Assimp/Blender or alternatives, subject to licence and format restrictions.
- GIS: GDAL/PROJ with bundled data files and verified drivers.
- Fonts: FontForge or other compatible font tooling, with font metadata and embedding restrictions respected.
- Text/data: in-process parsers for safe, deterministic transformations.

## Differentiators beyond Filee

### Conversion intelligence
- Explain the best route and why it was selected.
- Offer "smallest file", "best quality", "balanced", "lossless", and "keep metadata" goals.
- Estimate output size and time using local history.
- Warn when a conversion is lossy, unsupported, or may flatten layers/animation/pages.
- Suggest the best target format based on use: web, print, archive, sharing, editing, mobile, or accessibility.
- Compare output quality/size before committing where preview is possible.

### Preview and editing
- Before/after image preview with zoom and split view.
- Crop with aspect-ratio presets, rotation, straightening, and batch crop.
- Resize by pixels, percentage, physical dimensions, DPI, and social/web presets.
- Image compression preview and metadata inspector/removal controls.
- PDF page thumbnails, reorder, rotate, merge, split, watermark, redact, OCR and optimize.
- Video trim, rotate, subtitle preview, audio extraction, contact sheets, and codec details.
- Archive browser with selective extraction and duplicate detection.

### Productivity
- Multi-step conversion pipelines and reusable workflows.
- Watched folders with rules, naming templates, and collision policies.
- Hot folders, clipboard conversion, Explorer/Finder context menus.
- CLI with JSON output and automation-friendly exit codes.
- Queue pause/resume/cancel, per-file retry, failure isolation, and batch reports.
- Duplicate detection using hashes and optional perceptual matching.
- Bulk rename, folder structure preservation, and output templates.

### Privacy, trust and safety
- No account required and no telemetry by default.
- Explicit opt-in for anonymous diagnostics; redact filenames and paths.
- Local file processing indicator and visible engine activity.
- Malware-aware archive extraction limits and path traversal protection.
- Sandboxed subprocesses, network disabled for conversion workers, strict temp-folder cleanup.
- Secure deletion option with realistic filesystem caveats.
- Content never used to train models; no cloud AI by default.

### Accessibility and internationalization
- Keyboard navigation and complete shortcuts.
- Screen reader semantics and focus management.
- High-contrast themes, reduced motion, scalable typography.
- Locale-aware numbers, dates, file-size units, RTL layout, translated help.
- Keep format names and technical terms unambiguous across translations.

## Release gates

A feature is not complete until:
1. It has an explicit route and actual engine capability.
2. At least one representative real fixture passes on each supported platform.
3. Output can be reopened/decoded and its properties are checked.
4. Failure, cancellation, corrupt input, large input, and overwrite cases are tested.
5. The installer includes or manages all required runtime components.
6. Third-party notices and licence review are complete.
7. The UI accurately describes limitations and lossy behavior.

## Milestones

1. **Foundation:** registry, engine manifests, route/capability model, worker isolation, engine manager, licence inventory, tests.
2. **Filee parity core:** image, PDF, office, media, archives, text/data, queue, history, presets, crop, watch folders.
3. **Specialist parity:** HWP, e-books, CAD, GIS, fonts, 3D, vector, scientific and camera formats.
4. **Differentiation:** smart route advisor, preview/compare, workflow builder, automation, advanced batch tools.
5. **Release quality:** signed reproducible installers, offline pack, auto-updater, accessibility, localization, security review, real Windows/macOS/Linux testing.

## Current status

This document describes the intended product and architecture. It does not imply that the current codebase already implements Filee parity. Track each format pair and feature separately as planned, implemented, fixture-tested, and platform-verified.
