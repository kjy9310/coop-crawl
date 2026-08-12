import { useState, useEffect } from 'react';

export function useWasmEngine() {
  const [isWasmLoaded, setIsWasmLoaded] = useState(false);

  useEffect(() => {
    const loadWasm = async () => {
      try {
        if (!window.Go) {
          const script = document.createElement('script');
          script.src = '/wasm/wasm_exec.js';
          await new Promise((resolve, reject) => {
            script.onload = resolve;
            script.onerror = reject;
            document.body.appendChild(script);
          });
        }

        const go = new window.Go();
        go.importObject.env['syscall/js.finalizeRef'] = () => {};

        const res = await fetch(`/wasm/engine.wasm?t=${Date.now()}`);
        const buffer = await res.arrayBuffer();
        const module = await WebAssembly.instantiate(buffer, go.importObject);
        go.run(module.instance);
        setIsWasmLoaded(true);
      } catch (err) {
        console.error('Wasm Loading Error:', err);
      }
    };

    loadWasm();
  }, []);

  return { isWasmLoaded };
}
