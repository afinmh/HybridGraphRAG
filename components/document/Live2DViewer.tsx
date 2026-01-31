"use client";

import { useEffect, useRef, useState } from "react";

declare global {
    interface Window {
        PIXI: any;
        Live2DModel: any;
        Live2DCubismCore: any;
        Live2D: any;
    }
}

export default function Live2DViewer({ modelPath }: { modelPath: string }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        let pixiApp: any = null;
        let model: any = null;

        const loadScripts = async () => {
            try {
                if (window.PIXI && window.Live2DModel) {
                    initPixi();
                    return;
                }

                // 1. Load Live2D Cubism Core (Cubism 4)
                if (!window.Live2DCubismCore) {
                    try {
                        await loadScript("/dokumen/live2dcubismcore.min.js");
                        console.log("Loaded local live2dcubismcore");
                    } catch (e) {
                        console.warn("Local Cubism Core failed, trying CDN...");
                        await loadScript("https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js");
                    }
                }

                // 2. Load Legacy Live2D (Cubism 2)
                if (!window.Live2D) {
                    try {
                        await loadScript("/dokumen/live2d.min.js");
                        console.log("Loaded local live2d.min.js");
                    } catch (e) {
                        console.warn("Local Live2D Legacy failed.");
                        // No CDN fallback for legacy usually, or it's rare.
                    }
                }

                // 3. Load Pixi
                if (!window.PIXI) {
                    try {
                        await loadScript("https://cdnjs.cloudflare.com/ajax/libs/pixi.js/7.3.3/pixi.min.js");
                    } catch (e) {
                        console.warn("CDN Pixi failed, trying Unpkg...");
                        await loadScript("https://unpkg.com/pixi.js@7.3.3/dist/pixi.min.js");
                    }
                }

                // 4. Load Pixi Live2D Display
                if (!window.Live2DModel) {
                    try {
                        await loadScript("https://cdn.jsdelivr.net/gh/datsign/pixi-live2d-display/dist/index.min.js");
                    } catch (e) {
                        console.warn("CDN Plugin failed, trying Unpkg...");
                        await loadScript("https://unpkg.com/pixi-live2d-display/dist/index.min.js");
                    }
                }

                initPixi();

            } catch (err) {
                console.error("Critical: Failed to load Live2D environment", err);
                setError(`Failed to load Live2D engine: ${err}`);
            }
        };

        const loadScript = (src: string) => {
            return new Promise((resolve, reject) => {
                const script = document.createElement("script");
                script.src = src;
                script.crossOrigin = "anonymous";
                script.onload = resolve;
                script.onerror = () => reject(new Error(`Failed to load ${src}`));
                document.body.appendChild(script);
            });
        };

        const initPixi = async () => {
            // Wait a frame for layout stability logic (client-side nav fix)
            await new Promise(r => setTimeout(r, 100));

            // Check refs again inside async
            if (!canvasRef.current || !window.PIXI || !window.PIXI.live2d) return;

            const PIXI = window.PIXI;
            window.Live2DModel = PIXI.live2d.Live2DModel;

            // Clear cache to prevent stale context issues
            PIXI.utils.clearTextureCache();

            // Ensure parent has dimensions to avoid Pixi shader errors
            const parent = canvasRef.current?.parentElement;
            if (!parent || parent.clientWidth === 0 || parent.clientHeight === 0) {
                // Wait for layout
                setTimeout(initPixi, 50);
                return;
            }

            // Destroy previous app if exists (just in case)
            if (pixiApp) {
                pixiApp.destroy(true, { children: true, texture: true, baseTexture: true });
            }

            pixiApp = new PIXI.Application({
                view: canvasRef.current,
                autoStart: true,
                backgroundAlpha: 0,
                resizeTo: parent, // Safe now
            });

            try {
                model = await PIXI.live2d.Live2DModel.from(modelPath);

                // Critical check: Ensure app wasn't destroyed while loading
                if (!pixiApp || !pixiApp.stage || !pixiApp.renderer) return;

                pixiApp.stage.addChild(model);

                // Transform/Scale
                // Zoom in for upper body shot (Visual Novel style)
                const h = pixiApp.view.height;
                const w = pixiApp.view.width;

                let scale = 1;
                if (model.height > 0) {
                    // Target: Model head/shoulders visible.
                    // Zoom in more as requested (2.5x)
                    scale = (h / model.height) * 2.5;
                }

                model.scale.set(scale);

                // Center X
                model.x = (w - model.width) / 2;

                // Align Y: even higher (negative to pull up)
                model.y = h * -0.1;

                setLoaded(true);
            } catch (e) {
                if (!pixiApp) return; // If destroyed, ignore error
                console.error("Failed to load model:", e);
                setError("Failed to load model.");
            }
        };

        loadScripts();

        return () => {
            if (pixiApp) {
                pixiApp.destroy(true, { children: true, texture: true, baseTexture: true });
                pixiApp = null;
            }
        };
    }, [modelPath]);

    return (
        <div className="w-full h-full relative flex items-end justify-center">
            {!loaded && !error && <div className="text-white/50 text-xs absolute bottom-10 animate-pulse">Loading Live2D...</div>}
            {error && <div className="text-red-400 text-xs absolute bottom-10">{error}</div>}
            <canvas ref={canvasRef} className="w-full h-full" />
        </div>
    );
}
