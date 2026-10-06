import { useEffect } from "react";
import { posterState } from "../poster/poster.js";

/* ==========================================================================
   Slice B1 - the BBQ Ride poster kit is the default for the BBQ Bike (UI only)
   --------------------------------------------------------------------------
   When the BBQ Bike becomes the loaded product the Poster's active kit is set
   to "bbq-ride" (the kit that carries its brand), every time it becomes the
   loaded product. The owner's own choice still wins: when the kit is changed
   by any route other than this hook (the Poster sheet's kit chips) WHILE the
   BBQ Bike is loaded, that choice is latched for the rest of the page session
   and this hook never changes the kit again. A kit picked while another
   product was loaded (e.g. THE KOP's kit on THE KOP MAIN) is not a choice about
   the BBQ Bike, so it does not stop the default. Other products are not
   touched at all. poster/poster.js (state and drawing) is unchanged: this only
   calls its public setKitId, whose result is the same persisted active kit the
   chips write.
   ========================================================================== */

export const BBQ_PRODUCT_ID = "bbq-bike";
export const BBQ_KIT_ID = "bbq-ride";

let applying = false; // true only while this hook is the one changing the kit
let userChose = false; // the kit was changed by the user (the sheet's chips) this session
let lastKit = null;
let watching = false;
let loaded = null; // the product id the shell currently shows

function watch() {
  if (watching) return;
  watching = true;
  lastKit = posterState.getSnapshot().kitId;
  posterState.subscribe(() => {
    const k = posterState.getSnapshot().kitId;
    if (k !== lastKit && !applying && loaded === BBQ_PRODUCT_ID) userChose = true;
    lastKit = k;
  });
}

export default function usePosterKitDefault(productId) {
  useEffect(() => {
    watch();
    loaded = productId;
    if (productId !== BBQ_PRODUCT_ID || userChose) return;
    if (posterState.getSnapshot().kitId === BBQ_KIT_ID) return;
    applying = true;
    try {
      posterState.setKitId(BBQ_KIT_ID);
    } finally {
      applying = false;
    }
  }, [productId]);
}
