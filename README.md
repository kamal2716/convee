# Convee Desktop

A native, local-first desktop file converter built with Electron. Convee is a desktop application, not a hosted website. Files are processed on the user's computer; the app does not upload source files.

## Run locally

1. Install Node.js 20 or later.
2. Clone this repository and open a terminal in its directory.
3. Run:

```bash
npm install
npm start
```

Build packages:

```bash
npm run dist
npm run dist:win
```

Windows NSIS and portable artifacts are written to `release/`.

## Conversion architecture

- `src/formats/registry.js`: canonical extension catalogue.
- `src/engines/engine-manager.js`: discovers built-in, bundled and system engines.
- `src/engines/routes.js`: explicit input/output category and extension allow-lists.
- `src/engines/route-planner.js`: exposes only routes with an explicit adapter; reports missing engines separately.
- `src/engines/conversion-runner.js`: format-specific local execution adapters.
- `src/engines/data-converters.js`: typed CSV, TSV, JSON, XML, YAML and TOML readers/writers.
- `src/converter.js`: output naming, native image/PDF paths and shared route dispatch.

A format appearing in the catalogue does **not** mean every conversion involving it is supported. The route planner is deliberately conservative: a pair must have an explicit adapter and a required engine available before it is enabled.

## Implemented conversion groups

| Group | Current implementation |
|---|---|
| Raster images | Sharp for PNG, JPEG, WebP, AVIF and TIFF routes; ImageMagick can extend the set when installed |
| Text | TXT, Markdown and HTML basic conversions; Markdown-to-HTML uses Marked |
| Structured data | CSV, TSV, JSON, XML, YAML and TOML typed conversions |
| Office | LibreOffice adapter for explicitly allow-listed document, spreadsheet and presentation pairs |
| E-books | Calibre adapter for explicitly allow-listed EPUB/MOBI/AZW3/FB2-related routes |
| Video/audio | FFmpeg adapter with format-specific output codec maps and quality presets |
| Subtitles | FFmpeg SRT/ASS/SSA/VTT conversions |
| Archives | 7-Zip adapter for supported archive extraction/repacking pairs; RAR is read-only |
| PDF | Merge, split, selected-page extraction and PDF rewrite/optimization; Ghostscript improves image-aware compression |
| GIS | GDAL adapter for selected vector formats when installed |
| CAD | ODA File Converter adapter for DWG/DXF pairs when installed |
| 3D | Assimp and Blender adapters for selected mesh/model formats when installed |
| Fonts | FontForge adapter for selected outline-font formats when installed |

### Bundled runtime tools

- FFmpeg executable from `ffmpeg-static`.
- 7-Zip executable from `7zip-bin`.
- Sharp native image library.

The Windows package workflow unpacks these runtime binaries from Electron ASAR. Other specialist engines are optional local installs and are detected from PATH. They are not silently downloaded or installed.

### Optional specialist engines

| Engine | Used for |
|---|---|
| LibreOffice | Office documents, spreadsheets and presentations |
| Pandoc | Rich document conversions |
| Calibre | E-books |
| pyhwp (`hwp5odt`) | Legacy HWP to ODT |
| ImageMagick | Extended image and PDF raster routes |
| Ghostscript | PDF compression |
| GDAL | GIS/vector datasets |
| ODA File Converter | DWG/DXF |
| Assimp / Blender | 3D models |
| FontForge | Font conversion |

## Desktop features

- Native file picker and drag/drop queue.
- Batch conversion and recent conversion history.
- Global modifier + drag floating format donut (native input hook; operating-system testing is still required).
- Visual drag-to-select image crop and export.
- PDF merge, split and page extraction.
- Persistent watch-folder rules, restored when Convee starts.
- Balanced, smaller-file and high-quality media presets.
- Navy/cream themes and editable RGB/hex palette controls.

## Known limitations — not a complete 270-format matrix yet

The screenshot's format inventory is broader than the currently implemented adapters. In particular, these are not yet verified as complete:
- HWP/HWPX, Apple Pages/Keynote/Numbers and several legacy office formats.
- RAW camera formats and specialist image/vector formats.
- All video/audio codecs and subtitle variants listed in the inventory.
- Archive types beyond the tested 7-Zip route set; RAR creation is not supported.
- GIS conversions that need multi-file Shapefile sidecars, coordinate reference transformations or raster pipelines.
- DGN, complex DWG features, and CAD/3D STEP/IGES workflows.
- Font collections and bitmap fonts.
- OCR, PDF-to-editable-document fidelity and every PDF page-rendering path.

Some engines may reject particular files even when a route is enabled (for example, an ImageMagick build may disable PDF delegates). Such failures must be surfaced to the user; they must not produce a success message for an invalid or missing output.

## Testing and packaging

The test suite uses real temporary fixtures for:
- CSV/JSON/YAML/XML/TOML conversion.
- PDF merge and selected-page extraction.
- Raster image crop dimensions.
- Markdown-to-HTML output.
- Route availability and unsupported-pair rejection.

GitHub Actions runs the Node test suite and a Windows packaging workflow. A successful CI package confirms the build can be produced on a Windows runner; it is not a substitute for manual testing on a physical Windows PC, especially for the global mouse hook, overlay placement, file dialogs and installer behavior.

## Security

- Renderer Node integration is disabled.
- Context isolation and sandbox are enabled.
- File access is exposed through a narrow preload API.
- Conversions run locally.

## Appearance customization

Convee opens with a navy, cream and coral palette. Settings include full-spectrum colour pickers, RGB/hex entry, live preview, donut opacity and cream/navy themes. Preferences are saved in the app's local user-data folder.

## License

MIT.

## Additional desktop tools

- **Exact duplicate finder:** scans a chosen folder locally, groups byte-identical files by SHA-256, estimates reclaimable space, and lets you reveal files for manual review. It never deletes files.
- **Image metadata inspector:** reports image dimensions, colour space, alpha, page count, and presence of EXIF, ICC, IPTC and XMP metadata.
- **Metadata-free image export:** writes a separate copy without carrying embedded metadata. Animated and multi-page images are explicitly rejected by this tool to avoid accidental frame loss.
- **Batch conversion queue:** processes files with a bounded worker pool, shows progress and per-file failures, and lets the user stop files that have not started. Active conversions finish safely.
- **History controls:** export the local conversion history to CSV or clear the history without deleting converted output files.
- **Smart format picks:** highlights a preferred output where Convee has a configured route; recommendations are heuristics, not guarantees of lossless conversion.

