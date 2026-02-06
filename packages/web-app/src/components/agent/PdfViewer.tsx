import { useEffect, useRef, useState, useImperativeHandle, forwardRef } from "react";
import * as pdfjsLib from "pdfjs-dist";
import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist";

// Set up PDF.js worker
// Use local worker file (copied by webpack) for better reliability
if (typeof window !== "undefined") {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
  } catch (workerError) {
    console.warn('Failed to set PDF.js worker, using default:', workerError);
    // Fallback to CDN worker if local one fails
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
  }
}

export interface HighlightBox {
  x: number;
  y: number;
  width: number;
  height: number;
  pageWidth: number;
  pageHeight: number;
  pageNumber?: number;
}

interface PdfViewerProps {
  filePath?: string;
  fileBuffer?: ArrayBuffer;
  pageNumber?: number;
  highlight?: HighlightBox | null;
  highlightText?: string;
  scale?: number;
}

export interface PdfViewerRef {
  scrollToHighlight: (highlight: HighlightBox) => void;
}

const PdfViewer = forwardRef<PdfViewerRef, PdfViewerProps>(
  ({ filePath, fileBuffer, pageNumber = 1, highlight, highlightText, scale = 1.2 }, ref) => {
    const canvasWrapperRef = useRef<HTMLDivElement>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [status, setStatus] = useState<string>("Initializing...");
    const [progress, setProgress] = useState({ current: 0, total: 0 });
    const pdfDocRef = useRef<PDFDocumentProxy | null>(null);
    const isUnmountedRef = useRef(false);
    const currentOverlayRef = useRef<HTMLCanvasElement | null>(null);
    const currentOverlayInfoRef = useRef<{ pageIndex: number; highlight: HighlightBox } | null>(
      null
    );

    // Round rect path helper
    const roundRectPath = (
      ctx: CanvasRenderingContext2D,
      x: number,
      y: number,
      w: number,
      h: number,
      r: number
    ) => {
      const radius = Math.min(r, h / 2, w / 2);
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.arcTo(x + w, y, x + w, y + h, radius);
      ctx.arcTo(x + w, y + h, x, y + h, radius);
      ctx.arcTo(x, y + h, x, y, radius);
      ctx.arcTo(x, y, x + w, y, radius);
      ctx.closePath();
    };

    // Create canvas helper
    const createCanvas = (width: number, height: number) => {
      const cnv = document.createElement("canvas");
      cnv.width = Math.round(width);
      cnv.height = Math.round(height);
      cnv.style.width = Math.round(width) + "px";
      cnv.style.height = Math.round(height) + "px";
      cnv.style.display = "block";
      cnv.style.margin = "12px auto";
      cnv.style.boxShadow = "0 2px 6px rgba(0,0,0,0.08)";
      cnv.style.background = "#fff";
      cnv.style.maxWidth = "100%";
      // Ensure canvas is visible
      cnv.style.visibility = "visible";
      cnv.style.opacity = "1";
      return cnv;
    };

    // Draw soft multi-line highlight
    const drawSoftMultiLineHighlightToCtx = (
      ctx: CanvasRenderingContext2D,
      highlightBox: HighlightBox,
      viewport: { width: number; height: number; scale?: number }
    ) => {
      if (!highlightBox || !viewport) return;

      const scaleX = viewport.width / (highlightBox.pageWidth || viewport.width);
      const scaleY = viewport.height / (highlightBox.pageHeight || viewport.height);

      const x = (highlightBox.x || 0) * scaleX;
      const y = (highlightBox.y || 0) * scaleY;
      let w = (highlightBox.width || 0) * scaleX;
      let hh = (highlightBox.height || 0) * scaleY;

      // Use a full-paragraph highlight (full width with side margins)
      const paragraphMargin = Math.max(12, viewport.width * 0.05);
      w = Math.max(40, viewport.width - paragraphMargin * 2);

      // If no usable height, fall back to a readable band height
      if (hh <= 0) {
        hh = Math.max(18, viewport.height * 0.04);
      }

      const approxLine = 18 * (viewport.scale || 1);
      const lines = Math.max(1, Math.round(hh / approxLine));
      const gap = Math.min(6, Math.max(3, Math.floor((hh / Math.max(1, lines)) * 0.08)));
      const lineH = (hh - (lines - 1) * gap) / lines;

      const fill = "rgba(255, 235, 59, 0.45)";
      const stroke = "rgba(255, 193, 7, 0.65)";

      ctx.save();
      ctx.fillStyle = fill;
      ctx.strokeStyle = stroke;
      ctx.lineWidth = Math.max(1.1, Math.min(viewport.width, viewport.height) * 0.0022);

      for (let i = 0; i < lines; i++) {
        const yy = y + i * (lineH + gap);
        const hLine = Math.max(10, lineH);
        roundRectPath(ctx, paragraphMargin, yy, Math.max(6, w), hLine, 6);
        ctx.fill();
      }
      ctx.restore();
    };

    const buildHighlightFromText = async (
      page: PDFPageProxy,
      viewport: { width: number; height: number; convertToViewportPoint: (x: number, y: number) => [number, number] },
      text: string,
      targetPageNumber: number
    ): Promise<HighlightBox | null> => {
      const trimmed = (text || "").trim();
      if (!trimmed) return null;

      const content = await page.getTextContent();
      const items = (content.items || []) as Array<{
        str?: string;
        transform?: number[];
        width?: number;
        height?: number;
      }>;

      if (!items.length) return null;

      // Build normalized text and index ranges per item
      const ranges: Array<{ start: number; end: number; itemIndex: number }> = [];
      let normalized = "";

      items.forEach((item, idx) => {
        const raw = (item.str || "").replace(/\s+/g, " ").trim();
        if (!raw) return;
        if (normalized.length > 0) normalized += " ";
        const start = normalized.length;
        normalized += raw.toLowerCase();
        const end = normalized.length;
        ranges.push({ start, end, itemIndex: idx });
      });

      const needle = trimmed.replace(/\s+/g, " ").toLowerCase();
      let matchedIndices: number[] = [];

      if (needle) {
        const matchIndex = normalized.indexOf(needle);
        if (matchIndex >= 0) {
          const matchEnd = matchIndex + needle.length;
          matchedIndices = ranges
            .filter((r) => r.end >= matchIndex && r.start <= matchEnd)
            .map((r) => r.itemIndex);
        }
      }

      if (!matchedIndices.length) {
        const words = needle.split(/\W+/).filter((w) => w.length > 2);
        if (words.length) {
          matchedIndices = items
            .map((item, idx) => ({ item, idx }))
            .filter(({ item }) => {
              const str = (item.str || "").toLowerCase();
              return words.some((w) => str.includes(w));
            })
            .map(({ idx }) => idx);
        }
      }

      if (!matchedIndices.length) return null;

      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;

      matchedIndices.forEach((idx) => {
        const item = items[idx];
        const transform = item.transform || [1, 0, 0, 1, 0, 0];
        const x = transform[4] || 0;
        const y = transform[5] || 0;
        const width = item.width || 0;
        const height = item.height || Math.abs(transform[3] || 0);

        const [vx1, vy1] = viewport.convertToViewportPoint(x, y);
        const [vx2, vy2] = viewport.convertToViewportPoint(x + width, y + height);

        minX = Math.min(minX, vx1, vx2);
        maxX = Math.max(maxX, vx1, vx2);
        minY = Math.min(minY, vy1, vy2);
        maxY = Math.max(maxY, vy1, vy2);
      });

      if (!isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY)) return null;

      return {
        x: minX,
        y: minY,
        width: Math.max(1, maxX - minX),
        height: Math.max(1, maxY - minY),
        pageWidth: viewport.width,
        pageHeight: viewport.height,
        pageNumber: targetPageNumber,
      };
    };

    // Create overlay on canvas
    const createOverlayOnCanvas = (
      targetCanvas: HTMLCanvasElement,
      highlightBox: HighlightBox,
      viewport: { width: number; height: number; scale?: number }
    ) => {
      removeCurrentOverlay();
      if (!targetCanvas) return null;

      const wrapper = canvasWrapperRef.current;
      if (!wrapper) return null;

      wrapper.style.position = wrapper.style.position || "relative";

      const ov = document.createElement("canvas");
      ov.width = targetCanvas.width;
      ov.height = targetCanvas.height;
      ov.style.width = targetCanvas.style.width;
      ov.style.height = targetCanvas.style.height;
      ov.style.position = "absolute";
      ov.style.pointerEvents = "none";
      ov.style.left = targetCanvas.offsetLeft + "px";
      ov.style.top = targetCanvas.offsetTop + "px";
      ov.style.zIndex = "2200";

      wrapper.appendChild(ov);

      const octx = ov.getContext("2d");
      if (octx) {
        octx.clearRect(0, 0, ov.width, ov.height);
        drawSoftMultiLineHighlightToCtx(octx, highlightBox, viewport);
      }

      currentOverlayRef.current = ov;
      return ov;
    };

    const removeCurrentOverlay = () => {
      if (currentOverlayRef.current && currentOverlayRef.current.parentNode) {
        currentOverlayRef.current.parentNode.removeChild(currentOverlayRef.current);
        currentOverlayRef.current = null;
        currentOverlayInfoRef.current = null;
      }
    };

    // Render all pages
    const renderAllPages = async (activeHighlight: HighlightBox | null) => {
      setLoading(true);
      setError(null);
      setStatus("Loading PDF document...");
      setProgress({ current: 0, total: 0 });
      removeCurrentOverlay();

      if (!fileBuffer && !filePath) {
        setLoading(false);
        return;
      }

      try {
        let data: Uint8Array;
        if (fileBuffer) {
          setStatus("Processing PDF data...");
          try {
            const bufferCopy = fileBuffer.slice(0);
            data = new Uint8Array(bufferCopy);
          } catch (bufferError) {
            console.warn("PDF buffer is detached or invalid, attempting to reload from filePath.", bufferError);
            if (filePath) {
              const response = await fetch(filePath);
              const arrayBuffer = await response.arrayBuffer();
              data = new Uint8Array(arrayBuffer);
            } else {
              throw new Error("PDF buffer is no longer available. Please reopen the source.");
            }
          }
        } else if (filePath) {
          setStatus("Downloading PDF...");
          // Fetch file if filePath provided
          const response = await fetch(filePath);
          const arrayBuffer = await response.arrayBuffer();
          data = new Uint8Array(arrayBuffer);
        } else {
          throw new Error("No file buffer or path provided");
        }

        setStatus("Parsing PDF structure...");
        
        // Check worker status
        if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
          console.warn('PDF.js worker not configured, attempting to set default');
          pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
        }
        
        // Add timeout for PDF parsing (30 seconds)
        const parseTimeout = new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(new Error("PDF parsing timed out after 30 seconds. The PDF may be corrupted, too complex, or the worker failed to load."));
          }, 30000);
        });
        
        let loadingTask;
        try {
          setStatus("Initializing PDF parser...");
          loadingTask = pdfjsLib.getDocument({ 
            data,
            // Add error handling options
            stopAtErrors: false,
            maxImageSize: 1024 * 1024 * 10, // 10MB max image size
            verbosity: 0, // Reduce logging
            useSystemFonts: false, // Disable system fonts for faster parsing
            disableFontFace: false,
          });
          
          // Listen to progress events if available
          if (loadingTask.onProgress) {
            loadingTask.onProgress = (progress: { loaded: number; total: number }) => {
              if (progress.total > 0) {
                const percent = Math.round((progress.loaded / progress.total) * 100);
                setStatus(`Parsing PDF structure... ${percent}%`);
              } else {
                setStatus(`Parsing PDF structure... (${progress.loaded} bytes loaded)`);
              }
            };
          }
        } catch (parseError) {
          const errorMsg = parseError instanceof Error ? parseError.message : 'Unknown error';
          console.error('PDF parser initialization error:', parseError);
          throw new Error(`Failed to initialize PDF parser: ${errorMsg}. Check browser console for details.`);
        }
        
        let pdfDoc: PDFDocumentProxy;
        try {
          setStatus("Parsing PDF document structure...");
          pdfDoc = await Promise.race([
            loadingTask.promise,
            parseTimeout
          ]) as PDFDocumentProxy;
        } catch (raceError) {
          if (raceError instanceof Error && raceError.message.includes('timed out')) {
            console.error('PDF parsing timeout');
            throw raceError;
          }
          const errorMsg = raceError instanceof Error ? raceError.message : 'Unknown error';
          console.error('PDF parsing error:', raceError);
          throw new Error(`PDF parsing failed: ${errorMsg}. The PDF may be corrupted or incompatible.`);
        }
        
        pdfDocRef.current = pdfDoc;
        
        if (!pdfDoc || typeof pdfDoc.numPages !== 'number') {
          throw new Error("Failed to parse PDF: Invalid document structure");
        }
        
        const pageCount = pdfDoc.numPages;
        if (pageCount === 0) {
          throw new Error("PDF has no pages");
        }
        
        setStatus(`PDF parsed successfully. Found ${pageCount} page${pageCount !== 1 ? 's' : ''}.`);

        const wrapper = canvasWrapperRef.current;
        if (!wrapper) return;
        wrapper.innerHTML = "";

        // If we have a highlight, prioritize rendering that page first
        const targetPage = activeHighlight?.pageNumber || pageNumber || 1;
        const totalPages = pdfDoc.numPages;
        setProgress({ current: 0, total: totalPages });
        
        // Render target page first if we have a highlight
        if (activeHighlight && targetPage <= totalPages) {
          setStatus(`Rendering page ${targetPage} of ${totalPages}...`);
          const page = await pdfDoc.getPage(targetPage);
          const viewport = page.getViewport({ scale });
          const cnv = createCanvas(viewport.width, viewport.height);
          (cnv as any)._pdfViewport = viewport;
          (cnv as any)._pageNumber = targetPage;
          cnv.setAttribute('data-page', targetPage.toString());
          const ctx = cnv.getContext("2d");
          if (ctx) {
            setStatus(`Drawing page ${targetPage}...`);
            await page.render({ canvasContext: ctx, viewport }).promise;
          }
          wrapper.appendChild(cnv);
          setProgress({ current: 1, total: totalPages });
          
          // Verify canvas was added
          const addedCanvas = wrapper.querySelector(`canvas[data-page="${targetPage}"]`);
          if (!addedCanvas) {
            console.error('Failed to add canvas to wrapper');
          } else {
            console.log('Target page rendered:', targetPage, 'Canvas dimensions:', cnv.width, 'x', cnv.height);
          }
          
          // Mark as loaded so user can see the highlighted page
          setLoading(false);
          
          // Show highlight immediately after a brief delay to ensure canvas is in DOM
          setTimeout(() => {
            const canvasInDom = wrapper.querySelector(`canvas[data-page="${targetPage}"]`);
            if (canvasInDom && activeHighlight) {
              scrollAndOverlay(activeHighlight);
            }
            if (totalPages > 20) {
              setStatus(`Page ${targetPage} ready. Scroll to load more pages automatically.`);
            } else {
              setStatus(`Page ${targetPage} ready. Loading remaining pages...`);
            }
          }, 100);
        } else {
          // No highlight - render first page quickly
          setStatus(`Rendering page 1 of ${totalPages}...`);
          const firstPage = await pdfDoc.getPage(1);
          const viewport = firstPage.getViewport({ scale });
          const cnv = createCanvas(viewport.width, viewport.height);
          (cnv as any)._pdfViewport = viewport;
          (cnv as any)._pageNumber = 1;
          cnv.setAttribute('data-page', '1');
          const ctx = cnv.getContext("2d");
          if (ctx) {
            setStatus("Drawing page 1...");
            await firstPage.render({ canvasContext: ctx, viewport }).promise;
          }
          wrapper.appendChild(cnv);
          setProgress({ current: 1, total: totalPages });
          
          // Verify canvas was added
          const addedCanvas = wrapper.querySelector('canvas[data-page="1"]');
          if (!addedCanvas) {
            console.error('Failed to add first page canvas to wrapper');
          } else {
            console.log('First page rendered. Canvas dimensions:', cnv.width, 'x', cnv.height);
          }
          
          setLoading(false);
          
          setTimeout(() => {
            if (highlightText) {
              buildHighlightFromText(firstPage, viewport as any, highlightText, 1)
                .then((derived) => {
                  if (derived) {
                    scrollAndOverlay(derived);
                  }
                })
                .catch((err) => {
                  console.warn("Failed to build highlight from text:", err);
                });
            }
            if (totalPages > 20) {
              setStatus(`Page 1 ready. Scroll to load more pages automatically.`);
            } else {
              setStatus(`Page 1 ready. Loading remaining pages...`);
            }
          }, 100);
        }

        // For large PDFs (>20 pages), use lazy loading - only render pages around target
        const alreadyRendered = activeHighlight ? targetPage : 1;
        
        if (totalPages > 20) {
          // Large PDF - render only pages around target page, then lazy load on scroll
          setStatus(`Large PDF (${totalPages} pages). Rendering pages around target...`);
          
          const RENDER_WINDOW = 5; // Render 5 pages before and after target
          const startPage = Math.max(1, alreadyRendered - RENDER_WINDOW);
          const endPage = Math.min(totalPages, alreadyRendered + RENDER_WINDOW);
          
          const renderPageRange = async (start: number, end: number) => {
            let renderedCount = 1;
            for (let p = start; p <= end; p++) {
              if (isUnmountedRef.current) return;
              if (p === alreadyRendered) continue;
              
              const existingCanvas = wrapper.querySelector(`canvas[data-page="${p}"]`);
              if (existingCanvas) {
                renderedCount++;
                continue;
              }
              
              try {
                const page = await pdfDoc.getPage(p);
                const viewport = page.getViewport({ scale });
                const cnv = createCanvas(viewport.width, viewport.height);
                (cnv as any)._pdfViewport = viewport;
                (cnv as any)._pageNumber = p;
                cnv.setAttribute('data-page', p.toString());
                
                const ctx = cnv.getContext("2d");
                if (ctx) {
                  await page.render({ canvasContext: ctx, viewport }).promise;
                }
                
                // Insert at correct position - find where to insert based on page number
                const existingCanvases = Array.from(wrapper.querySelectorAll('canvas[data-page]'));
                let inserted = false;
                
                for (let i = 0; i < existingCanvases.length; i++) {
                  const existingPageNum = parseInt(existingCanvases[i].getAttribute('data-page') || '0');
                  if (p < existingPageNum) {
                    wrapper.insertBefore(cnv, existingCanvases[i]);
                    inserted = true;
                    break;
                  }
                }
                
                if (!inserted) {
                  wrapper.appendChild(cnv);
                }
                
                renderedCount++;
                await new Promise(resolve => setTimeout(resolve, 10));
              } catch (pageError) {
                console.warn(`Failed to render page ${p}:`, pageError);
              }
            }
            return renderedCount;
          };
          
          setTimeout(async () => {
            const count = await renderPageRange(startPage, endPage);
            setStatus(`Rendered ${count} pages. Scroll to load more automatically.`);
            // Clear status after showing message
            setTimeout(() => {
              if (!isUnmountedRef.current) {
                setStatus("");
              }
            }, 3000);
            
            // Set up intersection observer for lazy loading as user scrolls
            const observer = new IntersectionObserver((entries) => {
              entries.forEach(entry => {
                if (entry.isIntersecting) {
                  const canvas = entry.target as HTMLCanvasElement;
                  const pageNum = parseInt(canvas.getAttribute('data-page') || '0');
                  
                  // Load adjacent pages that aren't loaded yet
                  const pagesToLoad = [
                    pageNum - 1,
                    pageNum + 1,
                    pageNum - 2,
                    pageNum + 2,
                  ].filter(p => p >= 1 && p <= totalPages);
                  
                  pagesToLoad.forEach(async (p) => {
                    const existing = wrapper.querySelector(`canvas[data-page="${p}"]`);
                    if (existing) return;
                    
                    try {
                      const page = await pdfDoc.getPage(p);
                      const viewport = page.getViewport({ scale });
                      const cnv = createCanvas(viewport.width, viewport.height);
                      (cnv as any)._pdfViewport = viewport;
                      (cnv as any)._pageNumber = p;
                      cnv.setAttribute('data-page', p.toString());
                      
                      const ctx = cnv.getContext("2d");
                      if (ctx) {
                        await page.render({ canvasContext: ctx, viewport }).promise;
                      }
                      
                      // Insert at correct position - find where to insert based on page number
                      const existingCanvases = Array.from(wrapper.querySelectorAll('canvas[data-page]'));
                      let inserted = false;
                      
                      for (let i = 0; i < existingCanvases.length; i++) {
                        const existingPageNum = parseInt(existingCanvases[i].getAttribute('data-page') || '0');
                        if (p < existingPageNum) {
                          wrapper.insertBefore(cnv, existingCanvases[i]);
                          inserted = true;
                          break;
                        }
                      }
                      
                      if (!inserted) {
                        wrapper.appendChild(cnv);
                      }
                      
                      // Observe the new canvas for further lazy loading
                      observer.observe(cnv);
                    } catch (err) {
                      console.warn(`Failed to lazy load page ${p}:`, err);
                    }
                  });
                }
              });
            }, { rootMargin: '300px' });
            
            // Observe all existing canvases
            wrapper.querySelectorAll('canvas').forEach(canvas => {
              observer.observe(canvas);
            });
          }, 100);
        } else {
          // Small PDF - render all pages normally
          const renderRemainingPages = async () => {
            let renderedCount = 1;
            
            for (let p = 1; p <= totalPages; p++) {
              if (isUnmountedRef.current) return;
              if (p === alreadyRendered) continue;
              
              const existingCanvas = wrapper.querySelector(`canvas[data-page="${p}"]`);
              if (existingCanvas) {
                renderedCount++;
                continue;
              }
              
              try {
                setStatus(`Rendering page ${p} of ${totalPages}...`);
                const page = await pdfDoc.getPage(p);
                const viewport = page.getViewport({ scale });
                const cnv = createCanvas(viewport.width, viewport.height);
                (cnv as any)._pdfViewport = viewport;
                (cnv as any)._pageNumber = p;
                cnv.setAttribute('data-page', p.toString());
                
                const ctx = cnv.getContext("2d");
                if (ctx) {
                  await page.render({ canvasContext: ctx, viewport }).promise;
                }

                if (!activeHighlight && highlightText && p === targetPage) {
                  buildHighlightFromText(page, viewport as any, highlightText, p)
                    .then((derived) => {
                      if (derived) {
                        scrollAndOverlay(derived);
                      }
                    })
                    .catch((err) => {
                      console.warn("Failed to build highlight from text:", err);
                    });
                }
                
                wrapper.appendChild(cnv);
                renderedCount++;
                setProgress({ current: renderedCount, total: totalPages });
                
                if (p % 3 === 0) {
                  await new Promise(resolve => setTimeout(resolve, 0));
                }
              } catch (pageError) {
                console.warn(`Failed to render page ${p}:`, pageError);
              }
            }
            
            setStatus(`All ${totalPages} pages loaded`);
            setTimeout(() => setStatus(""), 2000);
          };
          
          setTimeout(() => {
            renderRemainingPages().catch(err => {
              console.error('Error rendering remaining pages:', err);
              setStatus(`Error loading some pages: ${err instanceof Error ? err.message : 'Unknown error'}`);
            });
          }, 100);
        }
      } catch (err) {
        console.error("PdfViewer renderAllPages error:", err);
        setError(err instanceof Error ? err.message : String(err));
        setLoading(false);
      }
    };

    // Scroll and overlay
    const scrollAndOverlay = (highlight: HighlightBox) => {
      if (!canvasWrapperRef.current || !highlight) return;

      const pageNum = highlight.pageNumber || pageNumber || 1;
      const wrapper = canvasWrapperRef.current;
      const canvases = wrapper.querySelectorAll<HTMLCanvasElement>("canvas");
      const idx = Math.max(0, Math.min(canvases.length - 1, pageNum - 1));
      const targetCanvas = canvases[idx];
      if (!targetCanvas) return;

      const viewport = (targetCanvas as any)._pdfViewport;
      createOverlayOnCanvas(targetCanvas, highlight, viewport);

      const scaleX = viewport.width / (highlight.pageWidth || viewport.width);
      const scaleY = viewport.height / (highlight.pageHeight || viewport.height);
      const yOnCanvas = (highlight.y || 0) * scaleY;
      const hhOnCanvas = (highlight.height || 0) * scaleY;
      const rectCenterOnCanvas = yOnCanvas + hhOnCanvas / 2;
      const canvasTop = targetCanvas.offsetTop;
      const visibleCenter = wrapper.clientHeight / 2;
      const targetScroll = Math.max(0, Math.floor(canvasTop + rectCenterOnCanvas - visibleCenter));
      wrapper.scrollTo({ top: targetScroll, behavior: "smooth" });

      currentOverlayInfoRef.current = { pageIndex: idx, highlight };
    };

    // Scroll to highlight (public method)
    const scrollToHighlight = (highlight: HighlightBox) => {
      const wrapper = canvasWrapperRef.current;
      if (!wrapper) {
        renderAllPages(highlight);
        return;
      }

      const canvases = wrapper.querySelectorAll<HTMLCanvasElement>("canvas");
      if (
        !canvases ||
        canvases.length === 0 ||
        (highlight.pageNumber && highlight.pageNumber > canvases.length)
      ) {
        renderAllPages(highlight);
        return;
      }

      removeCurrentOverlay();
      scrollAndOverlay(highlight);
    };

    // Expose scrollToHighlight method
    useImperativeHandle(ref, () => ({
      scrollToHighlight,
    }));

    // Load PDF on mount
    useEffect(() => {
      isUnmountedRef.current = false;
      renderAllPages(highlight || null);

      return () => {
        isUnmountedRef.current = true;
        removeCurrentOverlay();
      };
    }, [filePath, fileBuffer, scale]);

    // Handle highlight changes
    useEffect(() => {
      if (highlight) {
        const wrapper = canvasWrapperRef.current;
        if (!wrapper || wrapper.querySelectorAll("canvas").length === 0) {
          renderAllPages(highlight);
        } else {
          scrollToHighlight(highlight);
        }
      }
    }, [highlight]);

    if (error) {
      return (
        <div className="h-full flex items-center justify-center p-8 bg-[#f7f9fb]">
          <div className="text-center">
            <div className="text-destructive text-lg font-medium mb-2">Failed to load PDF</div>
            <div className="text-sm text-muted-foreground">{error}</div>
          </div>
        </div>
      );
    }

    return (
      <div className="h-full flex flex-col bg-[#f7f9fb] p-2 box-border relative">
        {loading && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-8 bg-[#f7f9fb]/90">
            <div className="text-center space-y-4 max-w-md">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto"></div>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground mb-1">{status}</p>
                {progress.total > 0 ? (
                  <div className="space-y-2">
                    <div className="w-64 bg-muted rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-primary h-full transition-all duration-300"
                        style={{ width: `${(progress.current / progress.total) * 100}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {progress.current} of {progress.total} pages
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="w-64 bg-muted rounded-full h-2 overflow-hidden">
                      <div className="bg-primary h-full animate-pulse" style={{ width: "40%" }} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      This may take a moment for large PDFs...
                    </p>
                  </div>
                )}
              </div>
              {status.includes("Parsing") && (
                <p className="text-xs text-muted-foreground mt-4 max-w-xs">
                  If this takes more than 30 seconds, the PDF may be corrupted or too complex.
                </p>
              )}
            </div>
          </div>
        )}
        {status && !loading && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 bg-background/95 border border-border rounded-lg px-3 py-1.5 shadow-sm pointer-events-none">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
              <p className="text-xs text-muted-foreground">{status}</p>
              {progress.total > 0 && progress.current < progress.total && (
                <span className="text-xs text-muted-foreground">
                  ({progress.current}/{progress.total})
                </span>
              )}
            </div>
          </div>
        )}
        <div
          ref={canvasWrapperRef}
          className="flex-1 overflow-y-auto overflow-x-hidden pr-2 box-border min-h-0"
        />
      </div>
    );
  }
);

PdfViewer.displayName = "PdfViewer";

export default PdfViewer;

